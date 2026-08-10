# dev_tunnel.ps1 - localtunnel 守护脚本
# 职责：启动/重启 localtunnel 隧道，健康检查，断连自动恢复
# 新 URL 出现时自动更新 backend/.env 的 PUBLIC_BASE_URL 并重启后端
#
# 用法: powershell -File scripts/dev_tunnel.ps1

$ErrorActionPreference = 'Continue'
$BackendDir = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $BackendDir '.env'
$LogDir = Join-Path $BackendDir 'tmp'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$TunnelLog = Join-Path $LogDir 'localtunnel.log'
$TunnelErr = Join-Path $LogDir 'localtunnel.err.log'
$UrlFile = Join-Path $LogDir 'tunnel_url.txt'

function Write-Log($msg) {
    $ts = Get-Date -Format 'HH:mm:ss'
    Write-Host "[$ts] $msg"
}

function Set-PublicBaseUrl([string]$url) {
    if (-not (Test-Path $EnvFile)) { Write-Log "WARN: .env 不存在: $EnvFile"; return }
    $content = Get-Content $EnvFile -Raw -Encoding UTF8
    $new = $url.TrimEnd('/')
    if ($content -match '(?m)^PUBLIC_BASE_URL=.*$') {
        $content = $content -replace '(?m)^PUBLIC_BASE_URL=.*$', "PUBLIC_BASE_URL=$new"
    } else {
        $content = $content.TrimEnd() + "`nPUBLIC_BASE_URL=$new`n"
    }
    Set-Content $EnvFile $content -Encoding UTF8 -NoNewline
    Write-Log "PUBLIC_BASE_URL -> $new"
}

function Restart-Backend() {
    # 杀掉占用 8000 的进程
    $listeners = netstat -ano | Select-String ':8000.*LISTENING'
    foreach ($line in $listeners) {
        $procId = ($line.ToString() -split '\s+')[-1]
        if ($procId -match '^\d+$') {
            Write-Log "kill backend pid=$procId"
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 2
    # 用系统 Python 启动（依赖齐全），单进程模式
    $python = 'python'
    Start-Process -FilePath $python -ArgumentList '-m','uvicorn','app.main:app','--host','0.0.0.0','--port','8000' `
        -WorkingDirectory $BackendDir -WindowStyle Hidden
    Write-Log 'backend restarted'
}

function Get-TunnelUrlFromLog() {
    if (-not (Test-Path $TunnelLog)) { return '' }
    $lines = Get-Content $TunnelLog -Encoding UTF8 -ErrorAction SilentlyContinue
    foreach ($line in $lines) {
        if ($line -match 'your url is: (https://\S+)') { return $matches[1] }
    }
    return ''
}

function Start-Tunnel() {
    # 清理旧 lt 进程
    Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'localtunnel' -and $_.Name -match 'node' } |
        ForEach-Object { Write-Log "kill lt pid=$($_.ProcessId)"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 1
    if (Test-Path $TunnelLog) { Remove-Item $TunnelLog -Force }
    Write-Log 'starting localtunnel...'
    $npx = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source
    if (-not $npx) { $npx = 'npx.cmd' }
    $proc = Start-Process -FilePath $npx -ArgumentList 'localtunnel','--port','8000' `
        -WorkingDirectory $BackendDir -RedirectStandardOutput $TunnelLog -RedirectStandardError $TunnelErr `
        -WindowStyle Hidden -PassThru
    if ($null -eq $proc) { return 0 }
    return $proc.Id
}

# ---------- 主循环 ----------
Write-Log 'dev_tunnel watchdog started'
$lastUrl = ''
$backendStarted = $false
$tunnelProcId = 0

while ($true) {
    $url = Get-TunnelUrlFromLog
    if ($url) {
        if ($url -ne $lastUrl) {
            Write-Log "tunnel url: $url"
            $lastUrl = $url
            Set-Content $UrlFile $url -Encoding UTF8
            Set-PublicBaseUrl $url
            Restart-Backend
            $backendStarted = $true
        }
        # 健康检查
        $ok = $false
        try {
            $r = Invoke-WebRequest -Uri "$url/docs" -TimeoutSec 20 -ErrorAction Stop
            if ($r.StatusCode -eq 200) { $ok = $true }
        } catch { $ok = $false }
        if ($ok) {
            Start-Sleep -Seconds 15
            continue
        }
        Write-Log "HEALTH CHECK FAIL, restarting tunnel..."
    } else {
        # 还没拿到 URL：隧道可能还在启动或已退出
        $alive = $null
        if ($tunnelProcId -ne 0) { $alive = Get-Process -Id $tunnelProcId -ErrorAction SilentlyContinue }
        if (-not $alive -and $tunnelProcId -ne 0) {
            Write-Log "tunnel process exited, restarting..."
        }
        Start-Sleep -Seconds 5
    }
    # 重启隧道（URL 未知或健康检查失败）
    $tunnelProcId = Start-Tunnel
    Start-Sleep -Seconds 20
}
