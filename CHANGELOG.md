# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the versioning [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Family tree charts: ancestors (pedigree), descendants, both (hourglass) and the family group,
  with pan and zoom, a generations slider and a "blood relatives only" filter; select a person to
  center the tree on them, open their page or add relatives (#11)
- Arrow keys move between related people in the chart, and every chart is also available as a
  list for screen readers and small screens (#11)

- People list with search, and a person page with life events in date order, parents and
  siblings, partners and children (#9)
- Add parents, partners, children and siblings in any order, as new or existing people; adding
  a married partner creates the marriage event (#9)
- Dialogs to edit people, events (with a live date preview, place search and creation, shared
  participants and fact status) and families; keyboard shortcuts, `?` lists them (#9)

- People with alternate names, families with unknown partners and per-parent child relations,
  events with GEDCOM dates, shared events with roles, a place hierarchy, and disputed or
  disproven facts; name search ignores accents and covers alternate names (#7)
- First-run setup, login and logout; every change is recorded in a change log (#7)

- Single-binary server with embedded web UI, SQLite storage with automatic migrations, a
  health endpoint and a Docker image; the responsive, accessible app shell installs as a
  web app (#5)

- Release script and workflow: `release.sh` cuts a tagged release from the commit history, and
  the release workflow publishes binaries and a Docker image for every tag (#1)
