import { GaugeProject } from "./gaugeProject";
import { LanguageClient } from "vscode-languageclient";

export class GaugeClients extends Map<string, { project: GaugeProject, client: LanguageClient }> {

    get(fsPath: string): { project: GaugeProject, client: LanguageClient } {
        for (const cp of this.values()) {
            if (cp.project.hasFile(fsPath)) return cp;
        }
    }
}