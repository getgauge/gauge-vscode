'use strict';

import { Uri, workspace, commands, window, ExtensionContext } from "vscode";

const HAS_OPENED_BEFORE = "hasOpenedBefore";

export function showWelcomePage(context: ExtensionContext) {
    let showWelcomePageOn = workspace.getConfiguration('gauge.welcomeNotification').get<string>('showOn');
    if ((showWelcomePageOn === "newProjectLoad" && !context.workspaceState.get(HAS_OPENED_BEFORE))) {
        window.showInformationMessage("Gauge is a free and open source test automation framework" +
            "that takes the pain out of acceptance testing",
            "Learn more", "Skip", "Do not show this again")
            .then((option) => {
                if (option === "Learn more") {
                    commands.executeCommand('vscode.open', Uri.parse('https://docs.gauge.org'));
                } else if (option === "Do not show this again") {
                    workspace.getConfiguration().update('gauge.welcomeNotification.showOn', 'never');
                }
            });
    }
    context.workspaceState.update(HAS_OPENED_BEFORE, true);
}