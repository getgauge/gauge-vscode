'use strict';

import { commands, ExtensionContext, Uri, window, workspace } from "vscode";
import { GAUGE_DOCS_URI, INSTALL_INSTRUCTION_URI } from "./constants";

const HAS_OPENED_BEFORE = "hasOpenedBefore";
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