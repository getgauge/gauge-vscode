version=$(ls gauge-*.vsix | sed "s/^gauge-\([^;]*\).vsix/\1/")
npm install
npm run publish -- --packagePath artifact/gauge-$version.vsix -p $VS_PAT