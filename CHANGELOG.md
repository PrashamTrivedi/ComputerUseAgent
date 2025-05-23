# Changelog

## [v1.2]

### Changed

- Enhanced GitHub Actions workflows:
  - Updated to use dynamic release names for built binaries
  - Added write permissions for nightly and release jobs

## [v1.3] - 2025-01-23

### Added
- **Configurable Models**: Full support for user-selectable Claude models
  - Support for Claude 3.5 Sonnet, 3.7 Sonnet, 4 Sonnet, and 4 Opus
  - Smart planner model selection based on main model choice
  - Conditional thinking capabilities (disabled for 3.5 Sonnet)
  - Multi-model cost tracking with model-specific pricing
  - New settings commands: `--set-model` and `--list-models`
  - Cost warnings for expensive models (4 Opus)
- Enhanced planning functionality with sonnet reasoning capabilities
- VSCode integration improvements with Claude Code instructions
- Development conventions documentation and Copilot integration
- Export functionality with prompt ID-based system

### Changed
- Improved session management with system info integration
- Enhanced session logging capabilities
- Refactored user settings and tool handling system
- Updated dependencies and tool configuration management

### Fixed
- Jina API retry logic for 403 responses with X-No-Cache header

### Latest Changes (since v1.3)

No new changes yet.
