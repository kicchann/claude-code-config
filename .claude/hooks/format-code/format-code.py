#!/usr/bin/env python3
"""
Multi-language formatter/linter for Claude Code PostToolUse hook.
Runs appropriate linter/formatter based on file extension.
Configuration is loaded from settings.json in the same directory.
"""
import json
import sys
import re
import os
import subprocess
import shutil
from pathlib import Path

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent.resolve()
SETTINGS_FILE = SCRIPT_DIR / "settings.json"


def load_settings() -> dict:
    """Load formatter settings from settings.json."""
    if not SETTINGS_FILE.exists():
        return {"formatters": []}

    with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def validate_formatter_entry(entry: dict, index: int) -> list[str]:
    """
    Validate a single formatter entry.
    Returns list of error messages (empty if valid).
    """
    errors = []

    if not isinstance(entry, dict):
        errors.append(f"Formatter [{index}]: must be an object")
        return errors

    extensions = entry.get("extensions")
    if extensions is None:
        errors.append(f"Formatter [{index}]: missing 'extensions' field")
    elif not isinstance(extensions, list):
        errors.append(f"Formatter [{index}]: 'extensions' must be a list")
    elif not all(isinstance(ext, str) for ext in extensions):
        errors.append(f"Formatter [{index}]: all extensions must be strings")

    commands = entry.get("commands")
    if commands is None:
        errors.append(f"Formatter [{index}]: missing 'commands' field")
    elif not isinstance(commands, list):
        errors.append(f"Formatter [{index}]: 'commands' must be a list")
    elif not all(isinstance(cmd, list) for cmd in commands):
        errors.append(f"Formatter [{index}]: each command must be a list")

    return errors


def build_formatter_map(settings: dict) -> dict:
    """
    Build a mapping from file extension to list of commands.
    Returns: {'.py': [['ruff', 'format', '{file}'], ['black', '{file}']], ...}
    Only includes formatters where enabled is true (default: true).
    Merges commands if same extension appears multiple times.
    """
    formatter_map = {}
    for i, entry in enumerate(settings.get("formatters", [])):
        # Validate entry
        errors = validate_formatter_entry(entry, i)
        if errors:
            for err in errors:
                print(f"Warning: {err}", file=sys.stderr)
            continue

        # Skip disabled formatters (enabled defaults to true)
        if not entry.get("enabled", True):
            continue

        extensions = entry.get("extensions", [])
        commands = entry.get("commands", [])

        for ext in extensions:
            ext_lower = ext.lower()
            if ext_lower in formatter_map:
                # Merge commands for duplicate extensions
                formatter_map[ext_lower].extend(commands)
            else:
                formatter_map[ext_lower] = list(commands)

    return formatter_map


def detect_language(code: str) -> str:
    """Best-effort language detection from code content."""
    s = code.strip()

    # JSON detection
    if re.search(r'^\s*[{\[]', s):
        try:
            json.loads(s)
            return 'json'
        except json.JSONDecodeError:
            pass

    # Python detection
    if re.search(r'^\s*def\s+\w+\s*\(', s, re.M) or \
       re.search(r'^\s*(import|from)\s+\w+', s, re.M):
        return 'python'

    # JavaScript detection
    if re.search(r'\b(function\s+\w+\s*\(|const\s+\w+\s*=)', s) or \
       re.search(r'=>|console\.(log|error)', s):
        return 'javascript'

    # TypeScript detection
    if re.search(r':\s*(string|number|boolean|any)\b', s) or \
       re.search(r'\binterface\s+\w+', s):
        return 'typescript'

    # Bash detection
    if re.search(r'^#!.*\b(bash|sh)\b', s, re.M) or \
       re.search(r'\b(if|then|fi|for|in|do|done)\b', s):
        return 'bash'

    # SQL detection
    if re.search(r'\b(SELECT|INSERT|UPDATE|DELETE|CREATE)\s+', s, re.I):
        return 'sql'

    # YAML detection
    if re.search(r'^\s*[\w-]+:\s*[\w\-\.\"\'\[\{]', s, re.M):
        return 'yaml'

    return 'text'


def format_markdown(content: str) -> str:
    """Format markdown content with language detection."""
    # Pattern for matching code fences (with optional trailing whitespace for replacement)
    fence_pattern = r'(?ms)^([ \t]{0,3})```([^\n]*)\n(.*?)(\n\1```)'

    # Fix unlabeled code fences
    def add_lang_to_fence(match):
        indent, info, body, closing = match.groups()
        if not info.strip():
            lang = detect_language(body)
            return f"{indent}```{lang}\n{body}{closing}"
        return match.group(0)

    content = re.sub(fence_pattern, add_lang_to_fence, content)

    # Fix excessive blank lines ONLY outside code fences
    # Split content by code fences and process only non-fence parts
    parts = []
    last_end = 0
    for match in re.finditer(fence_pattern, content):
        # Process text before this fence
        before_fence = content[last_end:match.start()]
        before_fence = re.sub(r'\n{3,}', '\n\n', before_fence)
        parts.append(before_fence)
        # Keep fence as-is
        parts.append(match.group(0))
        last_end = match.end()

    # Process remaining text after last fence
    after_last = content[last_end:]
    after_last = re.sub(r'\n{3,}', '\n\n', after_last)
    parts.append(after_last)

    content = ''.join(parts)

    return content.rstrip() + '\n'


def run_formatter(cmd_args: list, file_path: str) -> bool:
    """
    Run a formatter command.
    cmd_args: ['ruff', 'format', '{file}'] or similar
    Returns True if successful.
    """
    if not cmd_args:
        return False

    cmd = cmd_args[0]

    # Check if command exists
    if not shutil.which(cmd):
        return False

    # Replace {file} placeholder with actual path
    resolved_args = [arg.replace('{file}', file_path) for arg in cmd_args]

    try:
        result = subprocess.run(
            resolved_args,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, subprocess.SubprocessError):
        return False


def format_file(file_path: str, formatter_map: dict) -> tuple[bool, str]:
    """
    Format a file based on its extension.
    Returns (success, message).
    """
    if not os.path.exists(file_path):
        return False, f"File not found: {file_path}"

    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    if ext not in formatter_map:
        return True, ""  # No formatter configured, skip silently

    commands = formatter_map[ext]

    for cmd_args in commands:
        if not cmd_args:
            continue

        # Special case: built-in markdown formatter
        if cmd_args[0] == '__markdown__':
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                formatted = format_markdown(content)

                if formatted != content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(formatted)
                    return True, f"Formatted markdown: {file_path}"
                return True, ""
            except Exception as e:
                return False, f"Markdown format error: {e}"

        # Try external formatter
        if run_formatter(cmd_args, file_path):
            return True, f"Formatted with {cmd_args[0]}: {file_path}"

    # No formatter available/succeeded
    return True, ""  # Not an error, just no formatter found


def main():
    try:
        input_data = json.load(sys.stdin)
        file_path = input_data.get('tool_input', {}).get('file_path', '')

        if not file_path:
            sys.exit(0)

        # Load settings and build formatter map
        settings = load_settings()
        formatter_map = build_formatter_map(settings)

        success, message = format_file(file_path, formatter_map)

        if message:
            print(message)

        sys.exit(0 if success else 1)

    except json.JSONDecodeError:
        print("Error: Invalid JSON input", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
