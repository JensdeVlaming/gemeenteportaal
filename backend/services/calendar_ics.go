package services

import (
	"fmt"
	"os"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

const iCalDateTimeLayout = "20060102T150405Z"

type calendarFeedEvent struct {
	UID             string
	Summary         string
	Location        string
	DescriptionText string
	DescriptionHTML string
	StartTime       time.Time
	EndTime         time.Time
	LastModified    time.Time
}

func BuildCalendarICS(app core.App) (string, error) {
	events, err := collectCalendarFeedEvents(app)
	if err != nil {
		return "", err
	}

	sort.SliceStable(events, func(i, j int) bool {
		return events[i].StartTime.Before(events[j].StartTime)
	})

	nowUTC := time.Now().UTC()
	calName := getEnvOrDefault("ICS_CALENDAR_NAME", "Gemeenteportaal")
	uidDomain := getEnvOrDefault("ICS_UID_DOMAIN", "gemeenteportaal.local")

	lines := []string{
		"BEGIN:VCALENDAR",
		"PRODID:-//Gemeenteportaal//Calendar Feed//NL",
		"VERSION:2.0",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"X-WR-CALNAME:" + escapeICalText(calName),
		"X-WR-TIMEZONE:Europe/Amsterdam",
	}

	for _, event := range events {
		uid := event.UID
		if strings.TrimSpace(uid) == "" {
			uid = fmt.Sprintf("event-%d@%s", event.StartTime.Unix(), uidDomain)
		}

		lastModified := event.LastModified
		if lastModified.IsZero() {
			lastModified = nowUTC
		}

		lines = append(lines,
			"BEGIN:VEVENT",
			"UID:"+escapeICalText(uid),
			"DTSTAMP:"+nowUTC.Format(iCalDateTimeLayout),
			"LAST-MODIFIED:"+lastModified.UTC().Format(iCalDateTimeLayout),
			"DTSTART:"+event.StartTime.UTC().Format(iCalDateTimeLayout),
			"DTEND:"+event.EndTime.UTC().Format(iCalDateTimeLayout),
			"SUMMARY:"+escapeICalText(event.Summary),
		)

		if event.Location != "" {
			lines = append(lines, "LOCATION:"+escapeICalText(event.Location))
		}

		descriptionValue := event.DescriptionText
		if event.DescriptionHTML != "" {
			descriptionValue = event.DescriptionHTML
		}

		if descriptionValue != "" {
			lines = append(lines, "DESCRIPTION:"+escapeICalText(descriptionValue))
		}

		if event.DescriptionHTML != "" {
			lines = append(lines, "X-ALT-DESC;FMTTYPE=text/html:"+escapeICalText(event.DescriptionHTML))
		}

		lines = append(lines, "END:VEVENT")
	}

	lines = append(lines, "END:VCALENDAR")

	folded := make([]string, 0, len(lines)*2)
	for _, line := range lines {
		folded = append(folded, foldICalLine(line)...)
	}

	return strings.Join(folded, "\r\n") + "\r\n", nil
}

func collectCalendarFeedEvents(app core.App) ([]calendarFeedEvent, error) {
	eventRecords, err := app.FindRecordsByFilter("events", "", "startTime", 0, 0)
	if err != nil {
		return nil, err
	}

	defaultLocation := getEnvOrDefault("ICS_DEFAULT_LOCATION", "De Wijnstok")
	livestreamURL := strings.TrimSpace(os.Getenv("ICS_LIVESTREAM_URL"))
	liturgyURL := strings.TrimSpace(os.Getenv("ICS_LITURGY_URL"))
	uidDomain := getEnvOrDefault("ICS_UID_DOMAIN", "gemeenteportaal.local")

	results := make([]calendarFeedEvent, 0, len(eventRecords))

	for _, eventRecord := range eventRecords {
		startTime, ok := parseRecordDateTime(eventRecord.GetString("startTime"))
		if !ok {
			continue
		}

		endTime, ok := parseRecordDateTime(eventRecord.GetString("endTime"))
		if !ok || !endTime.After(startTime) {
			continue
		}

		summary := strings.TrimSpace(eventRecord.GetString("title"))
		if summary == "" {
			summary = "Onbekende dienst"
		}

		location := strings.TrimSpace(eventRecord.GetString("location"))
		if location == "" {
			location = defaultLocation
		}

		descText, descHTML, err := buildEventDescription(app, eventRecord, livestreamURL, liturgyURL)
		if err != nil {
			return nil, err
		}

		lastModified, _ := parseRecordDateTime(eventRecord.GetString("updated"))

		results = append(results, calendarFeedEvent{
			UID:             fmt.Sprintf("event-%s@%s", eventRecord.Id, uidDomain),
			Summary:         summary,
			Location:        location,
			DescriptionText: descText,
			DescriptionHTML: descHTML,
			StartTime:       startTime,
			EndTime:         endTime,
			LastModified:    lastModified,
		})
	}

	return results, nil
}

func buildEventDescription(app core.App, eventRecord *core.Record, livestreamURL, liturgyURL string) (string, string, error) {
	sermons, err := app.FindRecordsByFilter(
		"sermons",
		"event = {:eventId}",
		"",
		0,
		0,
		dbx.Params{"eventId": eventRecord.Id},
	)
	if err != nil {
		return "", "", err
	}

	baseDescription := strings.TrimSpace(eventRecord.GetString("description"))
	if len(sermons) == 0 {
		if baseDescription == "" {
			return "", "", nil
		}
		return baseDescription, baseDescription, nil
	}

	speakers := make([]string, 0, len(sermons))
	collections := make([]string, 0)

	for _, sermon := range sermons {
		speaker := strings.TrimSpace(sermon.GetString("speaker"))
		if speaker != "" {
			speakers = append(speakers, speaker)
		}

		collectionRecords, err := app.FindRecordsByFilter(
			"collections",
			"sermon = {:sermonId}",
			"",
			0,
			0,
			dbx.Params{"sermonId": sermon.Id},
		)
		if err != nil {
			return "", "", err
		}

		for _, collection := range collectionRecords {
			name := strings.TrimSpace(collection.GetString("name"))
			if name == "" {
				continue
			}
			description := strings.TrimSpace(collection.GetString("description"))
			if description == "" {
				collections = append(collections, name)
				continue
			}
			collections = append(collections, fmt.Sprintf("%s - %s", name, description))
		}
	}

	if len(speakers) == 0 {
		speakers = append(speakers, "Onbekende voorganger")
	}

	plainLines := []string{
		"Voorganger: " + strings.Join(speakers, ", "),
		"",
	}
	htmlParts := []string{
		"<strong>Voorganger:</strong> " + strings.Join(speakers, ", "),
		"",
	}

	if len(collections) > 0 {
		plainLines = append(plainLines, "Collectedoelen:")
		htmlParts = append(htmlParts, "<strong>Collectedoelen:</strong>")
		for index, item := range collections {
			line := fmt.Sprintf("%d. %s", index+1, item)
			plainLines = append(plainLines, line)
			htmlParts = append(htmlParts, line)
		}
	}

	if livestreamURL != "" {
		plainLines = append(plainLines, "", "Bekijk livestream: "+livestreamURL)
		htmlParts = append(htmlParts, "", "<strong><a href=\""+livestreamURL+"\">Bekijk livestream</a></strong>")
	}

	if liturgyURL != "" {
		plainLines = append(plainLines, "", "Bekijk liturgie: "+liturgyURL)
		htmlParts = append(htmlParts, "", "<strong><a href=\""+liturgyURL+"\">Bekijk liturgie</a></strong>")
	}

	if baseDescription != "" {
		plainLines = append(plainLines, "", baseDescription)
		htmlParts = append(htmlParts, "", baseDescription)
	}

	return strings.Join(plainLines, "\n"), strings.Join(htmlParts, "<br />"), nil
}

func parseRecordDateTime(value string) (time.Time, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, false
	}

	tryParse := func(input string) (time.Time, bool) {
		layouts := []string{time.RFC3339Nano, time.RFC3339, "2006-01-02 15:04:05", "2006-01-02 15:04"}
		for _, layout := range layouts {
			parsed, err := time.Parse(layout, input)
			if err == nil {
				return parsed, true
			}
		}
		return time.Time{}, false
	}

	if parsed, ok := tryParse(value); ok {
		return parsed, true
	}

	if strings.Contains(value, " ") {
		normalized := strings.Replace(value, " ", "T", 1)
		if parsed, ok := tryParse(normalized); ok {
			return parsed, true
		}
	}

	return time.Time{}, false
}

