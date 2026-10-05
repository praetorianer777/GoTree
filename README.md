# GoTree

A lightweight, self-hosted family tree app. One Go binary with an embedded React UI and a single
SQLite file — no database server, no cloud account.

**Status:** early development.

## Planned features

- People, families, events, places, sources and citations
- Photos and documents attached to people and events
- Pedigree, descendant, hourglass and family-group views with pan & zoom
- GEDCOM 5.5.1 and 7.0 import and export
- Relationship calculator ("how is A related to B?")
- Single user today, data model ready for multiple users and trees

## Stack

- Backend: Go, chi, SQLite (`modernc.org/sqlite`, no CGO), goose, sqlc
- Frontend: React, TypeScript, Vite, Tailwind CSS, React Flow
- Deployment: single binary (`go:embed`) or Docker image (`ghcr.io/praetorianer777/gotree`)

## Development

Requires Go and Node.js (LTS). `./run-tests.sh` runs the full suite; it is the same gate the
pre-push hook and CI use.

## Releasing

`./release.sh` derives the next version from the Conventional Commits since the last tag, moves
the `[Unreleased]` section of `CHANGELOG.md` into the release, updates `VERSION`, commits and
tags. `./release.sh --dry-run` shows what it would do. Pushing the tag
(`git push origin main --follow-tags`) triggers the release workflow, which publishes binaries
for Linux, macOS and Windows and a multi-arch Docker image.

## License

[AGPL-3.0](LICENSE)
