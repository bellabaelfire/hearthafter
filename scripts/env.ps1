param(
  [string]$NodeExecutable,
  [string]$PnpmEntrypoint
)

# Process-local tooling paths. Dot-source this file from any working directory.
$hearthProjectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$hearthCacheRoot = Join-Path $hearthProjectRoot '.cache'
$env:TEMP = Join-Path $hearthProjectRoot '.tmp'
$env:TMP = $env:TEMP
$env:npm_config_cache = Join-Path $hearthCacheRoot 'npm'
$env:XDG_CACHE_HOME = $hearthCacheRoot
$env:XDG_CONFIG_HOME = Join-Path $hearthCacheRoot 'config'
$env:XDG_STATE_HOME = Join-Path $hearthCacheRoot 'state'
$env:XDG_DATA_HOME = Join-Path $hearthCacheRoot 'data'
$env:PNPM_CONFIG_STORE_DIR = Join-Path $hearthCacheRoot 'pnpm-store'
$env:PNPM_CONFIG_CACHE_DIR = Join-Path $hearthCacheRoot 'pnpm'
$env:PNPM_CONFIG_STATE_DIR = Join-Path $hearthCacheRoot 'pnpm-state'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $hearthCacheRoot 'browsers'
$env:PNPM_HOME = Join-Path $hearthCacheRoot 'pnpm-home'
$env:npm_package_config_node_gyp_devdir = Join-Path $hearthCacheRoot 'node-gyp'
$env:npm_config_devdir = $env:npm_package_config_node_gyp_devdir
$env:APPDATA = Join-Path $hearthCacheRoot 'roaming'
$env:LOCALAPPDATA = Join-Path $hearthCacheRoot 'local'
$env:NEXT_TELEMETRY_DISABLED = '1'
$env:SANITY_STUDIO_TELEMETRY_DISABLED = '1'
$env:DO_NOT_TRACK = '1'
# Report stale dependency metadata without implicitly installing or removing modules.
$env:pnpm_config_verify_deps_before_run = 'warn'

if ($NodeExecutable) {
  if (-not (Test-Path -LiteralPath $NodeExecutable -PathType Leaf)) {
    throw 'NodeExecutable must point to an existing Node executable.'
  }
  $hearthNodeExecutable = (Resolve-Path -LiteralPath $NodeExecutable).Path
} else {
  $hearthNodeCommand = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $hearthNodeCommand) {
    throw 'Node is not on PATH. Dot-source scripts/env.ps1 with -NodeExecutable pointing to your installed Node executable.'
  }
  $hearthNodeExecutable = $hearthNodeCommand.Source
}
$hearthNodeDirectory = Split-Path -Parent $hearthNodeExecutable
$hearthPnpmShim = Join-Path $env:PNPM_HOME 'pnpm.cmd'
$hearthPnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue | Select-Object -First 1

# Reuse an installed pnpm. If its command is missing, expose its existing entrypoint
# through an ignored local launcher; this helper never downloads tooling.
if ($PnpmEntrypoint -or -not $hearthPnpmCommand -or $hearthPnpmCommand.Source -eq $hearthPnpmShim) {
  if (-not $PnpmEntrypoint) {
    $PnpmEntrypoint = Join-Path (Split-Path -Parent $hearthNodeDirectory) 'node_modules/pnpm/bin/pnpm.cjs'
  }
  if (-not (Test-Path -LiteralPath $PnpmEntrypoint -PathType Leaf)) {
    throw 'pnpm is not available. Supply -PnpmEntrypoint pointing to an already installed pnpm/bin/pnpm.cjs, or install pnpm separately.'
  }
  $hearthPnpmEntrypoint = (Resolve-Path -LiteralPath $PnpmEntrypoint).Path
  [System.IO.Directory]::CreateDirectory($env:PNPM_HOME) | Out-Null
  $hearthShimNode = $hearthNodeExecutable.Replace('%', '%%')
  $hearthShimEntry = $hearthPnpmEntrypoint.Replace('%', '%%')
  $hearthShimContents = '@echo off' + "`r`n" + '@"' + $hearthShimNode + '" "' + $hearthShimEntry + '" %*' + "`r`n" + 'exit /b %errorlevel%' + "`r`n"
  [System.IO.File]::WriteAllText($hearthPnpmShim, $hearthShimContents, [System.Text.UTF8Encoding]::new($false))
}

[System.IO.Directory]::CreateDirectory($env:TEMP) | Out-Null
$hearthPathEntries = @($env:PNPM_HOME, $hearthNodeDirectory) + @($env:PATH -split [System.IO.Path]::PathSeparator)
$env:PATH = ($hearthPathEntries | Where-Object { $_ } | Select-Object -Unique) -join [System.IO.Path]::PathSeparator
