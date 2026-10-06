// Package ical writes yearly all-day events as an iCalendar (RFC 5545)
// feed that calendar apps can subscribe to.
package ical

import (
	"fmt"
	"io"
	"strings"
	"time"
	"unicode/utf8"
)

// Event recurs every year on Month/Day, starting in Year.
type Event struct {
	UID         string
	Summary     string
	Description string
	Year        int
	Month, Day  int
}

// Calendar is a named feed.
type Calendar struct {
	Name   string
	Events []Event
}

// Write renders the calendar. stamp is DTSTAMP, the time the feed was made.
func Write(w io.Writer, c Calendar, stamp time.Time) error {
	b := &builder{}
	b.line("BEGIN:VCALENDAR")
	b.line("VERSION:2.0")
	b.line("PRODID:-//GoTree//Family calendar//EN")
	b.line("CALSCALE:GREGORIAN")
	b.line("METHOD:PUBLISH")
	b.line("X-WR-CALNAME:" + escape(c.Name))
	// Asks clients to refresh daily; most poll on their own schedule anyway.
	b.line("REFRESH-INTERVAL;VALUE=DURATION:P1D")
	b.line("X-PUBLISHED-TTL:P1D")
	ts := stamp.UTC().Format("20060102T150405Z")
	for _, e := range c.Events {
		b.line("BEGIN:VEVENT")
		b.line("UID:" + escape(e.UID))
		b.line("DTSTAMP:" + ts)
		start := time.Date(e.Year, time.Month(e.Month), e.Day, 0, 0, 0, 0, time.UTC)
		b.line("DTSTART;VALUE=DATE:" + start.Format("20060102"))
		b.line("DTEND;VALUE=DATE:" + start.AddDate(0, 0, 1).Format("20060102"))
		if e.Month == 2 && e.Day == 29 {
			// A yearly rule on 29 February only fires in leap years; the
			// last day of February marks the day every year.
			b.line("RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1")
		} else {
			b.line("RRULE:FREQ=YEARLY")
		}
		b.line("SUMMARY:" + escape(e.Summary))
		if e.Description != "" {
			b.line("DESCRIPTION:" + escape(e.Description))
		}
		b.line("TRANSP:TRANSPARENT")
		b.line("END:VEVENT")
	}
	b.line("END:VCALENDAR")
	_, err := io.WriteString(w, b.String())
	return err
}

func escape(s string) string {
	return strings.NewReplacer(`\`, `\\`, ";", `\;`, ",", `\,`, "\r\n", `\n`, "\n", `\n`).Replace(s)
}

type builder struct{ strings.Builder }

// line writes a content line folded at 75 octets, as RFC 5545 requires,
// without splitting a UTF-8 character.
func (b *builder) line(s string) {
	limit := 75
	for len(s) > limit {
		cut := limit
		for cut > 0 && !utf8.RuneStart(s[cut]) {
			cut--
		}
		fmt.Fprintf(b, "%s\r\n ", s[:cut])
		s = s[cut:]
		// Continuation lines start with a space, which counts.
		limit = 74
	}
	b.WriteString(s + "\r\n")
}
