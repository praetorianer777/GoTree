package media

import (
	"bytes"
	"encoding/binary"
	"encoding/xml"
	"io"
	"strconv"
	"strings"
)

// Meta is what GoTree reads from a JPEG: orientation, capture time, GPS
// position and face regions.
type Meta struct {
	// Orientation is the EXIF orientation 1-8; 1 when absent.
	Orientation int
	// TakenAt is DateTimeOriginal as "2006-01-02 15:04:05", or "".
	TakenAt string
	Lat     *float64
	Lng     *float64
	Regions []Region
}

// Region is a face tag in coordinates relative to the displayed image:
// X and Y are the top-left corner, all values 0-1.
type Region struct {
	Name       string
	X, Y, W, H float64
}

// maxHeader bounds how much of a file is scanned for metadata segments,
// which come before the image data.
const maxHeader = 4 << 20

// ReadMeta extracts metadata from a JPEG. Anything malformed is skipped:
// metadata is a convenience, never a reason to reject a photo.
func ReadMeta(r io.Reader) Meta {
	m := Meta{Orientation: 1}
	data, err := io.ReadAll(io.LimitReader(r, maxHeader))
	if err != nil || len(data) < 4 || data[0] != 0xFF || data[1] != 0xD8 {
		return m
	}
	for pos := 2; pos+4 <= len(data); {
		if data[pos] != 0xFF {
			return m
		}
		marker := data[pos+1]
		if marker == 0xD8 || (marker >= 0xD0 && marker <= 0xD7) || marker == 0x01 || marker == 0xFF {
			pos++
			continue
		}
		if marker == 0xDA || marker == 0xD9 {
			return m // start of image data: no more metadata
		}
		size := int(binary.BigEndian.Uint16(data[pos+2:]))
		if size < 2 || pos+2+size > len(data) {
			return m
		}
		seg := data[pos+4 : pos+2+size]
		if marker == 0xE1 {
			switch {
			case bytes.HasPrefix(seg, []byte("Exif\x00\x00")):
				parseTIFF(seg[6:], &m)
			case bytes.HasPrefix(seg, []byte("http://ns.adobe.com/xap/1.0/\x00")):
				m.Regions = parseXMPRegions(seg[len("http://ns.adobe.com/xap/1.0/\x00"):])
			}
		}
		pos += 2 + size
	}
	return m
}

type tiff struct {
	b     []byte
	order binary.ByteOrder
}

func (t tiff) u16(off int) (int, bool) {
	if off < 0 || off+2 > len(t.b) {
		return 0, false
	}
	return int(t.order.Uint16(t.b[off:])), true
}

func (t tiff) u32(off int) (int, bool) {
	if off < 0 || off+4 > len(t.b) {
		return 0, false
	}
	return int(t.order.Uint32(t.b[off:])), true
}

type ifdEntry struct {
	tag, typ, count int
	// valueOff is where the value is: inline in the entry when it fits in
	// four bytes, else at the offset the entry points to.
	valueOff int
}

var typeSize = map[int]int{1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8}

func (t tiff) entries(off int) []ifdEntry {
	n, ok := t.u16(off)
	if !ok || n > 512 {
		return nil
	}
	var out []ifdEntry
	for i := range n {
		e := off + 2 + i*12
		tag, ok1 := t.u16(e)
		typ, ok2 := t.u16(e + 2)
		count, ok3 := t.u32(e + 4)
		if !ok1 || !ok2 || !ok3 {
			break
		}
		size := typeSize[typ] * count
		valueOff := e + 8
		if size > 4 {
			p, ok := t.u32(e + 8)
			if !ok {
				continue
			}
			valueOff = p
		}
		if size == 0 || valueOff+size > len(t.b) || valueOff < 0 {
			continue
		}
		out = append(out, ifdEntry{tag, typ, count, valueOff})
	}
	return out
}

func (t tiff) rational(off int) (float64, bool) {
	num, ok1 := t.u32(off)
	den, ok2 := t.u32(off + 4)
	if !ok1 || !ok2 || den == 0 {
		return 0, false
	}
	return float64(num) / float64(den), true
}

func parseTIFF(b []byte, m *Meta) {
	if len(b) < 8 {
		return
	}
	t := tiff{b: b}
	switch string(b[:2]) {
	case "II":
		t.order = binary.LittleEndian
	case "MM":
		t.order = binary.BigEndian
	default:
		return
	}
	ifd0, ok := t.u32(4)
	if !ok {
		return
	}
	for _, e := range t.entries(ifd0) {
		switch e.tag {
		case 0x0112: // Orientation
			if o, ok := t.u16(e.valueOff); ok && o >= 1 && o <= 8 {
				m.Orientation = o
			}
		case 0x8769: // Exif IFD
			if p, ok := t.u32(e.valueOff); ok {
				for _, x := range t.entries(p) {
					if x.tag == 0x9003 && x.typ == 2 { // DateTimeOriginal
						m.TakenAt = exifTime(b[x.valueOff : x.valueOff+x.count])
					}
				}
			}
		case 0x8825: // GPS IFD
			if p, ok := t.u32(e.valueOff); ok {
				parseGPS(t, p, m)
			}
		}
	}
}

