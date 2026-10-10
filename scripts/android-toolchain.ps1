$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $projectRoot 'artifacts/toolchain'
New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null
$jdkZip = Join-Path $toolsRoot 'jdk.zip'
if (!(Test-Path (Join-Path $toolsRoot 'jdk'))) {
    Write-Output 'Downloading Microsoft OpenJDK 21 into the project build cache...'
    Invoke-WebRequest -Uri 'https://aka.ms/download-jdk/microsoft-jdk-21-windows-x64.zip' -OutFile $jdkZip -UseBasicParsing
    Expand-Archive -LiteralPath $jdkZip -DestinationPath (Join-Path $toolsRoot 'jdk') -Force
}
$jdk = Get-ChildItem (Join-Path $toolsRoot 'jdk') -Directory | Select-Object -First 1
$env:JAVA_HOME = $jdk.FullName
$env:PATH = (Join-Path $jdk.FullName 'bin') + ';' + $env:PATH
$socketTemp = Join-Path $toolsRoot 'tmp'
New-Item -ItemType Directory -Force -Path $socketTemp | Out-Null
$env:JAVA_TOOL_OPTIONS = '-Djava.net.preferIPv4Stack=true "-Djdk.net.unixdomain.tmpdir=' + $socketTemp + '" "-Djava.io.tmpdir=' + $socketTemp + '"'
$sdkRoot = Join-Path $toolsRoot 'android-sdk'
$manager = Join-Path $sdkRoot 'cmdline-tools/latest/bin/sdkmanager.bat'
if (!(Test-Path $manager)) {
    Write-Output 'Resolving the official Android SDK command-line package...'
    [xml]$repo = (Invoke-WebRequest -Uri 'https://dl.google.com/android/repository/repository2-1.xml' -UseBasicParsing).Content
    $package = $repo.SelectNodes('//*[local-name()="remotePackage"]') | Where-Object { $_.path -eq 'cmdline-tools;latest' } | Select-Object -First 1
    $archive = $package.archives.archive | Where-Object { $_.'host-os' -eq 'windows' } | Select-Object -First 1
    if (!$archive.complete.url) { throw 'Official Windows SDK package not found.' }
    $sdkZip = Join-Path $toolsRoot 'sdk.zip'
    Invoke-WebRequest -Uri ('https://dl.google.com/android/repository/' + $archive.complete.url) -OutFile $sdkZip -UseBasicParsing
    $algorithm = if ($archive.complete.checksum.type) { $archive.complete.checksum.type.ToUpper().Replace('-','') } else { 'SHA1' }
    $expected = $archive.complete.checksum.'#text'
    if ($expected -and (Get-FileHash -LiteralPath $sdkZip -Algorithm $algorithm).Hash -ne $expected) { throw 'Android tools checksum mismatch.' }
    Expand-Archive -LiteralPath $sdkZip -DestinationPath (Join-Path $toolsRoot 'sdk-extracted') -Force
    New-Item -ItemType Directory -Force -Path (Join-Path $sdkRoot 'cmdline-tools') | Out-Null
    $source = [IO.Path]::GetFullPath((Join-Path $toolsRoot 'sdk-extracted/cmdline-tools'))
    $destination = [IO.Path]::GetFullPath((Join-Path $sdkRoot 'cmdline-tools/latest'))
    if (!$source.StartsWith($projectRoot + '\') -or !$destination.StartsWith($projectRoot + '\')) { throw 'Toolchain paths must remain inside the project.' }
    Move-Item -LiteralPath $source -Destination $destination
}
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:GRADLE_USER_HOME = Join-Path $toolsRoot 'gradle'
Write-Output 'Installing the Android build SDK...'
1..100 | ForEach-Object { 'y' } | & $manager --sdk_root=$sdkRoot --licenses | Out-Null
& $manager --sdk_root=$sdkRoot '"platforms;android-36"' '"build-tools;35.0.0"' 'platform-tools'
if ($LASTEXITCODE -ne 0) { throw 'Android SDK installation failed.' }
Set-Location (Join-Path $projectRoot 'android')
& .\gradlew.bat assembleDebug --no-daemon --console=plain
if ($LASTEXITCODE -ne 0) { throw 'Android APK build failed.' }
New-Item -ItemType Directory -Force -Path (Join-Path $projectRoot 'releases') | Out-Null
Copy-Item -LiteralPath 'app/build/outputs/apk/debug/app-debug.apk' -Destination (Join-Path $projectRoot 'releases/Orbit-v1.0.0-beta-android-debug.apk')
Write-Output 'Android APK ready in releases/Orbit-v1.0.0-beta-android-debug.apk'
