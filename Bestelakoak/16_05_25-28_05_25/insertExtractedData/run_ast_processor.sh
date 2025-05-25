#!/bin/bash

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Run the AST processor
echo "Running AST processor..."
node ast_processor.js

echo "Done!"
