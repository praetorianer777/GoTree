# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the versioning [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Single-binary server with embedded web UI, SQLite storage with automatic migrations, a
  health endpoint and a Docker image; the responsive, accessible app shell installs as a
  web app (#5)

- Release script and workflow: `release.sh` cuts a tagged release from the commit history, and
  the release workflow publishes binaries and a Docker image for every tag (#1)
