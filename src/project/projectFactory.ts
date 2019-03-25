import { existsSync, readFileSync } from "fs";
import { join, parse } from "path";
import { GAUGE_MANIFEST_FILE, MAVEN_POM } from "../constants";
import { GaugeProject } from "./gaugeProject";
import { MavenProject } from "./mavenProject";

export class ProjectFactory {
    public static builders: Array<{
        predicate: (root: string) => boolean,
        build: (root: string, data: string) => GaugeProject
    }> = [
            {
                predicate: (root: string) => existsSync(join(root, MAVEN_POM)),
                build: (root: string, data: any) => new MavenProject(root, data)
            }
            // Add other project types if required. example: GradleProject
        ];

    public static get(path: string): GaugeProject {
        if (!path) throw new Error(`${path} does not belong to a valid gauge project.`);
        const content = readFileSync(join(path, GAUGE_MANIFEST_FILE));
        const data = JSON.parse(content.toString());
        for (const builder of this.builders) {
            if (builder.predicate(path)) return builder.build(path, data);
        }
        return new GaugeProject(path, data);
    }

    public static isGaugeProject(dir: string): boolean {
        return existsSync(join(dir, GAUGE_MANIFEST_FILE));
    }

    public static getGaugeRootFromFilePath(filepath: string): string {
        while (!this.isGaugeProject(filepath)) {
            filepath = parse(filepath).dir;
        }
        return filepath;
    }
    public static getProjectByFilepath(fsPath: string): GaugeProject {
        let projectRoot = this.getGaugeRootFromFilePath(fsPath);
        return this.get(projectRoot);
    }
}
