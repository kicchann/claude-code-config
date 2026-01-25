#!/usr/bin/env python3
"""
Multi-language formatter/linter for Claude Code PostToolUse hook.
Runs appropriate linter/formatter based on file extension.
"""
import json
import sys
import re
import os
import subprocess
import shutil

# File extension to linter/formatter mapping
# Each entry: extension -> list of (command, args) to try in order
FORMATTERS = {
    # Python
    '.py': [
        ('ruff', ['format', '{file}']),
        ('black', ['{file}']),
    ],
    '.pyi': [
        ('ruff', ['format', '{file}']),
        ('black', ['{file}']),
    ],

    # JavaScript/TypeScript
    '.js': [
        ('prettier', ['--write', '{file}']),
        ('eslint', ['--fix', '{file}']),
    ],
    '.jsx': [
        ('prettier', ['--write', '{file}']),
        ('eslint', ['--fix', '{file}']),
    ],
    '.ts': [
        ('prettier', ['--write', '{file}']),
        ('eslint', ['--fix', '{file}']),
    ],
    '.tsx': [
        ('prettier', ['--write', '{file}']),
        ('eslint', ['--fix', '{file}']),
    ],
    '.mjs': [
        ('prettier', ['--write', '{file}']),
    ],
    '.cjs': [
        ('prettier', ['--write', '{file}']),
    ],

    # JSON/YAML/Config
    '.json': [
        ('prettier', ['--write', '{file}']),
    ],
    '.yaml': [
        ('prettier', ['--write', '{file}']),
    ],
    '.yml': [
        ('prettier', ['--write', '{file}']),
    ],

    # Shell
    '.sh': [
        ('shfmt', ['-i', '2', '-w', '{file}']),
    ],
    '.bash': [
        ('shfmt', ['-i', '2', '-w', '{file}']),
    ],

    # Go
    '.go': [
        ('gofmt', ['-w', '{file}']),
        ('goimports', ['-w', '{file}']),
    ],

    # Rust
    '.rs': [
        ('rustfmt', ['{file}']),
    ],

    # CSS/SCSS
    '.css': [
        ('prettier', ['--write', '{file}']),
    ],
    '.scss': [
        ('prettier', ['--write', '{file}']),
    ],
    '.less': [
        ('prettier', ['--write', '{file}']),
    ],

    # HTML
    '.html': [
        ('prettier', ['--write', '{file}']),
    ],
    '.htm': [
        ('prettier', ['--write', '{file}']),
    ],

    # Markdown (use built-in formatter)
    '.md': [('__markdown__', [])],
    '.mdx': [('__markdown__', [])],
}


def detect_language(code: str) -> str:
    """Best-effort language detection from code content."""
    s = code.strip()

    # JSON detection
    if re.search(r'^\s*[{\[]', s):
        try:
            json.loads(s)
            return 'json'
        except:
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
    # Fix unlabeled code fences
    def add_lang_to_fence(match):
        indent, info, body, closing = match.groups()
        if not info.strip():
            lang = detect_language(body)
            return f"{indent}```{lang}\n{body}{closing}\n"
        return match.group(0)

    fence_pattern = r'(?ms)^([ \t]{0,3})```([^\n]*)\n(.*?)(\n\1```)\s*$'
    content = re.sub(fence_pattern, add_lang_to_fence, content)

    # Fix excessive blank lines (only outside code fences)
    content = re.sub(r'\n{3,}', '\n\n', content)

    return content.rstrip() + '\n'


def run_formatter(cmd: str, args: list, file_path: str) -> bool:
    """Run a formatter command. Returns True if successful."""
    # Check if command exists
    if not shutil.which(cmd):
        return False

    # Replace {file} placeholder with actual path
    resolved_args = [arg.replace('{file}', file_path) for arg in args]

    try:
        result = subprocess.run(
            [cmd] + resolved_args,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, subprocess.SubprocessError):
        return False


def format_file(file_path: str) -> tuple[bool, str]:
    """
    Format a file based on its extension.
    Returns (success, message).
    """
    if not os.path.exists(file_path):
        return False, f"File not found: {file_path}"

    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    if ext not in FORMATTERS:
        return True, ""  # No formatter configured, skip silently

    formatters = FORMATTERS[ext]

    for cmd, args in formatters:
        # Special case: built-in markdown formatter
        if cmd == '__markdown__':
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
        if run_formatter(cmd, args, file_path):
            return True, f"Formatted with {cmd}: {file_path}"

    # No formatter available/succeeded
    return True, ""  # Not an error, just no formatter found


def main():
    try:
        input_data = json.load(sys.stdin)
        file_path = input_data.get('tool_input', {}).get('file_path', '')

        if not file_path:
            sys.exit(0)

        success, message = format_file(file_path)

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
