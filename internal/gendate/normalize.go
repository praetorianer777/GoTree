package gendate

import (
	"regexp"
	"strings"
)

// keywordAliases maps the words people type for qualifiers, in English
// and German, to GEDCOM keywords.
var keywordAliases = map[string]string{
	"abt": "ABT", "about": "ABT", "ca": "ABT", "circa": "ABT", "c": "ABT", "approx": "ABT", "um": "ABT", "etwa": "ABT", "gegen": "ABT",
	"cal": "CAL", "calculated": "CAL", "errechnet": "CAL",
	"est": "EST", "estimated": "EST", "geschätzt": "EST",
	"bef": "BEF", "before": "BEF", "vor": "BEF",
	"aft": "AFT", "after": "AFT", "nach": "AFT",
	"bet": "BET", "between": "BET", "zwischen": "BET",
	"and": "AND", "und": "AND",
	"from": "FROM", "von": "FROM", "seit": "FROM",
	"to": "TO", "bis": "TO",
}

var monthAliases = map[string]string{
	"january": "JAN", "januar": "JAN", "jänner": "JAN", "jan": "JAN",
	"february": "FEB", "februar": "FEB", "feb": "FEB",
	"march": "MAR", "märz": "MAR", "maerz": "MAR", "mrz": "MAR", "mar": "MAR", "mär": "MAR",
	"april": "APR", "apr": "APR",
	"may": "MAY", "mai": "MAY",
	"june": "JUN", "juni": "JUN", "jun": "JUN",
	"july": "JUL", "juli": "JUL", "jul": "JUL",
	"august": "AUG", "aug": "AUG",
	"september": "SEP", "sept": "SEP", "sep": "SEP",
	"october": "OCT", "oktober": "OCT", "oct": "OCT", "okt": "OCT",
	"november": "NOV", "nov": "NOV",
	"december": "DEC", "dezember": "DEC", "dec": "DEC", "dez": "DEC",
}

var (
	yearRange = regexp.MustCompile(`^(\d{3,4})\s*[-–]\s*(\d{3,4})$`)
	ordinal   = regexp.MustCompile(`^(\d{1,2})(st|nd|rd|th)$`)
)

// Normalize reads dates the way people write them when no program forces
// GEDCOM syntax: "ca. 1850", "March 12, 1850", "12. März 1850",
// "1850-1860", "vor 1900", "1850?". It returns what Parse returns for
// anything Parse already accepts.
func Normalize(s string) (Date, error) {
	if d, err := Parse(s); err == nil {
		return d, nil
	}
	rewritten, ok := rewriteLoose(s)
	if !ok {
		return Parse(s)
	}
	return Parse(rewritten)
}

func rewriteLoose(s string) (string, bool) {
	s = strings.TrimSpace(strings.ToLower(s))
	if strings.HasPrefix(s, "(") {
		return "", false
	}
	if m := yearRange.FindStringSubmatch(s); m != nil {
		return "BET " + m[1] + " AND " + m[2], true
	}
	uncertain := strings.HasSuffix(s, "?")
	s = strings.TrimSuffix(s, "?")
	s = strings.NewReplacer(",", " ", " - ", " TO ", "–", " TO ").Replace(s)

	var out []string
	for _, tok := range strings.Fields(s) {
		// "12." and "ca." lose their dot, but "12.3.1850" keeps it for Parse.
		if strings.Count(tok, ".") == 1 && strings.HasSuffix(tok, ".") {
			tok = strings.TrimSuffix(tok, ".")
		}
		switch {
		case keywordAliases[tok] != "":
			tok = keywordAliases[tok]
		case monthAliases[tok] != "":
			tok = monthAliases[tok]
		case ordinal.MatchString(tok):
			tok = ordinal.FindStringSubmatch(tok)[1]
		}
		out = append(out, tok)
	}
	if len(out) == 0 {
		return "", false
	}
	out = monthFirstToDayFirst(out)
	if uncertain && !isQualifier(out[0]) {
		out = append([]string{"ABT"}, out...)
	}
	return strings.Join(out, " "), true
}

// monthFirstToDayFirst turns the English "MAR 12 1850" into "12 MAR 1850"
// wherever it occurs, e.g. on both sides of BET … AND.
func monthFirstToDayFirst(toks []string) []string {
	for i := 0; i+2 < len(toks); i++ {
		if monthNumber(toks[i]) != 0 && len(toks[i+1]) <= 2 && isDigits(toks[i+1]) && isDigits(toks[i+2]) {
			toks[i], toks[i+1] = toks[i+1], toks[i]
		}
	}
	return toks
}

func isQualifier(tok string) bool {
	switch tok {
	case "ABT", "CAL", "EST", "BEF", "AFT", "BET", "FROM", "TO", "INT":
		return true
	}
	return false
}

func isDigits(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
