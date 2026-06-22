[CmdletBinding()]
param(
    [string]$InstallRoot,
    [string]$SparkRepoUrl = "https://github.com/sparkjsdev/spark.git",
    [string]$SparkRef = "v2.1.0",
    [string]$BuildArgs = "--quality",
    [string]$TestSplat,
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-Command {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$InstallHint
    )

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name was not found. $InstallHint"
    }
}

function Split-ArgumentString {
    param([string]$Value)

    $source = [string]$Value
    if ([string]::IsNullOrWhiteSpace($source)) {
        return @()
    }

    $matches = [regex]::Matches($source, '("[^"]*"|''[^'']*''|\S+)')
    $args = @()
    foreach ($match in $matches) {
        $args += $match.Value.Trim().Trim('"').Trim("'")
    }
    return $args
}

function Run-Native {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [string[]]$Arguments = @()
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath failed with exit code $LASTEXITCODE"
    }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($InstallRoot)) {
    $InstallRoot = Join-Path $repoRoot ".hera-tools\spark"
}

$InstallRoot = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($InstallRoot)
$toolsRoot = Split-Path -Parent $InstallRoot
New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null

Require-Command -Name "git" -InstallHint "Install Git for Windows, then open a new PowerShell window."
Require-Command -Name "cargo" -InstallHint "Install Rust with rustup from https://rustup.rs/ or run: winget install Rustlang.Rustup"

$gitVersion = (& git --version) -join " "
$cargoVersion = (& cargo --version) -join " "
Write-Host "[HERA][SparkBuildLodSetup] found $gitVersion"
Write-Host "[HERA][SparkBuildLodSetup] found $cargoVersion"

if ($Force -and (Test-Path $InstallRoot)) {
    Remove-Item -LiteralPath $InstallRoot -Recurse -Force
}

if (-not (Test-Path $InstallRoot)) {
    Write-Host "[HERA][SparkBuildLodSetup] cloning Spark $SparkRef into $InstallRoot"
    Run-Native -FilePath "git" -Arguments @(
        "clone",
        "--depth", "1",
        "--branch", $SparkRef,
        $SparkRepoUrl,
        $InstallRoot
    )
} elseif (Test-Path (Join-Path $InstallRoot ".git")) {
    Write-Host "[HERA][SparkBuildLodSetup] updating existing Spark checkout at $InstallRoot"
    Push-Location $InstallRoot
    try {
        Run-Native -FilePath "git" -Arguments @("fetch", "--tags", "--force", "origin")
        Run-Native -FilePath "git" -Arguments @("checkout", "--force", $SparkRef)
    } finally {
        Pop-Location
    }
} else {
    throw "InstallRoot exists but is not a git checkout: $InstallRoot. Use -Force or choose another -InstallRoot."
}

$cargoManifest = Join-Path $InstallRoot "rust\build-lod\Cargo.toml"
if (-not (Test-Path $cargoManifest)) {
    throw "Spark build-lod source was not found at $cargoManifest. Check SparkRef or repository URL."
}

Write-Host "[HERA][SparkBuildLodSetup] building build-lod with Cargo"
Run-Native -FilePath "cargo" -Arguments @(
    "build",
    "--manifest-path", $cargoManifest,
    "--release"
)

$binaryCandidates = @(
    (Join-Path $InstallRoot "rust\target\release\build-lod.exe"),
    (Join-Path $InstallRoot "rust\target\release\build-lod"),
    (Join-Path $InstallRoot "target\release\build-lod.exe"),
    (Join-Path $InstallRoot "target\release\build-lod")
)
$buildLodPath = $binaryCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $buildLodPath) {
    throw "Cargo finished but build-lod executable was not found. Checked: $($binaryCandidates -join ', ')"
}

$buildLodPath = (Resolve-Path $buildLodPath).Path
$scriptToolsRoot = Join-Path $PSScriptRoot "tools"
$scriptToolPath = Join-Path $scriptToolsRoot ([System.IO.Path]::GetFileName($buildLodPath))
New-Item -ItemType Directory -Force -Path $scriptToolsRoot | Out-Null
Copy-Item -LiteralPath $buildLodPath -Destination $scriptToolPath -Force
$scriptToolPath = (Resolve-Path $scriptToolPath).Path

$envScriptPath = Join-Path $toolsRoot "spark-build-lod.env.ps1"
$envScript = @(
    ('$env:SPARK_BUILD_LOD_PATH="{0}"' -f $scriptToolPath),
    ('$env:SPARK_BUILD_LOD_ARGS="{0}"' -f $BuildArgs),
    '$env:SPARK_BUILD_LOD_TIMEOUT_MS="600000"'
)
Set-Content -Path $envScriptPath -Value $envScript -Encoding UTF8

if (-not [string]::IsNullOrWhiteSpace($TestSplat)) {
    $testSplatPath = (Resolve-Path $TestSplat).Path
    $testDir = Split-Path -Parent $testSplatPath
    $testArgs = @($testSplatPath) + (Split-ArgumentString $BuildArgs)

    Write-Host "[HERA][SparkBuildLodSetup] testing build-lod on $testSplatPath"
    Push-Location $testDir
    try {
        Run-Native -FilePath $buildLodPath -Arguments $testArgs
    } finally {
        Pop-Location
    }

    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($testSplatPath)
    $radOutput = Get-ChildItem -Path $testDir -Filter "$baseName*.rad" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if ($radOutput) {
        Write-Host "[HERA][SparkBuildLodSetup] test RAD output: $($radOutput.FullName)"
    } else {
        Write-Warning "[HERA][SparkBuildLodSetup] build-lod exited successfully, but no matching .rad output was found beside the test splat."
    }
} else {
    Write-Host "[HERA][SparkBuildLodSetup] no -TestSplat provided; skipping conversion smoke test"
}

Write-Host ""
Write-Host "[HERA][SparkBuildLodSetup] done"
Write-Host "build-lod build output:"
Write-Host $buildLodPath
Write-Host ""
Write-Host "build-lod backend tool path:"
Write-Host $scriptToolPath
Write-Host ""
Write-Host "HERA backend will auto-detect the scripts tool path after setup."
Write-Host "You do not need to set SPARK_BUILD_LOD_PATH unless you want to use a different binary."
Write-Host ""
Write-Host "Optional override variables:"
Write-Host ('$env:SPARK_BUILD_LOD_PATH="{0}"' -f $scriptToolPath)
Write-Host ('$env:SPARK_BUILD_LOD_ARGS="{0}"' -f $BuildArgs)
Write-Host '$env:SPARK_BUILD_LOD_TIMEOUT_MS="600000"'
Write-Host ""
Write-Host "Optional helper env file:"
Write-Host ". `"$envScriptPath`""
