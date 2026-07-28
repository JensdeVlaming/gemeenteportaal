package services

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

var amsterdamLocation = func() *time.Location {
	location, err := time.LoadLocation("Europe/Amsterdam")
	if err != nil {
		return time.UTC
	}
	return location
}()

type ImportStatus string

const (
	ImportStatusNieuw        ImportStatus = "Nieuwe rij"
	ImportStatusBestaand     ImportStatus = "Wordt geüpdatet"
	ImportStatusFout         ImportStatus = "Fout"
	ImportStatusLeeg         ImportStatus = "Leeg"
	ImportStatusOngeldig     ImportStatus = "Ongeldig"
	ImportStatusDubbel       ImportStatus = "Dubbel"
	ImportStatusOvergeslagen ImportStatus = "Overgeslagen"
	ImportStatusAangemaakt   ImportStatus = "Aangemaakt"
	ImportStatusHergebruikt  ImportStatus = "Hergebruikt"
)

type ImportCollection struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
}

type ImportRow struct {
	ImportMode     *string            `json:"import_mode,omitempty"`
	EventTitle     *string            `json:"event_title"`
	EventStartTime *string            `json:"event_start_time"`
	EventEndTime   *string            `json:"event_end_time"`
	Speaker        *string            `json:"speaker"`
	DutyElder      *string            `json:"duty_elder,omitempty"`
	Collections    []ImportCollection `json:"collections"`
	Message        *string            `json:"message,omitempty"`
}

type ImportResultRow struct {
	ImportMode      string             `json:"import_mode,omitempty"`
	EventTitle      string             `json:"event_title"`
	EventStartTime  string             `json:"event_start_time"`
	EventEndTime    string             `json:"event_end_time"`
	Speaker         string             `json:"speaker"`
	DutyElder       *string            `json:"duty_elder,omitempty"`
	Collections     []ImportCollection `json:"collections"`
	Status          ImportStatus       `json:"status"`
	Message         *string            `json:"message,omitempty"`
	EventID         *string            `json:"event_id,omitempty"`
	SermonID        *string            `json:"sermon_id,omitempty"`
	CollectionDiffs *CollectionDiffs   `json:"collectionDiffs,omitempty"`
	SpeakerDiff     *ValueDiff         `json:"speakerDiff,omitempty"`
	DutyElderDiff   *ValueDiff         `json:"dutyElderDiff,omitempty"`
	TitleDiff       *ValueDiff         `json:"titleDiff,omitempty"`
}

type CollectionDiffs struct {
	Added   []string `json:"added"`
	Removed []string `json:"removed"`
}

type ValueDiff struct {
	Before *string `json:"before,omitempty"`
	After  *string `json:"after,omitempty"`
}

type NormalizedRow struct {
	EventTitle     string
	EventStartTime string
	EventEndTime   string
	Speaker        string
	DutyElder      *string
	Collections    []ImportCollection
	Message        *string
}

