# Installing jread

`jread` is a Go CLI tool. Install via one of these methods.

## Method 1: Build from Source (Recommended)

Requirements: Go 1.21+

```bash
# Check Go is installed
go version

# Clone the just-read repository (contains jread source)
git clone https://github.com/aiocean/just-read ~/tools/just-read

# Build
cd ~/tools/just-read/server
go build -o ~/bin/jread ./cmd/jread/

# Verify
jread --help  # or just: jread
```

If `~/bin` is not in your PATH:
```bash
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
# or for fish shell:
fish_add_path ~/bin
```

## Method 2: Build from Local Copy

If you already have the just-read repository:

```bash
cd /path/to/just-read/server
go build -o /usr/local/bin/jread ./cmd/jread/
```

## Verify Installation

```bash
jread
# Should print: Usage: jread <command> [args]
# Commands: unpack, pack, info, mark, list, get, set, stats, clear
```

## Troubleshooting

**"go: command not found"**
Install Go from https://go.dev/dl/ or via Homebrew: `brew install go`

**"permission denied"**
```bash
chmod +x ~/bin/jread
```

**Build errors about missing modules**
```bash
cd ~/tools/just-read/server
go mod tidy
go build -o ~/bin/jread ./cmd/jread/
```

**"jread: command not found" after building**
The binary exists but isn't in PATH. Either move it to `/usr/local/bin/` or add its directory to PATH.

## Keeping jread Updated

```bash
cd ~/tools/just-read
git pull
cd claude-skill
go build -o ~/bin/jread ./cmd/jread/
```
