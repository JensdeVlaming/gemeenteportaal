package services

import (
	"strings"
	"testing"
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