func trimValue(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func normalizeRow(row ImportRow) NormalizedRow {
	collections := make([]ImportCollection, 0, len(row.Collections))
	for _, c := range row.Collections {
		name := strings.TrimSpace(c.Name)
		if name == "" {
			continue
		}
		description := strings.TrimSpace(pointerString(c.Description))
		if description == "" {
			collections = append(collections, ImportCollection{Name: name})
		} else {
			desc := description
			collections = append(collections, ImportCollection{Name: name, Description: &desc})
		}
	}

	var dutyElder *string
	if row.DutyElder != nil {
		trimmed := strings.TrimSpace(*row.DutyElder)
		dutyElder = &trimmed
	}

	return NormalizedRow{
		EventTitle:     trimValue(row.EventTitle),
		EventStartTime: trimValue(row.EventStartTime),
		EventEndTime:   trimValue(row.EventEndTime),
		Speaker:        trimValue(row.Speaker),
		DutyElder:      dutyElder,
		Collections:    collections,
		Message:        row.Message,
	}
}

func emptyRow(status ImportStatus, message string) ImportResultRow {
	return ImportResultRow{
		EventTitle:     "",
		EventStartTime: "",
		EventEndTime:   "",
		Speaker:        "",
		Collections:    []ImportCollection{},
		Status:         status,
		Message:        &message,
	}
}

func toISO(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}

	timezoneLayouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05.000Z07:00",
		"2006-01-02 15:04:05Z07:00",
		"2006-01-02T15:04:05.000Z07:00",
	}
	naiveLayouts := []string{
		"2006-01-02 15:04:05.000",
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
		"2006-01-02T15:04:05.000",
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
		"2006-01-02",
	}

	candidates := []string{value}
	if strings.Contains(value, " ") {
		candidates = append(candidates, strings.Replace(value, " ", "T", 1))
	}

	for _, candidate := range candidates {
		for _, layout := range timezoneLayouts {
			parsed, err := time.Parse(layout, candidate)
			if err == nil {
				return parsed.UTC().Format(time.RFC3339)
			}
		}
	}

	for _, candidate := range candidates {
		for _, layout := range naiveLayouts {
			parsed, err := time.ParseInLocation(layout, candidate, amsterdamLocation)
			if err == nil {
				return parsed.UTC().Format(time.RFC3339)
			}
		}
	}

	return ""
}

func invalidRow(row NormalizedRow, message string) ImportResultRow {
	return ImportResultRow{
		EventTitle:     row.EventTitle,
		EventStartTime: row.EventStartTime,
		EventEndTime:   row.EventEndTime,
		Speaker:        row.Speaker,
		DutyElder:      row.DutyElder,
		Collections:    row.Collections,
		Status:         ImportStatusOngeldig,
		Message:        &message,
	}
}

func validateRow(row NormalizedRow) ImportResultRow {
	if row.EventStartTime == "" || row.EventEndTime == "" {
		return invalidRow(row, "Ontbrekende start- of eindtijd.")
	}

	if row.Speaker == "" {
		return invalidRow(row, "Ontbrekende spreker.")
	}

	startISO := toISO(row.EventStartTime)
	endISO := toISO(row.EventEndTime)
	if startISO == "" || endISO == "" {
		return invalidRow(row, "Ongeldige datum of tijd.")
	}

	startTime, errStart := time.Parse(time.RFC3339, startISO)
	endTime, errEnd := time.Parse(time.RFC3339, endISO)
	if errStart != nil || errEnd != nil || !endTime.After(startTime) {
		return invalidRow(row, "Eindtijd moet later zijn dan starttijd.")
	}

	return ImportResultRow{
		EventTitle:     row.EventTitle,
		EventStartTime: startISO,
		EventEndTime:   endISO,
		Speaker:        row.Speaker,
		DutyElder:      row.DutyElder,
		Collections:    row.Collections,
		Status:         ImportStatusNieuw,
		Message:        row.Message,
	}
}

func markDuplicateRows(rows []ImportResultRow) []ImportResultRow {
	seen := map[string]int{}
	results := make([]ImportResultRow, 0, len(rows))

	for _, row := range rows {
		key := strings.ToLower(row.EventStartTime) + "|" + strings.ToLower(row.Speaker)
		count := seen[key]
		seen[key] = count + 1

		if count > 0 && row.Status != ImportStatusOngeldig && row.Status != ImportStatusFout {
			message := "Dubbele rij in het bestand. Alleen de eerste wordt geïmporteerd."
			row.Status = ImportStatusDubbel
			if row.Message == nil {
				row.Message = &message
			}
		}

		results = append(results, row)
	}

	return results
}

func validateSermonRows(rows []ImportRow) []ImportResultRow {
	if len(rows) == 0 {
		return []ImportResultRow{
			emptyRow(ImportStatusLeeg, "Het bestand bevat geen gegevens."),
		}
	}

	normalized := make([]ImportResultRow, 0, len(rows))
	for _, row := range rows {
		normalized = append(normalized, validateRow(normalizeRow(row)))
	}

	return markDuplicateRows(normalized)
}

