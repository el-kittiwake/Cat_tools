@echo off
rem Launcher for catlog.py on Windows.
rem Keep this file in the same folder as catlog.py and .env, or point
setlocal
set "CATLOG_DIR=%~dp0"
where py >nul 2>nul
if errorlevel 1 goto usepython
py "%CATLOG_DIR%catlog.py" %*
exit /b %errorlevel%
:usepython
python "%CATLOG_DIR%catlog.py" %*
exit /b %errorlevel%
