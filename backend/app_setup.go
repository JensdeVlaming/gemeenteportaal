package main

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/hook"
	"github.com/spf13/cast"

	"backend/routes"
)

func registerSettingsHooks(app *pocketbase.PocketBase) {
	app.OnBootstrap().BindFunc(func(e *core.BootstrapEvent) error {
		if err := e.Next(); err != nil {
			return err
		}

		settings := e.App.Settings()
		settings.SMTP.Enabled = cast.ToBool(os.Getenv("SMTP_ENABLED"))
		settings.SMTP.Host = os.Getenv("SMTP_HOST")
		settings.SMTP.Port = cast.ToInt(os.Getenv("SMTP_PORT"))
		settings.SMTP.Username = os.Getenv("SMTP_USERNAME")
		settings.SMTP.Password = os.Getenv("SMTP_PASSWORD")
		settings.SMTP.TLS = cast.ToBool(os.Getenv("SMTP_TLS"))

		return e.App.Save(settings)
	})

	app.OnSettingsUpdateRequest().BindFunc(func(e *core.SettingsUpdateRequestEvent) error {
		if e.OldSettings.SMTP.Enabled != e.NewSettings.SMTP.Enabled ||
			e.OldSettings.SMTP.Host != e.NewSettings.SMTP.Host ||
			e.OldSettings.SMTP.Port != e.NewSettings.SMTP.Port ||
			e.OldSettings.SMTP.Username != e.NewSettings.SMTP.Username ||
			e.OldSettings.SMTP.Password != e.NewSettings.SMTP.Password ||
			e.OldSettings.SMTP.TLS != e.NewSettings.SMTP.TLS {
			return e.ForbiddenError("Cannot change the SMTP settings", nil)
		}

		return e.Next()
	})
}

func registerEmailTemplates(app *pocketbase.PocketBase) {
	app.OnBootstrap().BindFunc(func(e *core.BootstrapEvent) error {
		if err := e.Next(); err != nil {
			return err
		}

		collection, err := e.App.FindCollectionByNameOrId("_pb_users_auth_")
		if err != nil {
			return err
		}

		collection.OTP.EmailTemplate.Subject = "Gemeenteportaal inloggen"
		collection.OTP.EmailTemplate.Body = otpEmailTemplate

		return e.App.Save(collection)
	})
}

func registerRoutes(app *pocketbase.PocketBase) {
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			publicDir := resolvePublicDir()
			if !e.Router.HasRoute(http.MethodGet, "/{path...}") {
				e.Router.GET("/{path...}", apis.Static(os.DirFS(publicDir), true))
			}

			routes.RegisterSermonImportRoutes(e)
			return e.Next()
		},
		Priority: 999,
	})
}

func registerSecurityHeaders(app *pocketbase.PocketBase) {
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		e.Router.BindFunc(func(re *core.RequestEvent) error {
			re.Response.Header().Set(
				"Content-Security-Policy",
				"frame-ancestors https://pkndubbeldam.nl",
			)
			return re.Next()
		})

		return e.Next()
	})
}

func resolvePublicDir() string {
	publicDir := "./pb_public"
	if _, err := os.Stat(publicDir); err == nil {
		return publicDir
	}

	altPublicDir := filepath.Join("backend", "pb_public")
	if _, err := os.Stat(altPublicDir); err == nil {
		return altPublicDir
	}

	return publicDir
}