func createSermonKey(start string) string {
	return start
}

func toPocketBaseDateFilterValue(iso string) string {
	if strings.TrimSpace(iso) == "" {
		return ""
	}

	parsed, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		return iso
	}

	return parsed.UTC().Format("2006-01-02 15:04:05.000Z")
}

type ExistingSermonInfo struct {
	EventID     string
	SermonID    string
	EventTitle  string
	StartTime   string
	EndTime     string
	Speaker     string
	DutyElder   string
	Collections []ImportCollection
}

func getTimeRange(rows []ImportResultRow) *struct{ Min, Max string } {
	timesSet := map[string]struct{}{}
	for _, row := range rows {
		if row.Status != ImportStatusNieuw {
			continue
		}
		if row.EventStartTime == "" {
			continue
		}
		timesSet[row.EventStartTime] = struct{}{}
	}

	if len(timesSet) == 0 {
		return nil
	}

	times := make([]string, 0, len(timesSet))
	for t := range timesSet {
		times = append(times, t)
	}
	sort.Strings(times)

	return &struct{ Min, Max string }{Min: times[0], Max: times[len(times)-1]}
}

func buildExistingMap(app core.App, events []*core.Record) (map[string]ExistingSermonInfo, error) {
	result := make(map[string]ExistingSermonInfo)

	for _, event := range events {
		startISO := toISO(event.GetString("startTime"))
		if startISO == "" || event.Id == "" {
			continue
		}

		sermons, err := app.FindRecordsByFilter(
			"sermons",
			"event = {:eventId}",
			"",
			0,
			0,
			dbx.Params{"eventId": event.Id},
		)
		if err != nil {
			return nil, err
		}

		for _, sermon := range sermons {
			if sermon.Id == "" {
				continue
			}
			title := strings.TrimSpace(event.GetString("title"))
			if title == "" {
				continue
			}

			collections, err := app.FindRecordsByFilter(
				"collections",
				"sermon = {:sermonId}",
				"",
				0,
				0,
				dbx.Params{"sermonId": sermon.Id},
			)
			if err != nil {
				return nil, err
			}

			collectionRecords := make([]ImportCollection, 0, len(collections))
			for _, collection := range collections {
				name := strings.TrimSpace(collection.GetString("name"))
				if name == "" {
					continue
				}
				description := strings.TrimSpace(collection.GetString("description"))
				if description == "" {
					collectionRecords = append(collectionRecords, ImportCollection{Name: name})
				} else {
					desc := description
					collectionRecords = append(collectionRecords, ImportCollection{Name: name, Description: &desc})
				}
			}

			result[createSermonKey(startISO)] = ExistingSermonInfo{
				EventID:     event.Id,
				SermonID:    sermon.Id,
				EventTitle:  event.GetString("title"),
				StartTime:   startISO,
				EndTime:     toISO(event.GetString("endTime")),
				Speaker:     sermon.GetString("speaker"),
				DutyElder:   sermon.GetString("dutyElder"),
				Collections: collectionRecords,
			}
		}
	}

	return result, nil
}

func normalizeCollection(collection ImportCollection) (string, *string) {
	name := strings.TrimSpace(collection.Name)
	normalized := strings.ToLower(name)

	var description *string
	if collection.Description != nil {
		trimmed := strings.TrimSpace(*collection.Description)
		if trimmed != "" {
			description = &trimmed
		}
	}

	return normalized, description
}

