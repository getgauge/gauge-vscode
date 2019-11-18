[![Released Version](https://vsmarketplacebadge.apphb.com/version-short/getgauge.gauge.svg)](https://marketplace.visualstudio.com/items?itemName=getgauge.gauge)
[![Actions Status](https://github.com/getgauge/gauge-vscode/workflows/vscode/badge.svg)](https://github.com/getgauge/gauge-vscode/actions)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v1.4%20adopted-ff69b4.svg)](CODE_OF_CONDUCT.md)

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
* [Symbols](#symbols)
* [Run Specs/Scenarios](#run-specifications-and-scenarios)
* [Debug Specs/Scenarios](#debug-specifications-and-scenarios)
* [Reports](#reports)
* [Test Explorer](#test-explorer)
* [Code Snippets](#snippets-for-specification-scenarios-and-tables)

Gauge langauge plugins supported by the Gauge Visual Studio Code plugin are:
* [gauge-js](https://github.com/getgauge/gauge-js)
* [gauge-java](https://github.com/getgauge/gauge-java)
* [gauge-dotnet](https://github.com/getgauge/gauge-dotnet)
* [gauge-python](https://github.com/getgauge/gauge-python)
* [gauge-ruby](https://github.com/getgauge/gauge-ruby)

## Create new project

Execute the Command `Gauge: Create new Gauge Project` and select the appropriate template to create a new Gauge Project

<img src="https://github.com/getgauge/gauge-vscode/raw/master/images/newProj.jpg" alt="Create New Project preview" style="width: 600px;"/>

## Code Completion
<img src="https://github.com/getgauge/gauge-vscode/raw/master/images/autocomplete.jpg" alt="Code Completion preview" style="width: 600px;"/>

## Goto Definition
<img src="https://github.com/getgauge/gauge-vscode/raw/master/images/gotoDefinition.jpg" alt="Goto Definition preview" style="width: 600px;"/>

## Diagnostics

<img src="https://github.com/getgauge/gauge-vscode/raw/master/images/diagnostics.jpg" alt="Diagnostics preview" style="width: 600px;"/>

## Format Specifications

<img src="https://github.com/getgauge/gauge-vscode/raw/master/images/format.jpg" alt="Formatting preview" style="width: 600px;"/>

## Symbols

<img src="https://github.com/getgauge/gauge-vscode/raw/master/images/symbols.jpg" alt="Symbols preview" style="width: 600px;"/>

## References

<img src="https://github.com/getgauge/gauge-vscode/raw/master/images/references.jpg" alt="References preview" style="width: 600px;"/>

## Run specifications and scenarios

### Using Codelens

<img src="https://github.com/getgauge/gauge-vscode/raw/master/images/runSpec.jpg" alt="Run Specs/Scenarios preview" style="width: 600px;"/>

### Using command palette
[Launch the command palette](https://code.visualstudio.com/docs/setup/mac#_launching-from-the-command-line)

	* Gauge: Create a new Gauge Project
	* Gauge: Create a new Specification
	* Gauge: Find Step References
	* Gauge: Optimize VS Code Configuration for Gauge
	* Gauge: Run All Specification
	* Gauge: Run Specification
	* Gauge: Run Scenarios
	* Gauge: Run Scenario At Cursor
	* Gauge: Repeat Last Run
	* Gauge: Re-Run Failed Scenario(s)
	* Gauge: Show Last Run Report
	* Gauge: Stop current gauge execution
	* Gauge: Report Issue
	* Test: Focus on Gauge Specs View

## Debug specifications and scenarios

<img src="https://github.com/getgauge/gauge-vscode/raw/master/images/debugSpec.jpg" alt="Debug Specs/Scenarios preview" style="width: 600px;"/>

Suport for Debugging of step implementations in JS, Python and Ruby

## Reports

View execution reports inside VS Code

<img src="https://github.com/getgauge/gauge-vscode/raw/master/images/reports.jpg" alt="Execution Report preview" style="width: 600px;"/>

## Test Explorer

<img src="https://github.com/getgauge/gauge-vscode/raw/master/images/testExplorer.jpg" alt="Test Explorer preview" style="width: 600px;"/>

## Snippets for specification, scenarios and tables

To invoke a snippet type any of the following snippet keywords and Ctrl+space

* `spec` - for specification
* `sce` - for scenario
* `table:1` - table with one column
* `table:2` - table with two columns
* `table:3` - table with three columns
* `table:4` - table with four columns
* `table:5` - table with five columns
* `table:6` - table with six columns

# Configuration

To override default configurations in [VSCode settings](https://code.visualstudio.com/docs/getstarted/settings)

* `gauge.launch.enableDebugLogs`:  Starts gauge lsp server with log-level `debug`, defaults to `false`
* `gauge.execution.debugPort`:  Debug port, defaults to `9229`
* `gauge.notification.suppressUpdateNotification`:  Stops notifications for gauge-vscode plugin auto-updates, defaults to `false`
* `gauge.create.specification.withHelp`: Create specification template with help comments, defaults to `true`

# Install from source

	$ npm run build

This will create `gauge-<version>.vsix` file which can be installed via VScode's [Install from VSIX](https://code.visualstudio.com/docs/editor/extension-gallery#_install-from-a-vsix).
> Note: Manually delete the Gauge extension folder from [VSCode extensions folder](https://vscode-docs.readthedocs.io/en/stable/extensions/install-extension/) for a successful uninstallation of VSCode extension

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

# Talk to us

Please see below for the best place to ask a query:

- How do I? -- [Stack Overflow](https://stackoverflow.com/questions/ask?tags=getgauge)
- I got this error, why? -- [Stack Overflow](https://stackoverflow.com/questions/ask?tags=getgauge)
- I got this error and I'm sure it's a bug -- file an [issue](https://github.com/getgauge/gauge-vscode/issues)
	You can also easily report issues from VSCode itself by executing command `Gauge: Report Issue` from the command pallete
- I have an idea/request -- file an [issue](https://github.com/getgauge/gauge-vscode/issues)
- Why do you? -- [Google Groups](https://groups.google.com/forum/#!forum/getgauge)
- When will you? -- [Google Groups](https://groups.google.com/forum/#!forum/getgauge)
