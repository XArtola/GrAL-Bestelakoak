@echo off
echo Installing dependencies...
call npm install

echo Running AST processor...
node ast_processor.js

echo Done!
pause
