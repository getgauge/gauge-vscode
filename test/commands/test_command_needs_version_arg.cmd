@echo off
if not "%1" == "--version" (
    echo Error: --version argument is required
    exit /b 1
)
echo Success: %1