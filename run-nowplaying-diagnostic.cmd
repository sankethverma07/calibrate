@echo off
REM Runs the Now Playing detector once and saves output to a file.
REM Double-click this from File Explorer.

setlocal
set "SCRIPT=%~dp0electron\src\nowplaying.ps1"
set "OUT=%~dp0nowplaying-output.txt"

echo === Calibrate Now Playing diagnostic === > "%OUT%"
echo Generated: %DATE% %TIME% >> "%OUT%"
echo Script: %SCRIPT% >> "%OUT%"
echo. >> "%OUT%"

REM Try Windows PowerShell 5.1 with -Sta (the proper way for WinRT)
echo --- Run #1: powershell -Sta -File --- >> "%OUT%"
powershell -NoProfile -Sta -ExecutionPolicy Bypass -File "%SCRIPT%" >> "%OUT%" 2>&1
echo. >> "%OUT%"

REM Try again without -Sta to see if STA matters here
echo --- Run #2: powershell (no -Sta) --- >> "%OUT%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" >> "%OUT%" 2>&1
echo. >> "%OUT%"

REM PowerShell version check
echo --- PowerShell version --- >> "%OUT%"
powershell -NoProfile -Command "$PSVersionTable | Out-String" >> "%OUT%" 2>&1
echo. >> "%OUT%"

REM List ALL SMTC sessions with detail
echo --- Detailed session enumeration --- >> "%OUT%"
powershell -NoProfile -Sta -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Continue'; try { Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction Stop; $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]; $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1); if ($null -eq $asTask) { Write-Output 'no AsTask method found' } else { $mgrType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]; $t = $asTask.MakeGenericMethod($mgrType).Invoke($null, @($mgrType::RequestAsync())); $t.Wait(8000); $mgr = $t.Result; if ($null -eq $mgr) { Write-Output 'manager is null' } else { $sessions = $mgr.GetSessions(); Write-Output ('Session count: ' + $sessions.Count); foreach ($s in $sessions) { Write-Output ('  - ' + [string]$s.SourceAppUserModelId + ' status=' + [int]$s.GetPlaybackInfo().PlaybackStatus) } $curr = $mgr.GetCurrentSession(); if ($curr) { Write-Output ('Current: ' + [string]$curr.SourceAppUserModelId) } else { Write-Output 'Current: <none>' } } } } catch { Write-Output ('Exception: ' + $_.Exception.Message); Write-Output ('Trace: ' + $_.ScriptStackTrace) }" >> "%OUT%" 2>&1
echo. >> "%OUT%"

echo === END === >> "%OUT%"
echo. >> "%OUT%"
echo Output written to "%OUT%"
echo.
type "%OUT%"
echo.
pause
