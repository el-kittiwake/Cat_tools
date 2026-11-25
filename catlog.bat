@echo off
rem Launcher for catlog.py on Windows.
rem Keep this file in the same folder as catlog.py and .env, or point
rem CATLOG_DIR at that folder (the path must end with a backslash).
setlocal
set "CATLOG_DIR=%~dp0"
where py >nul 2>nul
if errorlevel 1 goto usepython
py "%CATLOG_DIR%catlog.py" %*
exit /b %errorlevel%
:usepython
python "%CATLOG_DIR%catlog.py" %*
exit /b %errorlevel%