func collectionsEqual(rowCollections []ImportCollection, existingCollections []ImportCollection) bool {
	if len(rowCollections) != len(existingCollections) {
		return false
	}

	sortNormalized := func(items []ImportCollection) []ImportCollection {
		normalized := make([]ImportCollection, 0, len(items))
		for _, item := range items {
			name, desc := normalizeCollection(item)
			if name == "" {
				continue
			}
			display := name
			normalized = append(normalized, ImportCollection{Name: display, Description: desc})
		}
		sort.SliceStable(normalized, func(i, j int) bool {
			return normalized[i].Name < normalized[j].Name
		})
		return normalized
	}

	left := sortNormalized(rowCollections)
	right := sortNormalized(existingCollections)

	if len(left) != len(right) {
		return false
	}

	for i := range left {
		if left[i].Name != right[i].Name {
			return false
		}
		leftDesc := pointerString(left[i].Description)
		rightDesc := pointerString(right[i].Description)
		if leftDesc != rightDesc {
			return false
		}
	}

	return true
}

func getCollectionDiffs(rowCollections []ImportCollection, existingCollections []ImportCollection) CollectionDiffs {
	normalizeName := func(value string) string {
		return strings.ToLower(strings.TrimSpace(value))
	}
	stripName := func(value string) string {
		return strings.TrimSpace(value)
	}

	rowMap := map[string]string{}
	for _, collection := range rowCollections {
		normalized := normalizeName(collection.Name)
		if normalized == "" {
			continue
		}
		rowMap[normalized] = stripName(collection.Name)
	}

	existingMap := map[string]string{}
	for _, collection := range existingCollections {
		normalized := normalizeName(collection.Name)
		if normalized == "" {
			continue
		}
		existingMap[normalized] = stripName(collection.Name)
	}

	added := []string{}
	for key, display := range rowMap {
		if _, ok := existingMap[key]; !ok {
			added = append(added, display)
		}
	}

	removed := []string{}
	for key, display := range existingMap {
		if _, ok := rowMap[key]; !ok {
			removed = append(removed, display)
		}
	}

	return CollectionDiffs{Added: added, Removed: removed}
}

func getSpeakerDiff(row ImportResultRow, existing ExistingSermonInfo) *ValueDiff {
	before := strings.TrimSpace(existing.Speaker)
	after := strings.TrimSpace(row.Speaker)
	if strings.EqualFold(before, after) {
		return nil
	}
	return &ValueDiff{Before: nullableString(existing.Speaker), After: nullableString(row.Speaker)}
}

func getDutyElderDiff(row ImportResultRow, existing ExistingSermonInfo) *ValueDiff {
	if row.DutyElder == nil {
		return nil
	}
	before := strings.TrimSpace(existing.DutyElder)
	after := strings.TrimSpace(*row.DutyElder)
	if strings.EqualFold(before, after) {
		return nil
	}
	return &ValueDiff{Before: nullableString(existing.DutyElder), After: nullableString(*row.DutyElder)}
}

func getTitleDiff(row ImportResultRow, existing ExistingSermonInfo) *ValueDiff {
	before := strings.TrimSpace(existing.EventTitle)
	after := strings.TrimSpace(row.EventTitle)
	if strings.EqualFold(before, after) {
		return nil
	}
	return &ValueDiff{Before: nullableString(existing.EventTitle), After: nullableString(row.EventTitle)}
}

func hasChanges(row ImportResultRow, existing ExistingSermonInfo) bool {
	titleChanged := !strings.EqualFold(strings.TrimSpace(row.EventTitle), strings.TrimSpace(existing.EventTitle))
	startChanged := row.EventStartTime != existing.StartTime
	endChanged := row.EventEndTime != existing.EndTime
	speakerChanged := !strings.EqualFold(strings.TrimSpace(row.Speaker), strings.TrimSpace(existing.Speaker))
	dutyElderChanged := row.DutyElder != nil && !strings.EqualFold(strings.TrimSpace(*row.DutyElder), strings.TrimSpace(existing.DutyElder))
	collectionsChanged := !collectionsEqual(row.Collections, existing.Collections)

	return titleChanged || startChanged || endChanged || speakerChanged || dutyElderChanged || collectionsChanged
}

