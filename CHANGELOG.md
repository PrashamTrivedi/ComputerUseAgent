# Changelog

## [Unreleased]

### Added
- Automated build system with GitHub Actions:
  - Nightly builds on every push to main branch
  - Version releases on every tag push
  - Cross-platform binary builds (Windows, Linux, macOS)
- Enhanced logging system with text response content tracking in HybridSession
- Tool configuration management and validation
- User settings management with synchronous file operations
- Jina API integration for page reading and searching capabilities
- History management feature with database integration
- Clipboard management with cross-platform read functionality
- Debug logging for history entry viewing

### Changed
- Promoted hybrid tool from beta to main status
- Improved session management architecture
- Enhanced settings handling system

### Latest Changes (by commit)
- 1ed1b0c - Add logging for text response content in HybridSession and clean up code
- 9e0af9e - Enhance logging and user settings management
- 9f04f30 - Add tool configuration management and session handling integration
- 0377ff1 - Add Jina API integration with fetch utility functions
- f24caf5 - Refactor session management and improve settings handling
- 943b0d5 - Add user settings management
- 785402f - Add debug logging for viewing history
- bec3ab3 - Implement history management feature
- c9babff - Promoted hybrid tool as main instead of beta
- e952464 - Add clipboard management capabilities