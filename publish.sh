version=$(ls artifacts/gauge-*.vsix | sed "s/^artifacts\/gauge-\([^;]*\).vsix/\1/")
npm install
npm run publish -- --packagePath artifacts/gauge-$version.vsix -p $VS_PAT