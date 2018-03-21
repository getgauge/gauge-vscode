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
        switch (process.platform) {
            case "win32":
                return new InstallCommand({
                    name: "choco",
                    displayText: "choco install gauge",
                    command: "Start-Process -Verb RunAs \"choco\" -ArgumentList \"install -y gauge\"" +
                    " -WindowStyle hidden -Wait"
                });
            case "darwin":
            return new InstallCommand({
                name: "brew",
                command: "brew install gauge"
            });
            default:
                if (this.getLinuxDistribution().indexOf("Ubuntu") !== -1) {
                    return new InstallCommand({
                        name: "apt",
                        command: "sudo apt-get install gauge"
                    });
                } else {
                    return new InstallCommand({
                        name: "dnf",
                        command: "sudo dnf install gauge"
                    });
                }
        }
    }

    replaceText(text: string, supress: Boolean, root: string): string {
        let replace = [{key : /{{showGaugeInstall}}/g, value : !getGaugeVersionInfo() ?  "" : "hidden"},
                        {key : /{{installCommand}}/g, value : encodeURI('command:gauge.executeIn.terminal?' +
                                JSON.stringify([this.getInstallCommandBasedOnOS().command]))},
                        {key : /{{name}}/g, value : this.getInstallCommandBasedOnOS().name},
                        {key : /{{command}}/g, value : this.getInstallCommandBasedOnOS().displayText},
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
    displayText: string;

    public constructor(init?: Partial<InstallCommand>) {
        Object.assign(this, init);
        if (this.displayText === "")
            this.displayText = this.command;
    }
}