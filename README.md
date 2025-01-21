# ComputerUseAgent

A sophisticated Deno-based CLI tool that provides AI-powered file editing and bash command execution capabilities using Claude 3 API.

## Features

- **Dual Mode Operation**:
  - Editor mode for AI-assisted text file manipulation
  - Bash mode for intelligent command execution
- **Memory Management**
- **Comprehensive Logging**
- **Token Usage Tracking**
- **Cost Calculation**

  
## Demo



https://github.com/user-attachments/assets/62a67ddb-d94f-4a83-8f50-d63ebe4f4c49

This is a trimmed demo, Watch full demo on [Youtube](https://youtu.be/lX_jZ18HoGA)

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
```

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

- [`src/config/constants.ts`](src/config/constants.ts): System-wide constants and API settings
- [`src/config/logging.ts`](src/config/logging.ts): Logging configuration
- [`deno.json`](deno.json): Deno project configuration

## Development

```sh
# Run in development mode with file watching
deno task dev

# Build for local use
deno task buildLocal
```

## Logging

Logs are stored in `app.log` with both console and file output. The logging system tracks:
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