func getEnvOrDefault(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func escapeICalText(value string) string {
	if value == "" {
		return ""
	}

	replacer := strings.NewReplacer(
		"\\", "\\\\",
		";", "\\;",
		",", "\\,",
		"\r\n", "\\n",
		"\n", "\\n",
		"\r", "\\n",
	)

	return replacer.Replace(value)
}

func foldICalLine(line string) []string {
	if len(line) <= 75 {
		return []string{line}
	}

	out := make([]string, 0, 2)
	remaining := line
	first := true

	for len(remaining) > 0 {
		limit := 75
		if !first {
			limit = 74
		}

		chunk, rest := takeByByteLimit(remaining, limit)
		if !first {
			chunk = " " + chunk
		}

		out = append(out, chunk)
		remaining = rest
		first = false
	}

	return out
}

func takeByByteLimit(value string, byteLimit int) (string, string) {
	if len(value) <= byteLimit {
		return value, ""
	}

	total := 0
	index := 0
	for index < len(value) {
		_, runeSize := utf8.DecodeRuneInString(value[index:])
		if total+runeSize > byteLimit {
			break
		}
		total += runeSize
		index += runeSize
	}

	if index == 0 {
		return value[:byteLimit], value[byteLimit:]
	}

	return value[:index], value[index:]
}
