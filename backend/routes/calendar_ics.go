package routes

import (
	"net/http"
	"os"

	"backend/services"

	"github.com/pocketbase/pocketbase/core"
)

func RegisterCalendarRoutes(e *core.ServeEvent) {
	e.Router.GET("/api/calendar/app.ics", handleCalendarICS)
}

func handleCalendarICS(e *core.RequestEvent) error {
	requiredToken := os.Getenv("ICS_FEED_TOKEN")
	if requiredToken != "" {
		providedToken := e.Request.URL.Query().Get("token")
		if providedToken == "" || providedToken != requiredToken {
			return e.String(http.StatusUnauthorized, "Unauthorized")
		}
	}

	calendar, err := services.BuildCalendarICS(e.App)
	if err != nil {
		e.App.Logger().Error("ICS feed generation error", "error", err)
		return e.String(http.StatusInternalServerError, "Serverfout bij genereren van kalender.")
	}

	e.Response.Header().Set("Content-Type", "text/calendar; charset=utf-8")
	e.Response.Header().Set("Content-Disposition", "inline; filename=app.ics")
	e.Response.Header().Set("Cache-Control", "public, max-age=300")

	return e.String(http.StatusOK, calendar)
}
