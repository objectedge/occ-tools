@echo off
setlocal enableExtensions

rem for 64 bit systems
START /W REGEDIT /E "%Temp%\BROW3.reg" HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Clients\StartMenuInternet
rem for 32 bit systems
if not exist "%Temp%\BROW3.reg" START /W REGEDIT /E "%Temp%\BROW3.reg" HKEY_LOCAL_MACHINE\SOFTWARE\Clients\StartMenuInternet

setLocal enableDelayedExpansion
for /f "tokens=* delims=@=" %%B in ('type "%Temp%\BROW3.reg" ^| findstr /B "@" ^| findstr /E ".exe\\\",0\"^"') do (
  set "browser=%%~B"
  set "browser=!browser:\\=\!"
  echo !browser!

)
setLocal enableDelayedExpansion
for /f "tokens=* delims=@=" %%B in ('type "%Temp%\BROW3.reg" ^| findstr /B "@" ^| findstr /E ".exe,0\"^"') do (
  set "browser=%%~B"
  set "browser=!browser:\\=\!"
  set "browser=!browser:,0=!"
  echo !browser!

)
endLocal

rem delete temp file
del /Q /F "%Temp%\BROW3.reg"

