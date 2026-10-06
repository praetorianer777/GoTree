package match

import "testing"

func TestPhonetic(t *testing.T) {
	for in, want := range map[string]string{
		"Müller-Lüdenscheidt": "65752682",
		"Meyer":               "67",
		"Maier":               "67",
		"Mayr":                "67",
		"Schmidt":             "862",
		"Schmitt":             "862",
		"Wikipedia":           "3412",
		"Christoph":           "47823",
		"Xaver":               "4837",
	} {
		if got := Phonetic(Normalize(in)); got != want {
			t.Errorf("%s: %s, want %s", in, got, want)
		}
	}
}

func TestScore(t *testing.T) {
	q := Query{Given: "Johann Georg", Surname: "Meyer", Sex: "M", BirthYear: 1850, RecordYear: 1880}
	tests := []struct {
		name string
		c    Candidate
		min  float64
		max  float64
	}{
		{"same", Candidate{Given: "Johann Georg", Surname: "Meyer", Sex: "M", BirthYear: 1850}, 0.95, 1},
		{"spelling variant", Candidate{Given: "Johann Georg", Surname: "Maier", Sex: "M", BirthYear: 1851}, 0.85, 1},
		{"called by second name", Candidate{Given: "Georg", Surname: "Mayr", Sex: "M", BirthYear: 1849}, 0.6, 0.95},
		{"umlaut and accent", Candidate{Given: "Jóhann", Surname: "Meyer", BirthYear: 1850}, 0.7, 1},
		{"other sex", Candidate{Given: "Johann Georg", Surname: "Meyer", Sex: "F", BirthYear: 1850}, 0, 0.35},
		{"dead before the record", Candidate{Given: "Johann Georg", Surname: "Meyer", Sex: "M", BirthYear: 1850, DeathYear: 1870}, 0, 0.25},
		{"born after the record", Candidate{Given: "Johann Georg", Surname: "Meyer", Sex: "M", BirthYear: 1890}, 0, 0.2},
		{"other family", Candidate{Given: "Anna", Surname: "Schulz", Sex: "M", BirthYear: 1850}, 0, 0.45},
	}
	for _, tt := range tests {
		got := Score(q, tt.c)
		if got < tt.min || got > tt.max {
			t.Errorf("%s: %.2f, want %.2f–%.2f", tt.name, got, tt.min, tt.max)
		}
	}
}
