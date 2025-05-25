# Install dependencies
Write-Host "Installing dependencies..."
npm install glob fs-extra

# Run the test generator script
Write-Host "Running test generator..."
node test_generator_updated.js

Write-Host "Test files generated successfully in ui/complete_tests directory"
