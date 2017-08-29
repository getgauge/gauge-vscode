version=$(ls Gauge-*.vsix | sed "s/^Gauge-\([^;]*\).vsix/\1/")
npm run publish -- --packagePath artifact/Gauge-$version.vsix -p $VS_PAT