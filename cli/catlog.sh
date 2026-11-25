#!/bin/bash

## Wrapper for cat*log.
# CD to wherever the script is.
#   This dir also has the .env containing the sheet script link
# Run catlog.py with the given arguments

DIR="/bin/cat-log"
cd "$DIR"

exec catlog.py "$@"
