go get -v -u github.com/aktau/github-release

if [ -z "$GITHUB_TOKEN" ]; then
  echo "GITHUB_TOKEN is not set"
  exit 1
fi

cd artifacts

version=$(ls Gauge-*.vsix | sed "s/^Gauge-\([^;]*\).vsix/\1/")
repoName="gauge-vscode"
releaseName="Gauge VSCode Extension $version"
artifact="Gauge-$version.vsix"

releaseDescription=$(ruby -e "$(curl -sSfL https://github.com/getgauge/gauge/raw/master/build/create_release_text.rb)" $repoName)

$GOPATH/bin/github-release release -u getgauge -r "$repoName" --draft -t "v$version" -d "$releaseDescription" -n "$releaseName"

$GOPATH/bin/github-release -v upload -u getgauge -r "$repoName" -t "v$version" -n "$artifact" -f "$artifact"
