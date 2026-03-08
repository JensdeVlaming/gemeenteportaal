package services

import "testing"

func TestToISOParsesPocketBaseDateTime(t *testing.T) {
	got := toISO("2026-03-08 10:00:00.000Z")
	want := "2026-03-08T10:00:00Z"

	if got != want {
		t.Fatalf("toISO() = %q, want %q", got, want)
	}
}

func TestToISOInterpretsNaiveAsEuropeAmsterdamWinter(t *testing.T) {
	got := toISO("2026-01-15 10:00")
	want := "2026-01-15T09:00:00Z"

	if got != want {
		t.Fatalf("toISO() = %q, want %q", got, want)
	}
}

func TestToISOInterpretsNaiveAsEuropeAmsterdamSummer(t *testing.T) {
	got := toISO("2026-07-15 10:00")
	want := "2026-07-15T08:00:00Z"

	if got != want {
		t.Fatalf("toISO() = %q, want %q", got, want)
	}
}

func TestToPocketBaseDateFilterValueFormatsRFC3339(t *testing.T) {
	got := toPocketBaseDateFilterValue("2026-03-08T09:00:00Z")
	want := "2026-03-08 09:00:00.000Z"

	if got != want {
		t.Fatalf("toPocketBaseDateFilterValue() = %q, want %q", got, want)
	}
}

func TestToPocketBaseDateFilterValueKeepsUnknownInput(t *testing.T) {
	got := toPocketBaseDateFilterValue("not-a-date")
	want := "not-a-date"

	if got != want {
		t.Fatalf("toPocketBaseDateFilterValue() = %q, want %q", got, want)
	}
}
