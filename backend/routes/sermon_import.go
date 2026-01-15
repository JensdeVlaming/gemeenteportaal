package routes

import (
	"net/http"

	"backend/services"

	"github.com/pocketbase/pocketbase/core"
)

type sermonPayload struct {
	Sermons []services.ImportRow `json:"sermons"`
}

func RegisterSermonImportRoutes(e *core.ServeEvent) {
	e.Router.POST("/api/sermon-check", handleSermonCheck)
	e.Router.POST("/api/sermon-import", handleSermonImport)
}

func handleSermonCheck(e *core.RequestEvent) error {
	payload := sermonPayload{}
	if err := e.BindBody(&payload); err != nil || payload.Sermons == nil {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "Geen data ontvangen"})
	}

	results, err := services.CheckSermonRows(e.App, payload.Sermons)
	if err != nil {
		e.App.Logger().Error("Sermon check error", "error", err)
		return e.JSON(http.StatusInternalServerError, map[string]string{"error": "Serverfout bij controle."})
	}

	return e.JSON(http.StatusOK, map[string]any{"results": results})
}

func handleSermonImport(e *core.RequestEvent) error {
	payload := sermonPayload{}
	if err := e.BindBody(&payload); err != nil || len(payload.Sermons) == 0 {
		return e.JSON(http.StatusBadRequest, map[string]string{"error": "Geen data ontvangen"})
	}

	results, err := services.ImportSermonRows(e.App, payload.Sermons)
	if err != nil {
		e.App.Logger().Error("Sermon import error", "error", err)
		return e.JSON(http.StatusInternalServerError, map[string]string{"error": "Serverfout bij import."})
	}

	return e.JSON(http.StatusOK, map[string]any{"results": results})
}