func markExistingSermons(app core.App, rows []ImportResultRow) ([]ImportResultRow, error) {
	if len(rows) == 0 {
		return rows, nil
	}

	rangeData := getTimeRange(rows)
	if rangeData == nil {
		return rows, nil
	}

	minFilter := toPocketBaseDateFilterValue(rangeData.Min)
	maxFilter := toPocketBaseDateFilterValue(rangeData.Max)

	events, err := app.FindRecordsByFilter(
		"events",
		"startTime >= {:min} && startTime <= {:max}",
		"startTime",
		0,
		0,
		dbx.Params{"min": minFilter, "max": maxFilter},
	)
	if err != nil {
		return rows, nil
	}
	if len(events) == 0 {
		events, err = app.FindRecordsByFilter(
			"events",
			"",
			"startTime",
			0,
			0,
			nil,
		)
		if err != nil || len(events) == 0 {
			return rows, nil
		}
	}

	existingMap, err := buildExistingMap(app, events)
	if err != nil || len(existingMap) == 0 {
		return rows, nil
	}

	results := make([]ImportResultRow, 0, len(rows))
	for _, row := range rows {
		if row.Status != ImportStatusNieuw {
			results = append(results, row)
			continue
		}

		existing, ok := existingMap[createSermonKey(row.EventStartTime)]
		if !ok {
			results = append(results, row)
			continue
		}

		changesDetected := hasChanges(row, existing)
		if !changesDetected {
			message := "De gegevens zijn gelijk aan de bestaande preek. Import wordt overgeslagen."
			row.Status = ImportStatusOvergeslagen
			if row.Message == nil {
				row.Message = &message
			}
			results = append(results, row)
			continue
		}

		message := "Er bestaat al een preek op dit tijdstip."
		row.Status = ImportStatusBestaand
		if row.Message == nil {
			row.Message = &message
		}

		row.EventID = &existing.EventID
		row.SermonID = &existing.SermonID
		diffs := getCollectionDiffs(row.Collections, existing.Collections)
		row.CollectionDiffs = &diffs
		row.SpeakerDiff = getSpeakerDiff(row, existing)
		row.DutyElderDiff = getDutyElderDiff(row, existing)
		row.TitleDiff = getTitleDiff(row, existing)

		results = append(results, row)
	}

	return results, nil
}

func CheckSermonRows(app core.App, rows []ImportRow) ([]ImportResultRow, error) {
	dutyElderOnly, err := isDutyElderOnlyImport(rows)
	if err != nil {
		return nil, err
	}
	if dutyElderOnly {
		checked, checkErr := CheckDutyElderRows(app, toDutyElderRows(rows))
		return fromDutyElderResults(checked), checkErr
	}

	validated := validateSermonRows(rows)
	return markExistingSermons(app, validated)
}

func ImportSermonRows(app core.App, rows []ImportRow) ([]ImportResultRow, error) {
	dutyElderOnly, modeErr := isDutyElderOnlyImport(rows)
	if modeErr != nil {
		return nil, modeErr
	}
	if dutyElderOnly {
		imported, importErr := ImportDutyElderRows(app, toDutyElderRows(rows))
		return fromDutyElderResults(imported), importErr
	}

	validated, err := CheckSermonRows(app, rows)
	if err != nil {
		return validated, err
	}

	results := make([]ImportResultRow, 0, len(validated))

	for _, row := range validated {
		switch row.Status {
		case ImportStatusNieuw:
			eventID, err := insertEvent(app, row)
			if err != nil {
				results = append(results, withError(row, err))
				continue
			}

			sermonID, err := insertSermon(app, eventID, row)
			if err != nil {
				results = append(results, withError(row, err))
				continue
			}

			if err := insertCollections(app, sermonID, row); err != nil {
				results = append(results, withError(row, err))
				continue
			}

			message := "Preek succesvol geïmporteerd."
			row.Status = ImportStatusAangemaakt
			row.Message = &message
			results = append(results, row)
		case ImportStatusBestaand:
			if row.EventID == nil || row.SermonID == nil {
				results = append(results, withError(row, errors.New("Bestaande preek kon niet worden gevonden.")))
				continue
			}

			if err := updateExistingSermon(app, *row.EventID, *row.SermonID, row); err != nil {
				results = append(results, withError(row, err))
				continue
			}

			message := "Bestaande preek is bijgewerkt met de nieuwe gegevens."
			row.Status = ImportStatusHergebruikt
			row.Message = &message
			results = append(results, row)
		default:
			results = append(results, row)
		}
	}

	return results, nil
}

