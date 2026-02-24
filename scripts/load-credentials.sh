#!/bin/bash
# Load credentials from .credentials file as environment variables
# Usage: source scripts/load-credentials.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREDENTIALS_FILE="$SCRIPT_DIR/../.credentials"

if [ -f "$CREDENTIALS_FILE" ]; then
    set -a
    source "$CREDENTIALS_FILE"
    set +a
    echo "Credentials loaded from .credentials"
else
    echo "Error: .credentials file not found at $CREDENTIALS_FILE"
    exit 1
fi