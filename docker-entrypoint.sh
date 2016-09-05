#!/bin/bash
set -e

if [ -z "$API_KEY" ]; then
    echo "API_KEY environment variable required"
    exit 1
fi

if [ -z "$MONGODB_CONNECTION" ]; then
    echo "MONGODB_CONNECTION environment variable required"
    exit 1
fi

# execute nodejs application
exec npm start
