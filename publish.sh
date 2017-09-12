version=$(ls artifact/gauge-*.vsix | sed "s/^artifact\/gauge-\([^;]*\).vsix/\1/")
npm install
npm run publish -- --packagePath artifact/gauge-$version.vsix -p $VS_PAT