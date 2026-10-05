package media

import (
	"bytes"
	"net/http"
	"path/filepath"
	"strings"
)

// Kind groups media types for the UI.
type Kind string

// Kinds of media.
const (
	KindImage    Kind = "image"
	KindDocument Kind = "document"
	KindAudio    Kind = "audio"
	KindVideo    Kind = "video"
)

// allowed lists the accepted types. Anything that a browser could run as
// a page (HTML, SVG, XML) is deliberately absent.
var allowed = map[string]Kind{
	"image/jpeg":      KindImage,
	"image/png":       KindImage,
	"image/gif":       KindImage,
	"image/webp":      KindImage,
	"application/pdf": KindDocument,
	"audio/mpeg":      KindAudio,
	"audio/mp4":       KindAudio,
	"audio/ogg":       KindAudio,
	"audio/wav":       KindAudio,
	"audio/webm":      KindAudio,
	"video/mp4":       KindVideo,
	"video/webm":      KindVideo,
}

// Detect identifies a file from its first bytes, using the file name only
// to tell apart containers the content cannot (MP4 audio vs. video, WebM
// audio vs. video). ok is false for types that are not accepted.
func Detect(head []byte, name string) (mime string, kind Kind, ok bool) {
	ext := strings.ToLower(filepath.Ext(name))
	switch {
	case len(head) >= 12 && bytes.Equal(head[4:8], []byte("ftyp")):
		// ISO base media: M4A is audio, anything else (mp4, mov) video.
		if ext == ".m4a" || bytes.HasPrefix(head[8:], []byte("M4A")) {
			mime = "audio/mp4"
		} else {
			mime = "video/mp4"
		}
	case bytes.HasPrefix(head, []byte{0x1A, 0x45, 0xDF, 0xA3}):
		if ext == ".weba" {
			mime = "audio/webm"
		} else {
			mime = "video/webm"
		}
	case bytes.HasPrefix(head, []byte("RIFF")) && len(head) >= 12 && bytes.Equal(head[8:12], []byte("WAVE")):
		mime = "audio/wav"
	case bytes.HasPrefix(head, []byte("ID3")) || (len(head) >= 2 && head[0] == 0xFF && head[1]&0xE0 == 0xE0):
		mime = "audio/mpeg"
	default:
		mime, _, _ = strings.Cut(http.DetectContentType(head), ";")
		if mime == "application/ogg" {
			mime = "audio/ogg"
		}
	}
	kind, ok = allowed[mime]
	return mime, kind, ok
}
