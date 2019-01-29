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

    public static get(filePath: string): GaugeProject {
        let pr = this.getGaugeRootFromFilePath(filePath);
        if (!pr) throw new Error(`${filePath} does not belong to a valid gauge project.`);
        const content = readFileSync(join(pr, GAUGE_MANIFEST_FILE));
        const data = JSON.parse(content.toString());
        for (const builder of this.builders) {
            if (builder.predicate(pr)) return builder.build(pr, data);
        }
        return new GaugeProject(pr, data);
    }

    private static isGaugeProject(dir: string): boolean {
        return existsSync(join(dir, GAUGE_MANIFEST_FILE));
    }

    private static getGaugeRootFromFilePath(filepath: string): string {
        while (!this.isGaugeProject(filepath)) {
            filepath = parse(filepath).dir;
        }
        return filepath;
    }
}
