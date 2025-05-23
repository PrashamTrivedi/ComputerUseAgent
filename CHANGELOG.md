# Changelog

## [v1.2]

### Changed

- Enhanced GitHub Actions workflows:
  - Updated to use dynamic release names for built binaries
  - Added write permissions for nightly and release jobs

### Latest Changes (since v1.2)

- **Configurable Models**: Added support for user-selectable Claude models
  - Support for Claude 3.5 Sonnet, 3.7 Sonnet, 4 Sonnet, and 4 Opus
  - Smart planner model selection based on main model choice
  - Conditional thinking capabilities (disabled for 3.5 Sonnet)
  - Multi-model cost tracking with model-specific pricing
  - New settings commands: `--set-model` and `--list-models`
  - Cost warnings for expensive models (4 Opus)
- Added new export functionality with prompt ID-based system
- Enhanced session logging capabilities
- Refactored user settings management for improved efficiency
- Enhanced tool handling system
- Improved session management
