#!/bin/bash

# Install dependencies
npm install glob fs-extra

# Run the test generator script
node test_generator_updated.js

echo "Test files generated successfully in ui/complete_tests directory"
