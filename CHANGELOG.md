# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the versioning [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Photos, documents and recordings: upload them to people (stored once even when uploaded twice),
  view, describe and transcribe them, tag faces by drawing a box or import the face tags other
  photo tools wrote, and use a photo or a face as a person's portrait, shown in lists and on the
  tree (#15)

### Changed

- A new version of GoTree no longer reloads open pages by itself; a notice offers to reload, so
  nothing being typed or uploaded is lost (#15)

- Sources and archives: record where facts come from, cite a source with page and reliability
  on events, people and relationships, and see on each source what it supports (#13)

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
