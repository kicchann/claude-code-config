#!/bin/bash
# SessionStart hook: CLI tools auto-installation for remote environments
# Installs recommended CLI tools for AI-assisted coding:
#   - uv/uvx: Python package manager
#   - jq: JSON processor
#   - rg (ripgrep): Fast text search
#   - fd: Fast file finder
#   - sd: Fast sed alternative
#
# Following best practices: idempotent, fail-safe, proper logging

set -e

LOG_PREFIX="[cli-tools-setup]"

log() {
    echo "$LOG_PREFIX $1" >&2
}

# Only run in remote Claude Code environment
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
    log "Not a remote session, skipping CLI tools setup"
    exit 0
fi

log "Remote session detected, checking CLI tools..."

# Setup local bin directory
LOCAL_BIN="$HOME/.local/bin"
mkdir -p "$LOCAL_BIN"

# Ensure PATH includes local bin
if [[ ":$PATH:" != *":$LOCAL_BIN:"* ]]; then
    export PATH="$LOCAL_BIN:$PATH"
    if [ -n "$CLAUDE_ENV_FILE" ]; then
        echo "export PATH=\"$LOCAL_BIN:\$PATH\"" >> "$CLAUDE_ENV_FILE"
        log "PATH updated in CLAUDE_ENV_FILE"
    fi
fi

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
    x86_64)
        ARCH_SUFFIX="x86_64"
        ARCH_ALT="amd64"
        ;;
    aarch64|arm64)
        ARCH_SUFFIX="aarch64"
        ARCH_ALT="arm64"
        ;;
    *)
        log "Unsupported architecture: $ARCH"
        exit 0
        ;;
esac

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Curl options with proxy support
CURL_OPTS="-fsSL --connect-timeout 30 --max-time 120"
if [ -n "$HTTP_PROXY" ] || [ -n "$HTTPS_PROXY" ]; then
    log "Using proxy: ${HTTPS_PROXY:-$HTTP_PROXY}"
    CURL_OPTS="$CURL_OPTS --proxy ${HTTPS_PROXY:-$HTTP_PROXY}"
fi

# Download with retry logic
download_with_retry() {
    local url="$1"
    local output="$2"
    local name="$3"

    for attempt in 1 2 3; do
        log "$name: Download attempt $attempt/3..."
        if curl $CURL_OPTS "$url" -o "$output"; then
            return 0
        fi
        if [ $attempt -lt 3 ]; then
            sleep_time=$((2 ** attempt))
            log "$name: Download failed, retrying in ${sleep_time}s..."
            sleep $sleep_time
        fi
    done
    return 1
}

# ============================================
# 1. uv (Python package manager)
# ============================================
install_uv() {
    if command -v uv &>/dev/null; then
        log "uv already installed: $(uv --version)"
        return 0
    fi

    log "Installing uv..."

    # uv provides an official installer script
    if curl $CURL_OPTS https://astral.sh/uv/install.sh | sh; then
        # The installer adds to ~/.local/bin by default
        if [ -x "$HOME/.local/bin/uv" ]; then
            log "uv installed successfully: $($HOME/.local/bin/uv --version)"
        fi
    else
        log "Failed to install uv"
    fi
}

# ============================================
# 2. jq (JSON processor)
# ============================================
install_jq() {
    if command -v jq &>/dev/null; then
        log "jq already installed: $(jq --version)"
        return 0
    fi

    log "Installing jq..."

    JQ_VERSION="1.7.1"
    case "$ARCH_SUFFIX" in
        x86_64)
            JQ_URL="https://github.com/jqlang/jq/releases/download/jq-${JQ_VERSION}/jq-linux-amd64"
            ;;
        aarch64)
            JQ_URL="https://github.com/jqlang/jq/releases/download/jq-${JQ_VERSION}/jq-linux-arm64"
            ;;
    esac

    if download_with_retry "$JQ_URL" "$LOCAL_BIN/jq" "jq"; then
        chmod +x "$LOCAL_BIN/jq"
        log "jq installed successfully: $($LOCAL_BIN/jq --version)"
    else
        log "Failed to install jq"
    fi
}

# ============================================
# 3. ripgrep (rg) - Fast text search
# ============================================
install_ripgrep() {
    if command -v rg &>/dev/null; then
        log "ripgrep already installed: $(rg --version | head -1)"
        return 0
    fi

    log "Installing ripgrep..."

    RG_VERSION="14.1.1"
    RG_TARBALL="ripgrep-${RG_VERSION}-${ARCH_SUFFIX}-unknown-linux-musl.tar.gz"
    RG_URL="https://github.com/BurntSushi/ripgrep/releases/download/${RG_VERSION}/${RG_TARBALL}"

    if download_with_retry "$RG_URL" "$TEMP_DIR/$RG_TARBALL" "ripgrep"; then
        tar -xzf "$TEMP_DIR/$RG_TARBALL" -C "$TEMP_DIR"
        mv "$TEMP_DIR/ripgrep-${RG_VERSION}-${ARCH_SUFFIX}-unknown-linux-musl/rg" "$LOCAL_BIN/rg"
        chmod +x "$LOCAL_BIN/rg"
        log "ripgrep installed successfully: $($LOCAL_BIN/rg --version | head -1)"
    else
        log "Failed to install ripgrep"
    fi
}

# ============================================
# 4. fd - Fast file finder
# ============================================
install_fd() {
    if command -v fd &>/dev/null; then
        log "fd already installed: $(fd --version)"
        return 0
    fi

    log "Installing fd..."

    FD_VERSION="10.2.0"
    FD_TARBALL="fd-v${FD_VERSION}-${ARCH_SUFFIX}-unknown-linux-musl.tar.gz"
    FD_URL="https://github.com/sharkdp/fd/releases/download/v${FD_VERSION}/${FD_TARBALL}"

    if download_with_retry "$FD_URL" "$TEMP_DIR/$FD_TARBALL" "fd"; then
        tar -xzf "$TEMP_DIR/$FD_TARBALL" -C "$TEMP_DIR"
        mv "$TEMP_DIR/fd-v${FD_VERSION}-${ARCH_SUFFIX}-unknown-linux-musl/fd" "$LOCAL_BIN/fd"
        chmod +x "$LOCAL_BIN/fd"
        log "fd installed successfully: $($LOCAL_BIN/fd --version)"
    else
        log "Failed to install fd"
    fi
}

# ============================================
# 5. sd - Fast sed alternative
# ============================================
install_sd() {
    if command -v sd &>/dev/null; then
        log "sd already installed: $(sd --version)"
        return 0
    fi

    log "Installing sd..."

    SD_VERSION="1.0.0"
    SD_TARBALL="sd-v${SD_VERSION}-${ARCH_SUFFIX}-unknown-linux-musl.tar.gz"
    SD_URL="https://github.com/chmln/sd/releases/download/v${SD_VERSION}/${SD_TARBALL}"

    if download_with_retry "$SD_URL" "$TEMP_DIR/$SD_TARBALL" "sd"; then
        tar -xzf "$TEMP_DIR/$SD_TARBALL" -C "$TEMP_DIR"
        mv "$TEMP_DIR/sd-v${SD_VERSION}-${ARCH_SUFFIX}-unknown-linux-musl/sd" "$LOCAL_BIN/sd"
        chmod +x "$LOCAL_BIN/sd"
        log "sd installed successfully: $($LOCAL_BIN/sd --version)"
    else
        log "Failed to install sd"
    fi
}

# ============================================
# Run installations
# ============================================
log "Starting CLI tools installation..."

install_uv
install_jq
install_ripgrep
install_fd
install_sd

log "CLI tools setup complete"
exit 0