// exifTime turns "2006:01:02 15:04:05\x00" into "2006-01-02 15:04:05".
func exifTime(raw []byte) string {
	s := strings.TrimRight(string(raw), "\x00 ")
	if len(s) != 19 || s[4] != ':' || s[7] != ':' || s[10] != ' ' || strings.HasPrefix(s, "0000") {
		return ""
	}
	return s[:4] + "-" + s[5:7] + "-" + s[8:]
}

func parseGPS(t tiff, off int, m *Meta) {
	var latRef, lngRef byte
	var lat, lng []float64
	for _, e := range t.entries(off) {
		switch e.tag {
		case 1:
			latRef = t.b[e.valueOff]
		case 3:
			lngRef = t.b[e.valueOff]
		case 2, 4:
			if e.typ != 5 || e.count != 3 {
				continue
			}
			var v []float64
			for i := range 3 {
				r, ok := t.rational(e.valueOff + i*8)
				if !ok {
					return
				}
				v = append(v, r)
			}
			if e.tag == 2 {
				lat = v
			} else {
				lng = v
			}
		}
	}
	if lat == nil || lng == nil {
		return
	}
	la := lat[0] + lat[1]/60 + lat[2]/3600
	lo := lng[0] + lng[1]/60 + lng[2]/3600
	if latRef == 'S' {
		la = -la
	}
	if lngRef == 'W' {
		lo = -lo
	}
	if la < -90 || la > 90 || lo < -180 || lo > 180 || (la == 0 && lo == 0) {
		return
	}
	m.Lat, m.Lng = &la, &lo
}

// parseXMPRegions reads Metadata Working Group face regions
// (mwg-rs:RegionList), as written by digiKam, Lightroom, Picasa and
// Immich. Names and areas may be attributes or child elements, so the XML
// is walked token by token rather than decoded into fixed structs.
func parseXMPRegions(b []byte) []Region {
	dec := xml.NewDecoder(bytes.NewReader(b))
	dec.Strict = false
	var regions []Region
	var inList, inArea bool
	var depth, liDepth int
	var cur map[string]string
	var text strings.Builder
	var field string

	for {
		tok, err := dec.Token()
		if err != nil {
			break
		}
		switch el := tok.(type) {
		case xml.StartElement:
			depth++
			name := el.Name.Local
			if name == "RegionList" {
				inList = true
			}
			if !inList {
				continue
			}
			if name == "li" && cur == nil {
				cur = map[string]string{}
				liDepth = depth
			}
			if cur == nil {
				continue
			}
			if name == "Area" {
				inArea = true
			}
			for _, a := range el.Attr {
				key := a.Name.Local
				if inArea || name == "Area" {
					key = "area." + key
				}
				cur[key] = a.Value
			}
			field = name
			if inArea && name != "Area" {
				field = "area." + name
			}
			text.Reset()
		case xml.CharData:
			text.Write(el)
		case xml.EndElement:
			name := el.Name.Local
			if cur != nil && field != "" && strings.TrimSpace(text.String()) != "" {
				if _, set := cur[field]; !set {
					cur[field] = strings.TrimSpace(text.String())
				}
			}
			text.Reset()
			field = ""
			if name == "Area" {
				inArea = false
			}
			if name == "li" && cur != nil && depth == liDepth {
				if r, ok := regionFrom(cur); ok {
					regions = append(regions, r)
				}
				cur = nil
			}
			if name == "RegionList" {
				inList = false
			}
			depth--
		}
	}
	return regions
}

func regionFrom(v map[string]string) (Region, bool) {
	if t := v["Type"]; t != "" && t != "Face" {
		return Region{}, false
	}
	if u := v["area.unit"]; u != "" && u != "normalized" {
		return Region{}, false
	}
	num := func(k string) (float64, bool) {
		f, err := strconv.ParseFloat(strings.TrimSpace(v[k]), 64)
		return f, err == nil && f >= 0 && f <= 1
	}
	cx, ok1 := num("area.x")
	cy, ok2 := num("area.y")
	w, ok3 := num("area.w")
	h, ok4 := num("area.h")
	if !ok1 || !ok2 || !ok3 || !ok4 || w == 0 || h == 0 {
		return Region{}, false
	}
	// MWG areas are centered; GoTree stores the top-left corner.
	r := Region{Name: strings.TrimSpace(v["Name"]), X: clamp01(cx - w/2), Y: clamp01(cy - h/2), W: w, H: h}
	r.W = min(r.W, 1-r.X)
	r.H = min(r.H, 1-r.Y)
	return r, true
}

func clamp01(f float64) float64 {
	return max(0, min(1, f))
}
