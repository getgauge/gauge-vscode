'use strict';

import { Uri, workspace, commands, window, ExtensionContext } from "vscode";

const HAS_OPENED_BEFORE = "hasOpenedBefore";
const GAUGE_DOCS_URI = 'https://docs.gauge.org';
const INSTALL_INSTRUCTION_URI = `${GAUGE_DOCS_URI}/getting_started/installing-gauge.html`;
const CONFIG_WELCOME_NOTIFICATION = 'gauge.welcomeNotification';

function shouldDisplayWelcomeNotification(isProjOpendBefore: boolean): boolean {
    let configValue = workspace
        .getConfiguration(CONFIG_WELCOME_NOTIFICATION).get<string>('showOn');
    if (configValue === 'never') return false;
    return !isProjOpendBefore;
}

export function showWelcomeNotification(context: ExtensionContext) {
    if (shouldDisplayWelcomeNotification(context.workspaceState.get(HAS_OPENED_BEFORE))) {
        window.showInformationMessage(`Gauge plugin initialised.`,
            "Learn more", "Do not show this again")
            .then((option) => {
                if (option === "Learn more") {
                    commands.executeCommand('vscode.open', Uri.parse(GAUGE_DOCS_URI));
                } else if (option === "Do not show this again") {
                    workspace.getConfiguration().update(`${CONFIG_WELCOME_NOTIFICATION}.showOn`, 'never', true);
                }
            });
    }
    context.workspaceState.update(HAS_OPENED_BEFORE, true);
}

export function showInstallGaugeNotification() {
    window.showErrorMessage(
        `Gauge executable not found!
        [Click here](${INSTALL_INSTRUCTION_URI}) for install instructions.`
    );
}