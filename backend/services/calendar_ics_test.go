package services

import (
	"strings"
	"testing"
	"time"
)

func TestEscapeICalText(t *testing.T) {
	input := "regel 1\\regel 2;lijst,met\nnieuwe regel"
	got := escapeICalText(input)
	want := "regel 1\\\\regel 2\\;lijst\\,met\\nnieuwe regel"
	if got != want {
		t.Fatalf("unexpected escaped value\nwant: %q\ngot:  %q", want, got)
	}
}

func TestFoldICalLine(t *testing.T) {
	line := "DESCRIPTION:" + strings.Repeat("a", 120)
	folded := foldICalLine(line)

	if len(folded) < 2 {
		t.Fatalf("expected folded output with continuation line, got %d lines", len(folded))
	}

	for i, part := range folded {
		if len(part) > 75 {
			t.Fatalf("line %d exceeds 75 bytes: %d", i, len(part))
		}
		if i > 0 && !strings.HasPrefix(part, " ") {
			t.Fatalf("line %d should start with a space continuation", i)
		}
	}

	rebuilt := folded[0]
	for _, part := range folded[1:] {
		rebuilt += strings.TrimPrefix(part, " ")
	}

	if rebuilt != line {
		t.Fatalf("rebuilt line does not match input")
	}
}

func TestParseRecordDateTimePocketBaseFormat(t *testing.T) {
	parsed, ok := parseRecordDateTime("2026-01-11 09:00:00.000Z")
	if !ok {
		t.Fatalf("expected parse success for PocketBase format")
	}

	if parsed.UTC().Format(time.RFC3339) != "2026-01-11T09:00:00Z" {
		t.Fatalf("unexpected parsed timestamp: %s", parsed.UTC().Format(time.RFC3339))
	}
}

func TestParseRecordDateTimeInvalid(t *testing.T) {
	_, ok := parseRecordDateTime("geen datum")
	if ok {
		t.Fatalf("expected invalid parse result")
	}
}

func TestAppendDutyEldersAddsPlainAndHTMLLinesAfterSpeaker(t *testing.T) {
	plain, html := appendDutyElders(
		[]string{"Voorganger: ds. Voorbeeld", ""},
		[]string{"<strong>Voorganger:</strong> ds. Voorbeeld", ""},
		[]string{"E. Felix"},
	)

	if got := strings.Join(plain, "\n"); got != "Voorganger: ds. Voorbeeld\nOuderling van dienst: E. Felix\n" {
		t.Fatalf("unexpected plain description: %q", got)
	}
	if got := strings.Join(html, "<br />"); got != "<strong>Voorganger:</strong> ds. Voorbeeld<br /><strong>Ouderling van dienst:</strong> E. Felix<br />" {
		t.Fatalf("unexpected HTML description: %q", got)
	}
}

func TestAppendDutyEldersOmitsEmptyValue(t *testing.T) {
	plain := []string{"Voorganger: ds. Voorbeeld", ""}
	html := []string{"<strong>Voorganger:</strong> ds. Voorbeeld", ""}

	gotPlain, gotHTML := appendDutyElders(plain, html, nil)
	if strings.Join(gotPlain, "\n") != strings.Join(plain, "\n") {
		t.Fatal("plain description should remain unchanged")
	}
	if strings.Join(gotHTML, "<br />") != strings.Join(html, "<br />") {
		t.Fatal("HTML description should remain unchanged")
	}
}
