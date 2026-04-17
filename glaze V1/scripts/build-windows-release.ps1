$ErrorActionPreference = 'Stop'

$workspace = Split-Path -Parent $PSScriptRoot
$siteDownloads = Join-Path $workspace 'site\public\downloads'
$bundleRoot = Join-Path $workspace 'src-tauri\target\release\bundle'

function Require-Command($name, $hint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "$name was not found. $hint"
  }
}

Require-Command npm 'Install Node.js and make sure npm is on PATH before building Glaze.'

if (-not (Get-Command link.exe -ErrorAction SilentlyContinue)) {
  throw "link.exe was not found. Install Visual Studio Build Tools with the Desktop development with C++ workload before building the Glaze Windows installer."
}

$systemDrive = Get-PSDrive -Name C -PSProvider FileSystem -ErrorAction SilentlyContinue
if ($systemDrive -and $systemDrive.Free -lt 20GB) {
  throw "Drive C has less than 20 GB free. Free more space before building the Glaze Windows installer."
}

Push-Location $workspace

try {
  Write-Host 'Building desktop renderer...'
  npm run build:desktop:web

  Write-Host 'Building Tauri Windows bundle...'
  npm run build:desktop

  if (-not (Test-Path $bundleRoot)) {
    throw "Expected bundled installer output under $bundleRoot but the folder does not exist."
  }

  $installer = Get-ChildItem -Path $bundleRoot -Recurse -File |
    Where-Object { $_.Extension -in '.exe', '.msi' } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $installer) {
    throw "No Windows installer artifact was found in $bundleRoot."
  }

  New-Item -ItemType Directory -Force -Path $siteDownloads | Out-Null

  $publishedName = if ($installer.Extension -eq '.msi') { 'glaze-setup.msi' } else { 'glaze-setup.exe' }
  $publishedPath = Join-Path $siteDownloads $publishedName

  Copy-Item -LiteralPath $installer.FullName -Destination $publishedPath -Force

  Write-Host ''
  Write-Host "Glaze installer built successfully."
  Write-Host "Bundled artifact: $($installer.FullName)"
  Write-Host "Published download: $publishedPath"
}
finally {
  Pop-Location
}