func isDutyElderOnlyImport(rows []ImportRow) (bool, error) {
	dutyElderRows := 0
	for _, row := range rows {
		if row.ImportMode != nil && strings.TrimSpace(*row.ImportMode) == "duty_elder" {
			dutyElderRows++
		}
	}

	if dutyElderRows > 0 && dutyElderRows != len(rows) {
		return false, errors.New("Een import mag geen preek- en ouderlingenrijen combineren.")
	}
	return dutyElderRows > 0, nil
}

func toDutyElderRows(rows []ImportRow) []DutyElderImportRow {
	result := make([]DutyElderImportRow, 0, len(rows))
	for _, row := range rows {
		result = append(result, DutyElderImportRow{
			EventStartTime: row.EventStartTime,
			DutyElder:      row.DutyElder,
		})
	}
	return result
}

func fromDutyElderResults(rows []DutyElderImportResult) []ImportResultRow {
	result := make([]ImportResultRow, 0, len(rows))
	for _, row := range rows {
		dutyElder := row.DutyElder
		result = append(result, ImportResultRow{
			ImportMode:     "duty_elder",
			EventStartTime: row.EventStartTime,
			DutyElder:      &dutyElder,
			Collections:    []ImportCollection{},
			Status:         row.Status,
			Message:        row.Message,
			SermonID:       row.SermonID,
		})
	}
	return result
}

func insertEvent(app core.App, row ImportResultRow) (string, error) {
	collection, err := app.FindCollectionByNameOrId("events")
	if err != nil {
		return "", err
	}

	record := core.NewRecord(collection)
	title := strings.TrimSpace(row.EventTitle)
	if title == "" {
		title = "Onbekende dienst"
	}
	record.Set("title", title)
	record.Set("startTime", row.EventStartTime)
	record.Set("endTime", row.EventEndTime)

	if err := app.Save(record); err != nil {
		return "", err
	}
	return record.Id, nil
}

func insertSermon(app core.App, eventID string, row ImportResultRow) (string, error) {
	collection, err := app.FindCollectionByNameOrId("sermons")
	if err != nil {
		return "", err
	}

	record := core.NewRecord(collection)
	record.Set("event", eventID)

	speaker := strings.TrimSpace(row.Speaker)
	if speaker == "" {
		speaker = "Onbekende spreker"
	}
	record.Set("speaker", speaker)
	if row.DutyElder != nil {
		record.Set("dutyElder", strings.TrimSpace(*row.DutyElder))
	}

	if err := app.Save(record); err != nil {
		return "", err
	}
	return record.Id, nil
}

func insertCollections(app core.App, sermonID string, row ImportResultRow) error {
	if len(row.Collections) == 0 {
		return nil
	}

	collection, err := app.FindCollectionByNameOrId("collections")
	if err != nil {
		return err
	}

	for _, collectionRow := range row.Collections {
		record := core.NewRecord(collection)
		record.Set("sermon", sermonID)
		record.Set("name", collectionRow.Name)
		record.Set("description", pointerString(collectionRow.Description))
		if err := app.Save(record); err != nil {
			return err
		}
	}

	return nil
}

func updateExistingSermon(app core.App, eventID, sermonID string, row ImportResultRow) error {
	if err := updateEvent(app, eventID, row); err != nil {
		return err
	}
	if err := updateSermon(app, sermonID, row); err != nil {
		return err
	}
	return syncCollections(app, sermonID, row)
}

