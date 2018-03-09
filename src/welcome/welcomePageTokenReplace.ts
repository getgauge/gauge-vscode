import { spawnSync } from "child_process";
import { getGaugeVersionInfo } from '../gaugeVersion';

export class WelcomePageTokenReplace {
    getLinuxDistribution(): string {
        let dist = spawnSync('cat', ['/etc/issue']);
        if (dist.error) {
            return null;
        }
        return dist.stdout.toString();
    }

    getInstallCommandBasedOnOS(): InstallCommand {
        let installCommand = new InstallCommand();
        switch (process.platform) {
            case "win32":
                installCommand.name = "choco";
                installCommand.command = "choco install gauge";
                return installCommand;
            case "darwin":
                installCommand.name = "brew";
                installCommand.command = "brew install gauge";
                return installCommand;
            default:
                if (this.getLinuxDistribution().indexOf("Ubuntu") !== -1) {
                    installCommand.name = "apt";
                    installCommand.command = "sudo apt-get install gauge";
                    return installCommand;
                } else {
                    installCommand.name = "dnf";
                    installCommand.command = "sudo dnf install gauge";
                    return installCommand;
                }
        }
    }

    replaceText(text: string, supress: Boolean, root: string): string {
        let replace = [{key : /{{showGaugeInstall}}/g, value : !getGaugeVersionInfo() ?  "" : "hidden"},
                        {key : /{{installCommand}}/g, value : encodeURI('command:gauge.executeIn.terminal?' +
                                JSON.stringify([this.getInstallCommandBasedOnOS().command]))},
                        {key : /{{name}}/g, value : this.getInstallCommandBasedOnOS().name},
                        {key : /{{command}}/g, value : this.getInstallCommandBasedOnOS().command},
                        {key : /{{doNotShowWelcome}}/g, value: supress ? "checked" : "" },
                        {key : /{{root}}/g, value : root}];
        replace.forEach((element) =>  {
            text = text.replace(new RegExp(element.key), element.value);
        });
        return text;
    }
}

class InstallCommand {
    name: string;
    command: string;
}