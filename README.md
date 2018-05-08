[![Released Version](https://vsmarketplacebadge.apphb.com/version-short/getgauge.gauge.svg)](https://marketplace.visualstudio.com/items?itemName=getgauge.gauge)
[![Build Status](https://travis-ci.org/getgauge/gauge-vscode.svg?branch=master)](https://travis-ci.org/getgauge/gauge-vscode)
[![Build status](https://ci.appveyor.com/api/projects/status/w9rjq31rqnru66fi?svg=true)](https://ci.appveyor.com/project/getgauge/gauge-vscode)

Gauge extension for [Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=getgauge.gauge)

# Install

```
$ code --install-extension getgauge.gauge
```
*Other Install [options](#install-from-source)*


# Features

* [Create New Project](#create-new-project)
* [Code Completion](#code-completion)
* [Goto Definition](#goto-definition)
* [Diagnostics](#diagnostics)
* [Format Specifications](#format-specifications)
* [References](#references)
* [Run Specs/Scenarios](#run-specifications-and-scenarios)
* [Debug Specs/Scenarios](#debug-specifications-and-scenarios)
* [Reports](#reports)
* [Test Explorer](#test-explorer)
* [Code Snippets](#snippets-for-specification-scenarios-and-tables)

## Create new project

Execute the Command `Gauge: Create new Gauge Project` and select the appropriate template to create a new Gauge Project

<img src="images/newProj.jpg" alt="Create New Project preview" style="width: 600px;"/>

## Code Completion
<img src="images/autocomplete.jpg" alt="Code Completion preview" style="width: 600px;"/>

## Goto Definition
<img src="images/gotoDefinition.jpg" alt="Goto Definition preview" style="width: 600px;"/>

## Diagnostics

<img src="images/diagnostics.jpg" alt="Diagnostics preview" style="width: 600px;"/>

## Format Specifications

<img src="images/format.jpg" alt="Formatting preview" style="width: 600px;"/>

## References

<img src="images/references.jpg" alt="References preview" style="width: 600px;"/>

## Run specifications and scenarios

### Using Codelens

<img src="images/runSpec.jpg" alt="Run Specss/Scenarios preview" style="width: 600px;"/>

### Using command palette
	* Run All Specification
	* Run Specification
	* Run Scenarios
	* Run Scenario At Cursor
	* Repeat Last Run
	* Gauge: Re-Run Failed Scenario(s)

## Debug specifications and scenarios

<img src="images/debugSpec.jpg" alt="Debug Specs/Scenarios preview" style="width: 600px;"/>

Suport for Debugging of step implementations in JS, Python and Ruby

## Reports

View execution reports inside VS Code

<img src="images/reports.jpg" alt="Execution Report preview" style="width: 600px;"/>

## Test Explorer

<img src="images/testExplorer.jpg" alt="Test Explorer preview" style="width: 600px;"/>

## Snippets for specification, scenarios and tables

* `spec` - for specification
* `sce` - for scenario
* `table:1` - table with one column
* `table:2` - table with two columns
* `table:3` - table with three columns
* `table:4` - table with four columns
* `table:5` - table with five columns
* `table:6` - table with six columns

## Configuration

To override default configurations in [VSCode settings](https://code.visualstudio.com/docs/getstarted/settings)

* `gauge.launch.enableDebugLogs`:  Starts gauge lsp server with log-level `debug`, defaults to `false`
* `gauge.execution.debugPort`:  Debug port, defaults to `9229`
* `gauge.notification.suppressUpdateNotification`:  Stops notifications for gauge-vscode plugin auto-updates, defaults to `false`

## Install from source

	$ npm run build

This will create `gauge-<version>.vsix` file which can be installed via VScode's [Install from VSIX](https://code.visualstudio.com/docs/editor/extension-gallery#_install-from-a-vsix).

## Install Nightly version

Nightly version of vscode is available in bintray. To install a nightly version,
- [Uninstall](https://code.visualstudio.com/docs/editor/extension-gallery#_manage-extensions) existing version of gauge extension
- Download the latest [nightly version of gauge extension](https://bintray.com/gauge/gauge-vscode/Nightly/_latestVersion) from bintray
- [Install](https://code.visualstudio.com/docs/editor/extension-gallery#_install-from-a-vsix) gauge extension from source

# Troubleshooting

If gauge features are not activated, check file associations for `.spec` and `.cpt` it maybe used by another plugin. To fix this, add this to [user settings](https://code.visualstudio.com/docs/getstarted/settings)

```
"files.associations": {
	"*.spec": "gauge",
	"*.cpt": "gauge"
}
```

## Facing other issues?

Refer our [Troubleshooting](https://docs.getgauge.io/troubleshooting.html) guide

## Talk to us

Please see below for the best place to ask a query:

- How do I? -- [Stack Overflow](https://stackoverflow.com/questions/ask?tags=getgauge)
- I got this error, why? -- [Stack Overflow](https://stackoverflow.com/questions/ask?tags=getgauge)
- I got this error and I'm sure it's a bug -- file an [issue](https://github.com/getgauge/gauge-vscode/issues)
	You can also easily report issues from VSCode itself by executing command `Gauge: Report Issue` from the command pallete
- I have an idea/request -- file an [issue](https://github.com/getgauge/gauge-vscode/issues)
- Why do you? -- [Google Groups](https://groups.google.com/forum/#!forum/getgauge)
- When will you? -- [Google Groups](https://groups.google.com/forum/#!forum/getgauge)
