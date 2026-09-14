@echo off
echo ========================================
echo MongoDB Setup for Asthma Wearable App
echo ========================================
echo.

echo Checking if Docker is installed...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed!
    echo.
    echo Please install Docker Desktop from:
    echo https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

echo [OK] Docker is installed
echo.

echo Starting MongoDB with Docker...
echo.

docker run -d --name mongodb -p 27017:27017 mongo:7.0

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo [SUCCESS] MongoDB is now running!
    echo ========================================
    echo.
    echo Connection String:
    echo mongodb://localhost:27017/asthma-wearable
    echo.
    echo Your .env.local is already configured!
    echo.
    echo Next steps:
    echo 1. Run: npm run dev
    echo 2. Open: http://localhost:3000
    echo.
    echo To stop MongoDB: docker stop mongodb
    echo To start MongoDB: docker start mongodb
    echo.
) else (
    echo.
    echo [INFO] Container might already exist. Trying to start it...
    docker start mongodb
    if %errorlevel% equ 0 (
        echo [SUCCESS] MongoDB started!
    ) else (
        echo [ERROR] Failed to start MongoDB
        echo Try: docker rm mongodb
        echo Then run this script again
    )
)

echo.
pause

@REM 