func updateEvent(app core.App, eventID string, row ImportResultRow) error {
	record, err := app.FindRecordById("events", eventID)
	if err != nil {
		return err
	}
	title := strings.TrimSpace(row.EventTitle)
	if title == "" {
		title = "Onbekende dienst"
	}
	record.Set("title", title)
	record.Set("startTime", row.EventStartTime)
	record.Set("endTime", row.EventEndTime)
	return app.Save(record)
}

func updateSermon(app core.App, sermonID string, row ImportResultRow) error {
	record, err := app.FindRecordById("sermons", sermonID)
	if err != nil {
		return err
	}
	speaker := strings.TrimSpace(row.Speaker)
	if speaker == "" {
		speaker = "Onbekende spreker"
	}
	record.Set("speaker", speaker)
	if row.DutyElder != nil {
		record.Set("dutyElder", strings.TrimSpace(*row.DutyElder))
	}
	return app.Save(record)
}

func syncCollections(app core.App, sermonID string, row ImportResultRow) error {
	existing, err := app.FindRecordsByFilter(
		"collections",
		"sermon = {:sermonId}",
		"",
		0,
		0,
		dbx.Params{"sermonId": sermonID},
	)
	if err != nil {
		return err
	}

	existingByName := map[string]*core.Record{}
	for _, record := range existing {
		name := strings.TrimSpace(record.GetString("name"))
		if name == "" {
			continue
		}
		existingByName[strings.ToLower(name)] = record
	}

	processed := map[string]struct{}{}
	for _, collection := range row.Collections {
		trimmed := strings.TrimSpace(collection.Name)
		if trimmed == "" {
			continue
		}

		key := strings.ToLower(trimmed)
		description := pointerString(collection.Description)

		if existingRecord, ok := existingByName[key]; ok {
			processed[key] = struct{}{}
			if existingRecord.GetString("description") != description {
				existingRecord.Set("description", description)
				if err := app.Save(existingRecord); err != nil {
					return err
				}
			}
			continue
		}

		if _, err := createCollectionRecord(app, sermonID, trimmed, description); err != nil {
			return err
		}
		processed[key] = struct{}{}
	}

	for key, existingRecord := range existingByName {
		if _, ok := processed[key]; ok {
			continue
		}
		if err := app.Delete(existingRecord); err != nil {
			return err
		}
	}

	return nil
}

func createCollectionRecord(app core.App, sermonID, name, description string) (*core.Record, error) {
	collection, err := app.FindCollectionByNameOrId("collections")
	if err != nil {
		return nil, err
	}

	record := core.NewRecord(collection)
	record.Set("sermon", sermonID)
	record.Set("name", name)
	record.Set("description", description)

	if err := app.Save(record); err != nil {
		return nil, err
	}

	return record, nil
}

func withError(row ImportResultRow, err error) ImportResultRow {
	message := "Onbekende fout."
	if err != nil {
		message = err.Error()
	}
	row.Status = ImportStatusFout
	row.Message = &message
	return row
}

