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
* Run specifications and scenarios using codeLens
![Execution preview](https://raw.githubusercontent.com/getgauge/gauge-vscode/master/images/execute.gif)

* Run all specifications from command palette

	Execute command `Gauge: Run All Specification` to run all the specification in `specs` (default) directory. Use `gauge.execution.specDirs` configuration to add or remove spec directories.

* Run specification from command palette

	Execute command `Gauge: Run Specification` to run the current open specification.

* Run scenarios from command palette

	Execute command `Gauge: Run Scenarios` to choose a scenario form current specification and run.
* Run scenario at cursor from command palette

	Execute command `Gauge: Run Scenario At Cursor` to the scenario at cursor. It will ask to choose a scenario If cursor is not in scenario context.

* Snippets for specification, scenarios and tables.

## Configuration
* `gauge.launch.enableDebugLogs` :  Starts gauge lsp server with log-level `debug`. Defaults to `false`.
* `gauge.execution.specDirs` : List of specification directories which can be run by executing `Gauge: Run All Specifications` from command palette.
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
If gauge features are not listed, the gauge extension may not be activated. The `.spec` and `.cpt` files may be associated with a different language. To fix this, you can add this to [user settings](https://code.visualstudio.com/docs/getstarted/settings).
```
"files.associations": {
	"*.spec": "markdown",
	"*.cpt": "markdown"
}
```
