# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the versioning [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Calendar of birthdays, wedding anniversaries and remembrance days to subscribe to in any
  calendar app, through a secret address that can be withdrawn; living people only when chosen
  (#25)

- Share links: the owner creates read-only links for relatives without an account, for the whole
  tree or one branch, leaving living people out or showing them by name only, optionally until a
  date; visitors browse people and the tree, and a link can be withdrawn at any time. “On this
  day” lists births, marriages and deaths of deceased relatives on today's date, on the home page
  and in the shared view (#24)

- Backup: administrators download the database (a consistent snapshot taken while GoTree runs)
  and all photos and documents as one zip, with restore instructions inside; light, dark or
  system theme, chosen in the header and remembered per browser (#23)

- Data quality: GoTree checks the tree for dates that contradict each other (born after death,
  parents too young or too old, events after a burial, marriages outside a lifetime) and for dates
  it cannot read, on a data quality page and on each person's page; vague dates only count when
  every reading of them is impossible. “Tidy up dates” rewrites dates such as “12.3.1850”,
  “ca. 1850” or “March 12, 1850” in standard GEDCOM form after a preview where each row can be
  left out. The relationship calculator names how two people are related (cousins with removals,
  half and step relations, in-laws, pedigree collapse) and shows the line connecting them (#21)

- GEDCOM export as 5.5.1 or 7.0, optionally zipped with all photos and documents, with everyone,
  living people by name only, or without living people; everything an import could not use is
  written back, and “Check the export” reads the file back to show that nothing was lost (#19)

- GEDCOM import (5.5, 5.5.1 and 7.0, also zipped) from Ancestry, MyHeritage, FamilySearch,
  webtrees, Gramps or RootsMagic, in UTF-8, UTF-16, ANSI or ANSEL; a report shows what was imported,
  kept unchanged for the export, or dropped, and lists dates and references that need attention
  (#17)

- Photos, documents and recordings: upload them to people (stored once even when uploaded twice),
  view, describe and transcribe them, tag faces by drawing a box or import the face tags other
  photo tools wrote, and use a photo or a face as a person's portrait, shown in lists and on the
  tree (#15)

### Fixed

- A data directory whose path contains `#` or `?` no longer opens the wrong database file (#19)

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
