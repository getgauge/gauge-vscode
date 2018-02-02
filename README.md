# gauge-vscode

[![Released Version](https://vsmarketplacebadge.apphb.com/version-short/getgauge.gauge.svg)](https://marketplace.visualstudio.com/items?itemName=getgauge.gauge)
[![Build Status](https://travis-ci.org/getgauge/gauge-vscode.svg?branch=master)](https://travis-ci.org/getgauge/gauge-vscode)
[![Build status](https://ci.appveyor.com/api/projects/status/w9rjq31rqnru66fi?svg=true)](https://ci.appveyor.com/project/getgauge/gauge-vscode)

Gauge extension for [Visual Studio Code](https://code.visualstudio.com/)

## Install

```
$ code --install-extension getgauge.gauge
```

This extension adds language support for the Gauge projects, including:

### Code Completion for steps, parameters and tags
![Code Completion preview](https://raw.githubusercontent.com/getgauge/gauge-vscode/master/images/autocomplete.gif)

### Goto definition for steps
![Goto Definition preview](https://raw.githubusercontent.com/getgauge/gauge-vscode/master/images/gotoDefinition.gif)

### Diagnostics
![Diagnostics preview](https://raw.githubusercontent.com/getgauge/gauge-vscode/master/images/diagnostics.gif)

### Run specifications and scenarios using codeLens
![Execution preview](https://raw.githubusercontent.com/getgauge/gauge-vscode/master/images/execute.gif)

### Formating
![Formatting preview](https://raw.githubusercontent.com/getgauge/gauge-vscode/master/images/format.gif)
### References

Shows step usages for a step implementation.

### Run all specifications from command palette

Execute command `Gauge: Run All Specification` to run all the specification in `specs` (default) directory. Use `gauge.execution.specDirs` configuration to add or remove spec directories.

### Run specification from command palette

Execute command `Gauge: Run Specification` to run the current open specification.

### Run scenarios from command palette

Execute command `Gauge: Run Scenarios` to choose a scenario form current specification and run.

### Run scenario at cursor from command palette

Execute command `Gauge: Run Scenario At Cursor` to the scenario at cursor. It will ask to choose a scenario If cursor is not in scenario context.

### Repeat last gauge execution from command palette

Execute command `Gauge: Repeat Last Run` to repeat last gauge execution.

### Re-run failed scenarios from previous run

Execute command `Gauge: Re-Run Failed Scenario(s)` to repeat only failed scenarios from last gauge execution.

### Snippets for specification, scenarios and tables.
	`spec` - for specification
	`sce` - for scenario
	`table:1` - table with one column
	`table:2` - table with two columns
	`table:3` - table with three columns
	`table:4` - table with four columns
	`table:5` - table with five columns
	`table:6` - table with six columns

## Configuration

These configurations can be configured in [VSCode settings](https://code.visualstudio.com/docs/getstarted/settings).
* `gauge.launch.enableDebugLogs` :  Starts gauge lsp server with log-level `debug`. Defaults to `false`.
* `gauge.execution.debugPort` :  Defaults debug port to `9229`.
* `gauge.execution.specDirs` : List of specification directories which can be run by executing `Gauge: Run All Specifications` from command palette.
* `gauge.notification.suppressUpdateNotification` :  Stops showing notifications for gauge-vscode plugin auto-updates. Defaults to `false`.

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
	"*.spec": "gauge",
	"*.cpt": "gauge"
}
```
### Facing other issues?

Refer our [Troubleshooting](https://docs.getgauge.io/troubleshooting.html) guide.

### Talk to us

Please see below for the best place to ask a query:

- How do I? -- [Stack Overflow](https://stackoverflow.com/questions/ask?tags=getgauge)
- I got this error, why? -- [Stack Overflow](https://stackoverflow.com/questions/ask?tags=getgauge)
- I got this error and I'm sure it's a bug -- file an [issue](https://github.com/getgauge/gauge-vscode/issues)
	You can also easily report issues from VSCode itself by executing command `Gauge: Report Issue` from the command pallete.
- I have an idea/request -- file an [issue](https://github.com/getgauge/gauge-vscode/issues)
- Why do you? -- [Google Groups](https://groups.google.com/forum/#!forum/getgauge)
- When will you? -- [Google Groups](https://groups.google.com/forum/#!forum/getgauge)
