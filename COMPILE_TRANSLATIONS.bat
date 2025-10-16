@echo off
echo ========================================
echo  FIX GERMAN TRANSLATIONS - AUTO SCRIPT
echo ========================================
echo.
echo This script will:
echo 1. Navigate to catalystv1 directory
echo 2. Compile the fixed translations
echo 3. Show you the results
echo.
pause

cd /d "%~dp0"

echo.
echo Compiling translations...
echo.

call npx @lingui/cli compile

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo  SUCCESS! Translations compiled!
    echo ========================================
    echo.
    echo Now do these steps:
    echo 1. Open your browser
    echo 2. Press F12 to open console
    echo 3. Type: localStorage.clear()
    echo 4. Refresh the page
    echo 5. All text should now be in English!
    echo.
) else (
    echo.
    echo ========================================
    echo  ERROR! Compilation failed
    echo ========================================
    echo.
    echo Try running manually:
    echo   cd catalystv1
    echo   npx @lingui/cli compile
    echo.
)

pause

