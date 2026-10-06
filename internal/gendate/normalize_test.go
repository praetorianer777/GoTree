package gendate

import "testing"

func TestNormalize(t *testing.T) {
	tests := []struct{ in, want string }{
		{"12 MAR 1850", "12 MAR 1850"},
		{"12.3.1850", "12 MAR 1850"},
		{"abt 1850", "ABT 1850"},
		{"ca. 1850", "ABT 1850"},
		{"Circa 1850", "ABT 1850"},
		{"um 1850", "ABT 1850"},
		{"1850?", "ABT 1850"},
		{"bef. 1900", "BEF 1900"},
		{"vor 1900", "BEF 1900"},
		{"nach 3. Mai 1901", "AFT 3 MAY 1901"},
		{"March 12, 1850", "12 MAR 1850"},
		{"12th March 1850", "12 MAR 1850"},
		{"12. März 1850", "12 MAR 1850"},
		{"Sept 1850", "SEP 1850"},
		{"Dezember 1920", "DEC 1920"},
		{"1850-1860", "BET 1850 AND 1860"},
		{"1850 – 1860", "BET 1850 AND 1860"},
		{"between Jan 1850 and Feb 1851", "BET JAN 1850 AND FEB 1851"},
		{"zwischen 1850 und 1860", "BET 1850 AND 1860"},
		{"von 1914 bis 1918", "FROM 1914 TO 1918"},
		{"est. 1700", "EST 1700"},
	}
	for _, tt := range tests {
		d, err := Normalize(tt.in)
		if err != nil {
			t.Errorf("%q: %v", tt.in, err)
			continue
		}
		if got := d.String(); got != tt.want {
			t.Errorf("%q: got %q, want %q", tt.in, got, tt.want)
		}
	}

	for _, bad := range []string{"", "sometime", "(12 Dezember 1920)x", "32.13.1850", "1860-1850"} {
		if d, err := Normalize(bad); err == nil {
			t.Errorf("%q: accepted as %q", bad, d.String())
		}
	}
}
