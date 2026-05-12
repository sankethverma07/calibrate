# Calibrate — Now Playing detector for Windows
# Reads Windows.Media.Control SMTC sessions (Spotify, Chrome MediaSession,
# Edge, foobar2000, anything that registers with Windows transport controls).
#
# Requires:
#   • Windows PowerShell 5.1 (NOT PowerShell 7 — WinRT bridge isn't there)
#   • -Sta apartment (WinRT cross-apartment marshaling is finicky in MTA)
#
# Invoke from Node like:
#   powershell -NoProfile -Sta -ExecutionPolicy Bypass -File nowplaying.ps1
#
# Output format (one line per status, lines start with marker):
#   STAGE|||<step>             — progress trace
#   DEBUG|||count=N|||curr=...|||list=AppId@status,...
#   OK|||Title|||Artist|||Album|||Status|||SourceAppId
#   NOSESSION
#   ERROR|||<message>

$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Emit { param([string]$line); Write-Output $line }

try {
    Emit 'STAGE|||load-winrt-asm'
    Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction Stop

    Emit 'STAGE|||load-smtc-types'
    # Force the WinRT type system to bind these names.
    $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
    $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSession, Windows.Media.Control, ContentType=WindowsRuntime]
    $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType=WindowsRuntime]

    Emit 'STAGE|||find-astask'
    # Locate the generic AsTask<T>(IAsyncOperation<T>) extension method.
    $asTaskGeneric = $null
    foreach ($m in [System.WindowsRuntimeSystemExtensions].GetMethods()) {
        if ($m.Name -eq 'AsTask' -and $m.IsGenericMethod) {
            $p = $m.GetParameters()
            if ($p.Count -eq 1 -and $p[0].ParameterType.Name -eq 'IAsyncOperation`1') {
                $asTaskGeneric = $m
                break
            }
        }
    }
    if ($null -eq $asTaskGeneric) { throw 'Could not find AsTask<T> extension method' }

    function Await {
        param($winRtOp, [Type]$resultType)
        $task = $asTaskGeneric.MakeGenericMethod($resultType).Invoke($null, @($winRtOp))
        $task.Wait(8000) | Out-Null
        return $task.Result
    }

    Emit 'STAGE|||request-manager'
    $mgrType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]
    $mgr = Await ($mgrType::RequestAsync()) $mgrType
    if ($null -eq $mgr) { throw 'GlobalSystemMediaTransportControlsSessionManager.RequestAsync returned null' }

    Emit 'STAGE|||list-sessions'
    $sessions = $mgr.GetSessions()
    $count = $sessions.Count
    $curr = $mgr.GetCurrentSession()
    $currId = if ($curr) { [string]$curr.SourceAppUserModelId } else { '' }

    $idsList = New-Object System.Collections.Generic.List[string]
    $best = $null
    $bestScore = -1
    foreach ($s in $sessions) {
        $sid = [string]$s.SourceAppUserModelId
        try {
            $pb = $s.GetPlaybackInfo()
            $st = [int]$pb.PlaybackStatus
        } catch {
            $st = -1
        }
        $idsList.Add(($sid + '@' + $st))
        # Prefer Playing(4) > Paused(5) > Changing(2) > Opened(1)
        $score = switch ($st) {
            4 { 10 }
            5 { 5 }
            2 { 3 }
            1 { 1 }
            default { 0 }
        }
        if ($score -gt $bestScore) {
            $bestScore = $score
            $best = $s
        }
    }

    if ($null -eq $best -and $null -ne $curr) { $best = $curr }
    Emit ('DEBUG|||count=' + $count + '|||curr=' + $currId + '|||list=' + ($idsList -join ','))

    if ($null -eq $best) {
        Emit 'NOSESSION'
        exit 0
    }

    Emit 'STAGE|||read-media-properties'
    $mpType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]
    $media = Await ($best.TryGetMediaPropertiesAsync()) $mpType
    $pb = $best.GetPlaybackInfo()
    $st = [int]$pb.PlaybackStatus

    $title  = if ($media -and $media.Title)      { [string]$media.Title }      else { '' }
    $artist = if ($media -and $media.Artist)     { [string]$media.Artist }     else { '' }
    $album  = if ($media -and $media.AlbumTitle) { [string]$media.AlbumTitle } else { '' }
    $source = [string]$best.SourceAppUserModelId

    Emit ('OK|||' + $title + '|||' + $artist + '|||' + $album + '|||' + $st + '|||' + $source)
    exit 0

} catch {
    $errMsg = $_.Exception.Message
    $trace  = if ($_.ScriptStackTrace) { $_.ScriptStackTrace } else { '<no trace>' }
    Emit ('ERROR|||' + $errMsg + ' @ ' + $trace)
    exit 1
}
