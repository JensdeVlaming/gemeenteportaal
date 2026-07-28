package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("sermons")
		if err != nil {
			return err
		}

		collection.Fields.Add(&core.TextField{
			Name:     "dutyElder",
			Required: false,
		})

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("sermons")
		if err != nil {
			return err
		}

		collection.Fields.RemoveByName("dutyElder")
		return app.Save(collection)
	})
}
