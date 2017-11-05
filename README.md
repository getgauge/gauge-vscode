# gauge-vscode

[![Build Status](https://travis-ci.org/getgauge/gauge-vscode.svg?branch=master)](https://travis-ci.org/getgauge/gauge-vscode)

Gauge extension for VSCode.

This extension adds language support for the Gauge projects, including:
* Autocomplete of steps and parameters
![Autocomplete preview](https://raw.githubusercontent.com/getgauge/gauge-vscode/master/images/autocomplete.gif)
* Goto definition for steps
![Goto Definition preview](https://raw.githubusercontent.com/getgauge/gauge-vscode/master/images/gotoDefinition.gif)
* Formating
![Formatting preview](https://raw.githubusercontent.com/getgauge/gauge-vscode/master/images/format.gif)
* Diagnostics - parse errors
![Diagnostics preview](https://raw.githubusercontent.com/getgauge/gauge-vscode/master/images/diagnostics.gif)
* Run specifications and scenarios
![Execution preview](https://raw.githubusercontent.com/getgauge/gauge-vscode/master/images/execute.gif)
* Snippets for specification, scenarios and tables.

## Install from source

```shell
$ npm run build
```

This will create `gauge-<version>.vsix` file which can be installed via VScode's [Install from VSIX](https://code.visualstudio.com/docs/editor/extension-gallery#_install-from-a-vsix).

## Install Nightly version

Nightly version of vscode is available in bintray. To install a nightly version,
- [Uninstall](https://code.visualstudio.com/docs/editor/extension-gallery#_manage-extensions) existing version of gauge extension.
- Download the latest [nightly version of gauge extension](https://bintray.com/gauge/gauge-vscode/Nightly/_latestVersion) from bintray.
- [Install](https://code.visualstudio.com/docs/editor/extension-gallery#_install-from-a-vsix) gauge extension from source.

## Troubleshooting

- Files not associated with Gauge.
If gauge features are not listed, the gauge extension may not be activated. The `.spec` and `.cpt` files may be associated with a different langauge. To fix this, you can add this to [user settings](https://code.visualstudio.com/docs/getstarted/settings).
```
"files.associations": {
	"*.spec": "markdown",
	"*.cpt": "markdown"
}
```
