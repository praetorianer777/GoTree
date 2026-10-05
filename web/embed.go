// Package web embeds the built frontend into the binary.
package web

import (
	"embed"
	"io/fs"
)

// web/dist holds a committed .gitkeep so this compiles before the first
// frontend build; the server reports a missing index.html instead.
//
//go:embed all:dist
var dist embed.FS

// Dist returns the built frontend rooted at its output directory.
func Dist() fs.FS {
	sub, err := fs.Sub(dist, "dist")
	if err != nil {
		panic(err)
	}
	return sub
}
