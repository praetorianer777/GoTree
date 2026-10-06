package ical

import (
	"bytes"
	"strings"
	"testing"
	"time"
)

func TestWrite(t *testing.T) {
	var buf bytes.Buffer
	err := Write(&buf, Calendar{Name: "Weber family", Events: []Event{
		{UID: "gotree-1-2", Summary: "Birthday: Hans Weber, born 1880", Year: 1880, Month: 2, Day: 3},
		{UID: "gotree-1-3", Summary: "Birthday: Leap; Day", Year: 1904, Month: 2, Day: 29},
		{UID: "gotree-1-4", Summary: strings.Repeat("Ä", 60), Year: 1950, Month: 12, Day: 31},
	}}, time.Date(2026, 10, 6, 8, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	out := buf.String()
	for _, want := range []string{
		"BEGIN:VCALENDAR\r\n", "X-WR-CALNAME:Weber family\r\n",
		"DTSTART;VALUE=DATE:18800203\r\n", "DTEND;VALUE=DATE:18800204\r\n", "RRULE:FREQ=YEARLY\r\n",
		"SUMMARY:Birthday: Hans Weber\\, born 1880\r\n", "SUMMARY:Birthday: Leap\\; Day\r\n",
		"RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1\r\n", "DTEND;VALUE=DATE:19510101\r\n",
		"DTSTAMP:20261006T080000Z\r\n", "END:VCALENDAR\r\n",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("missing %q", want)
		}
	}
	for _, line := range strings.Split(out, "\r\n") {
		if len(line) > 75 {
			t.Errorf("line of %d octets", len(line))
		}
	}
	// Unfolding restores the summary.
	unfolded := strings.ReplaceAll(out, "\r\n ", "")
	if !strings.Contains(unfolded, "SUMMARY:"+strings.Repeat("Ä", 60)+"\r\n") {
		t.Error("folding broke the text")
	}
}