func pointerString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func nullableString(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

type DutyElderImportRow struct {
	EventStartTime *string `json:"event_start_time"`
	DutyElder      *string `json:"duty_elder"`
}

type DutyElderImportResult struct {
	EventStartTime string       `json:"event_start_time"`
	DutyElder      string       `json:"duty_elder"`
	Status         ImportStatus `json:"status"`
	Message        *string      `json:"message,omitempty"`
	SermonID       *string      `json:"sermon_id,omitempty"`
}

func CheckDutyElderRows(app core.App, rows []DutyElderImportRow) ([]DutyElderImportResult, error) {
	if len(rows) == 0 {
		message := "Het bestand bevat geen gegevens."
		return []DutyElderImportResult{{Status: ImportStatusLeeg, Message: &message}}, nil
	}

	results := make([]DutyElderImportResult, 0, len(rows))
	seen := map[string]struct{}{}

	for _, row := range rows {
		startValue := trimValue(row.EventStartTime)
		elder := trimValue(row.DutyElder)
		result := DutyElderImportResult{EventStartTime: startValue, DutyElder: elder}

		startISO := toISO(startValue)
		if startISO == "" {
			message := "Ongeldige datum of tijd."
			result.Status = ImportStatusOngeldig
			result.Message = &message
			results = append(results, result)
			continue
		}
		result.EventStartTime = startISO

		if elder == "" {
			message := "Ontbrekende ouderling van dienst."
			result.Status = ImportStatusOngeldig
			result.Message = &message
			results = append(results, result)
			continue
		}

		if _, duplicate := seen[startISO]; duplicate {
			message := "Dubbele dienst in het bestand."
			result.Status = ImportStatusDubbel
			result.Message = &message
			results = append(results, result)
			continue
		}
		seen[startISO] = struct{}{}

		sermon, err := findSermonByStartTime(app, startISO)
		if err != nil {
			message := err.Error()
			result.Status = ImportStatusOngeldig
			result.Message = &message
			results = append(results, result)
			continue
		}

		result.SermonID = &sermon.Id
		current := strings.TrimSpace(sermon.GetString("dutyElder"))
		if strings.EqualFold(current, elder) {
			message := "Ouderling van dienst is al gelijk."
			result.Status = ImportStatusOvergeslagen
			result.Message = &message
		} else {
			message := "Bestaande dienst wordt bijgewerkt."
			result.Status = ImportStatusBestaand
			result.Message = &message
		}

		results = append(results, result)
	}

	return results, nil
}

func ImportDutyElderRows(app core.App, rows []DutyElderImportRow) ([]DutyElderImportResult, error) {
	results, err := CheckDutyElderRows(app, rows)
	if err != nil {
		return results, err
	}

	for _, result := range results {
		if result.Status == ImportStatusOngeldig || result.Status == ImportStatusDubbel || result.Status == ImportStatusFout || result.Status == ImportStatusLeeg {
			return results, nil
		}
	}

	err = app.RunInTransaction(func(txApp core.App) error {
		for _, result := range results {
			if result.Status != ImportStatusBestaand || result.SermonID == nil {
				continue
			}

			record, findErr := txApp.FindRecordById("sermons", *result.SermonID)
			if findErr != nil {
				return findErr
			}
			record.Set("dutyElder", result.DutyElder)
			if saveErr := txApp.Save(record); saveErr != nil {
				return saveErr
			}
		}
		return nil
	})
	if err != nil {
		return results, err
	}

	for index := range results {
		if results[index].Status == ImportStatusBestaand {
			message := "Ouderling van dienst is bijgewerkt."
			results[index].Status = ImportStatusHergebruikt
			results[index].Message = &message
		}
	}

	return results, nil
}

func findSermonByStartTime(app core.App, startISO string) (*core.Record, error) {
	startFilter := toPocketBaseDateFilterValue(startISO)
	events, err := app.FindRecordsByFilter(
		"events",
		"startTime = {:start}",
		"",
		0,
		0,
		dbx.Params{"start": startFilter},
	)
	if err != nil {
		return nil, err
	}
	if len(events) == 0 {
		return nil, fmt.Errorf("Geen bestaande dienst gevonden op %s.", startISO)
	}
	if len(events) > 1 {
		return nil, fmt.Errorf("Meerdere diensten gevonden op %s.", startISO)
	}

	sermons, err := app.FindRecordsByFilter(
		"sermons",
		"event = {:eventId}",
		"",
		0,
		0,
		dbx.Params{"eventId": events[0].Id},
	)
	if err != nil {
		return nil, err
	}
	if len(sermons) == 0 {
		return nil, errors.New("De gevonden dienst heeft geen gekoppelde preekgegevens.")
	}
	if len(sermons) > 1 {
		return nil, errors.New("De gevonden dienst heeft meerdere gekoppelde preken.")
	}

	return sermons[0], nil
}
