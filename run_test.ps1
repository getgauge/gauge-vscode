$env:GAUGE_PREFIX="C:\GAUGE"

mkdir $env:GAUGE_PREFIX

Invoke-WebRequest -Uri "https://raw.githubusercontent.com/getgauge/infrastructure/master/nightly_scripts/install_latest_gauge_nightly.ps1" -OutFile install_latest_gauge_nightly.ps1
.\install_latest_gauge_nightly.ps1

$env:Path = "$env:GAUGE_PREFIX;" + [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

gauge config gauge_repository_url https://raw.githubusercontent.com/getgauge/gauge-nightly-repository/master/

gauge.exe install js
gauge.exe install html-report
gauge.exe version

npm run build

npm test