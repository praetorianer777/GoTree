# GoTree

A lightweight, self-hosted family tree app. One Go binary with an embedded React UI and a single
SQLite file — no database server, no cloud account.

**Status:** early development.

## Planned features

- People, families, events, places, sources and citations
- Photos and documents attached to people and events
- Pedigree, descendant, hourglass and family-group views with pan & zoom
- GEDCOM 5.5.1 import and export
- Relationship calculator ("how is A related to B?")
- Single user today, data model ready for multiple users and trees

## Stack

- Backend: Go, chi, SQLite (`modernc.org/sqlite`, no CGO), goose, sqlc
- Frontend: React, TypeScript, Vite, Tailwind CSS, d3-hierarchy
- Deployment: single binary (`go:embed`) or Docker image

## Development

Requires Go and Node.js (LTS). `./run-tests.sh` runs the full suite; it is the same gate the
pre-push hook and CI use.

## License

[AGPL-3.0](LICENSE)
