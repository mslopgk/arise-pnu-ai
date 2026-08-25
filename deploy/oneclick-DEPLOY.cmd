@echo off
chcp 65001 >nul 2>&1
setlocal
cd /d "%~dp0"
title ARISE AI대학 배포

rem Git for Windows 의 bash 를 찾는다.
rem  - 설치 형태에 따라 bin\bash.exe 가 없고 usr\bin\bash.exe 만 있는 경우가 있다.
rem  - WSL 의 C:\Windows\System32\bash.exe 는 경로 규칙이 달라 쓸 수 없으므로 제외한다.
set "BASH="
if exist "%ProgramFiles%\Git\bin\bash.exe" set "BASH=%ProgramFiles%\Git\bin\bash.exe"
if not defined BASH if exist "%ProgramFiles%\Git\usr\bin\bash.exe" set "BASH=%ProgramFiles%\Git\usr\bin\bash.exe"
if not defined BASH if exist "%ProgramFiles(x86)%\Git\bin\bash.exe" set "BASH=%ProgramFiles(x86)%\Git\bin\bash.exe"
if not defined BASH if exist "%ProgramFiles(x86)%\Git\usr\bin\bash.exe" set "BASH=%ProgramFiles(x86)%\Git\usr\bin\bash.exe"
if not defined BASH if exist "%LocalAppData%\Programs\Git\bin\bash.exe" set "BASH=%LocalAppData%\Programs\Git\bin\bash.exe"
if not defined BASH if exist "%LocalAppData%\Programs\Git\usr\bin\bash.exe" set "BASH=%LocalAppData%\Programs\Git\usr\bin\bash.exe"
if not defined BASH if exist "%SystemDrive%\Git\bin\bash.exe" set "BASH=%SystemDrive%\Git\bin\bash.exe"
if not defined BASH if exist "%SystemDrive%\Git\usr\bin\bash.exe" set "BASH=%SystemDrive%\Git\usr\bin\bash.exe"

if not defined BASH (
  echo.
  echo   Git for Windows 의 bash 를 찾을 수 없습니다.
  echo   설치: https://git-scm.com/download/win
  echo   ^(WSL 의 bash 는 경로 규칙이 달라 사용할 수 없습니다^)
  echo.
  pause
  exit /b 1
)

echo   bash : %BASH%
"%BASH%" deploy.sh %*
set "RC=%ERRORLEVEL%"
echo.
if "%RC%"=="0" (echo   === 정상 종료 ===) else (echo   === 오류 종료 ^(코드 %RC%^) ===)
if defined PNUG_NOPAUSE exit /b %RC%
echo   창을 닫으려면 아무 키나 누르세요.
pause >nul
exit /b %RC%
