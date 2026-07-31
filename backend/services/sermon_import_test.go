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

func TestNormalizeRowPreservesMissingDutyElder(t *testing.T) {
	normalized := normalizeRow(ImportRow{})
	if normalized.DutyElder != nil {
		t.Fatalf("missing duty elder should remain nil, got %q", *normalized.DutyElder)
	}
}

func TestNormalizeRowPreservesExplicitEmptyDutyElder(t *testing.T) {
	value := "  "
	normalized := normalizeRow(ImportRow{DutyElder: &value})
	if normalized.DutyElder == nil || *normalized.DutyElder != "" {
		t.Fatalf("explicit empty duty elder should remain an empty pointer: %#v", normalized.DutyElder)
	}
}

func TestDutyElderChangeDetectionHonorsTriState(t *testing.T) {
	existing := ExistingSermonInfo{
		EventTitle: "Dienst",
		StartTime:  "2026-08-02T08:00:00Z",
		EndTime:    "2026-08-02T09:00:00Z",
		Speaker:    "ds. Voorbeeld",
		DutyElder:  "D. de Lang",
	}
	base := ImportResultRow{
		EventTitle:     existing.EventTitle,
		EventStartTime: existing.StartTime,
		EventEndTime:   existing.EndTime,
		Speaker:        existing.Speaker,
		Collections:    []ImportCollection{},
	}

	if hasChanges(base, existing) {
		t.Fatal("a missing duty elder field should preserve the existing value")
	}

	empty := ""
	base.DutyElder = &empty
	if !hasChanges(base, existing) {
		t.Fatal("an explicitly empty duty elder should be detected as a clear operation")
	}
	diff := getDutyElderDiff(base, existing)
	if diff == nil || diff.Before == nil || *diff.Before != "D. de Lang" || diff.After != nil {
		t.Fatalf("unexpected duty elder diff: %#v", diff)
	}
}
