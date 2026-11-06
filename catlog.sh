#!/bin/bash

## Wrapper for cat*log.
# CD to wherever the script is.
#   This dir also has the .env containing the sheet script link
# Export the environment variables
# Run catlog.py with the given arguments

DIR="/bin/cat-log"
cd "$DIR"

source .env

exec catlog.py "$@"
