# ComputerUseAgent

[![Nightly Build](https://github.com/yourusername/ComputerUseAgent/actions/workflows/nightly.yml/badge.svg)](https://github.com/yourusername/ComputerUseAgent/actions/workflows/nightly.yml)

A sophisticated Deno-based CLI tool that provides AI-powered file editing and
bash command execution capabilities using Claude API with configurable model selection.

## Features

- **Dual Mode Operation**:
  - Editor mode for AI-assisted text file manipulation
  - Bash mode for intelligent command execution
  - Hybrid mode for combined capabilities
- **Configurable AI Models**:
  - Support for multiple Claude models (3.5 Sonnet, 3.7 Sonnet, 4 Sonnet, 4 Opus)
  - Smart planner model selection based on main model choice
  - Model-specific cost tracking and pricing
  - Dynamic tool version selection based on selected model
  - Automatic beta header configuration for optimal compatibility
  - Easy model switching via settings commands
- **Enhanced Export System**:
  - Prompt ID-based export functionality
  - Dedicated export paths
  - Rich session data export
  - Comprehensive session logging
- **Improved User Management**:
  - Streamlined settings management
  - Enhanced session handling
  - Efficient tool configuration
- **Memory Management**
- **Comprehensive Logging**
  - Text response content tracking
  - Debug logging for history entries
  - Multi-model token usage tracking
- **Advanced Cost Calculation**
  - Model-specific pricing
  - Per-model cost breakdown
  - Cost warnings for expensive models
- **History Management** with database integration
- **Clipboard Management** with cross-platform support
- **Tool Configuration Management**
- **User Settings Management**
- **Jina API Integration** for enhanced search capabilities

## Demo

https://github.com/user-attachments/assets/62a67ddb-d94f-4a83-8f50-d63ebe4f4c49

This is a trimmed demo, Watch full demo on
[Youtube](https://youtu.be/lX_jZ18HoGA)

## Prerequisites

- [Deno](https://deno.land/) installed
- [Anthropic API Key](https://www.anthropic.com/api)

## Setup

1. Clone the repository:

```sh
git clone <repository-url>
cd ComputerUseAgent
```

2. Set up your environment:

```sh
# Set your Anthropic API key
export ANTHROPIC_API_KEY="your-api-key"
```

3. Build the project:

```sh
deno task build
```

## Usage

### Direct Execution

```sh
# Editor mode
deno run -A src/main.ts --mode=editor "your prompt"

# Bash mode
deno run -A src/main.ts --mode=bash "your command"

# Bash mode with mock execution
deno run -A src/main.ts --mode=bash --no-agi "your command"
```

### Using Built Binary

```sh
# After building
./build/ComputerUseAgent --mode=editor "your prompt"
./build/ComputerUseAgent --mode=bash "your command"
./build/ComputerUseAgent --export "prompt-id" # Export session data
```

### Model Configuration

Configure which Claude model to use for AI operations:

```sh
# Set model to Claude 4 Sonnet
deno run -A src/main.ts settings --set-model "4-sonnet"

# List available models
deno run -A src/main.ts settings --list-models

# View current settings including selected model
deno run -A src/main.ts settings --list
```

**Available Models:**
- `3.5-sonnet` - Claude 3.5 Sonnet (Default, most cost-effective)
- `3.7-sonnet` - Claude 3.7 Sonnet (Enhanced reasoning capabilities)
- `4-sonnet` - Claude 4 Sonnet (Latest generation)
- `4-opus` - Claude 4 Opus (Most capable, higher cost)

**Smart Features:**
- Automatic planner model selection based on your chosen model
- Model-specific cost tracking and warnings
- Thinking capabilities automatically enabled for supported models
- Dynamic tool version selection ensuring compatibility with each model
- Automatic beta header configuration for optimal API compatibility

## Project Structure

- `src/`: Source code directory
  - `config/`: Configuration files
  - `modules/`: Core functionality modules
    - `bash/`: Bash command execution
    - `editor/`: Text editor operations
    - `memory/`: Memory management
  - `types/`: TypeScript interfaces
  - `utils/`: Utility functions

## Configuration

Key configuration files:

- [`src/config/constants.ts`](src/config/constants.ts): System-wide constants
  and API settings
- [`src/config/logging.ts`](src/config/logging.ts): Logging configuration
- [`src/config/tool_config.ts`](src/config/tool_config.ts): Tool configuration
- [`deno.json`](deno.json): Deno project configuration

## Documentation

- See [CHANGELOG.md](CHANGELOG.md) for detailed version history and latest changes
- [CONVENTIONS.md](CONVENTIONS.md) for development patterns and best practices

## Development

```sh
# Run in development mode with file watching
deno task dev

# Build for local use
deno task buildLocal
```

## Logging

Logs are stored in `app.log` with both console and file output. The logging
system tracks:

- User inputs
- API usage
- Command execution
- Errors
- Token usage and costs

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

See [LICENSE](LICENSE) file.

## Releases

### Installation

You can download pre-built binaries for your platform from:

- Latest stable release:
  [Releases page](https://github.com/PrashamTrivedi/ComputerUseAgent/releases/latest)
- Nightly builds:
  [Nightly Release](https://github.com/PrashamTrivedi/ComputerUseAgent/releases/tag/nightly)

Binaries are automatically built for Windows, Linux, and macOS.
