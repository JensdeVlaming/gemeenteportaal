package services

import (
	"testing"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func stringPointer(value string) *string {
	return &value
}

func newDutyElderTestApp(t *testing.T) *pocketbase.PocketBase {
	t.Helper()

	app := pocketbase.NewWithConfig(pocketbase.Config{
		DefaultDataDir: t.TempDir(),
	})
	if err := app.Bootstrap(); err != nil {
		t.Fatalf("bootstrap test app: %v", err)
	}
	t.Cleanup(func() { app.ResetBootstrapState() })

	events := core.NewBaseCollection("events")
	events.Fields.Add(
		&core.TextField{Name: "title", Required: true},
		&core.DateField{Name: "startTime", Required: true},
		&core.DateField{Name: "endTime", Required: true},
	)
	if err := app.Save(events); err != nil {
		t.Fatalf("save events collection: %v", err)
	}

	sermons := core.NewBaseCollection("sermons")
	sermons.Fields.Add(
		&core.RelationField{Name: "event", CollectionId: events.Id, MaxSelect: 1, Required: true},
		&core.TextField{Name: "speaker", Required: true},
		&core.TextField{Name: "dutyElder"},
	)
	if err := app.Save(sermons); err != nil {
		t.Fatalf("save sermons collection: %v", err)
	}

	return app
}

func seedDutyElderService(t *testing.T, app core.App, start, elder string) (string, string) {
	t.Helper()

	events, err := app.FindCollectionByNameOrId("events")
	if err != nil {
		t.Fatalf("find events collection: %v", err)
	}
	event := core.NewRecord(events)
	event.Set("title", "Zondagsdienst")
	event.Set("startTime", start)
	event.Set("endTime", "2026-08-02 09:00:00.000Z")
	if err := app.Save(event); err != nil {
		t.Fatalf("save event: %v", err)
	}

	sermons, err := app.FindCollectionByNameOrId("sermons")
	if err != nil {
		t.Fatalf("find sermons collection: %v", err)
	}
	sermon := core.NewRecord(sermons)
	sermon.Set("event", event.Id)
	sermon.Set("speaker", "ds. Voorbeeld")
	sermon.Set("dutyElder", elder)
	if err := app.Save(sermon); err != nil {
		t.Fatalf("save sermon: %v", err)
	}

	return event.Id, sermon.Id
}

func TestDutyElderImportMatchesAmsterdamTimeAndOnlyUpdatesElder(t *testing.T) {
	app := newDutyElderTestApp(t)
	eventID, sermonID := seedDutyElderService(t, app, "2026-08-02 08:00:00.000Z", "")

	rows := []ImportRow{{
		ImportMode:     stringPointer("duty_elder"),
		EventStartTime: stringPointer("2026-08-02T10:00:00+02:00"),
		DutyElder:      stringPointer("D. de Lang"),
	}}
	checked, err := CheckSermonRows(app, rows)
	if err != nil {
		t.Fatalf("check duty elder rows: %v", err)
	}
	if len(checked) != 1 || checked[0].Status != ImportStatusBestaand {
		t.Fatalf("unexpected check result: %#v", checked)
	}

	imported, err := ImportSermonRows(app, rows)
	if err != nil {
		t.Fatalf("import duty elder rows: %v", err)
	}
	if imported[0].Status != ImportStatusHergebruikt {
		t.Fatalf("unexpected import status: %s", imported[0].Status)
	}

	event, err := app.FindRecordById("events", eventID)
	if err != nil {
		t.Fatalf("reload event: %v", err)
	}
	if event.GetString("title") != "Zondagsdienst" || event.GetString("startTime") != "2026-08-02 08:00:00.000Z" {
		t.Fatalf("event data changed unexpectedly: %#v", event)
	}

	sermon, err := app.FindRecordById("sermons", sermonID)
	if err != nil {
		t.Fatalf("reload sermon: %v", err)
	}
	if sermon.GetString("speaker") != "ds. Voorbeeld" {
		t.Fatalf("speaker changed unexpectedly: %q", sermon.GetString("speaker"))
	}
	if sermon.GetString("dutyElder") != "D. de Lang" {
		t.Fatalf("duty elder was not updated: %q", sermon.GetString("dutyElder"))
	}
}

func TestSermonImportRejectsMixedImportModes(t *testing.T) {
	rows := []ImportRow{
		{ImportMode: stringPointer("duty_elder")},
		{},
	}
	if _, err := isDutyElderOnlyImport(rows); err == nil {
		t.Fatal("expected mixed import modes to be rejected")
	}
}

func TestDutyElderImportDoesNotPartiallyWriteInvalidBatch(t *testing.T) {
	app := newDutyElderTestApp(t)
	_, sermonID := seedDutyElderService(t, app, "2026-08-02 08:00:00.000Z", "Oude naam")

	rows := []DutyElderImportRow{
		{EventStartTime: stringPointer("2026-08-02T10:00:00+02:00"), DutyElder: stringPointer("Nieuwe naam")},
		{EventStartTime: stringPointer("2026-08-09T10:00:00+02:00"), DutyElder: stringPointer("I. Prins")},
	}
	results, err := ImportDutyElderRows(app, rows)
	if err != nil {
		t.Fatalf("import invalid batch: %v", err)
	}
	if results[0].Status != ImportStatusBestaand || results[1].Status != ImportStatusOngeldig {
		t.Fatalf("unexpected results: %#v", results)
	}

	sermon, err := app.FindRecordById("sermons", sermonID)
	if err != nil {
		t.Fatalf("reload sermon: %v", err)
	}
	if sermon.GetString("dutyElder") != "Oude naam" {
		t.Fatalf("valid row was written despite invalid batch: %q", sermon.GetString("dutyElder"))
	}
}

func TestDutyElderCheckMarksDuplicateRows(t *testing.T) {
	app := newDutyElderTestApp(t)
	seedDutyElderService(t, app, "2026-08-02 08:00:00.000Z", "")

	rows := []DutyElderImportRow{
		{EventStartTime: stringPointer("2026-08-02T10:00:00+02:00"), DutyElder: stringPointer("D. de Lang")},
		{EventStartTime: stringPointer("2026-08-02 10:00"), DutyElder: stringPointer("Een ander")},
	}
	results, err := CheckDutyElderRows(app, rows)
	if err != nil {
		t.Fatalf("check duplicate rows: %v", err)
	}
	if results[1].Status != ImportStatusDubbel {
		t.Fatalf("expected duplicate status, got %#v", results[1])
	}
}
