import { GaugeProject } from "./project/gaugeProject";
import { LanguageClient } from "vscode-languageclient/node";

export class GaugeClients extends Map<string, { project: GaugeProject, client: LanguageClient }> {

    get(fsPath: string): { project: GaugeProject, client: LanguageClient } {
        for (const cp of this.values()) {
            if (cp.project.hasFile(fsPath)) return cp;
        }
    }
}