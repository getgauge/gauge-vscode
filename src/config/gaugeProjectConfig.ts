import * as path from 'path';
import * as glob from 'glob';
import { writeFileSync } from 'fs';
import { homedir } from 'os';
import * as xmlbuilder from 'xmlbuilder';
import { isProjectLanguage, isMavenProject } from "../util";
import { getGaugeVersionInfo } from '../gaugeVersion';
const javaPluginPath = path.join(homedir(), '.gauge', 'plugins', 'java');

export class GaugeJavaProjectConfig {
    projectRoot: any;
    private readonly defaultCLassPathEntries = [
        {
            kind: 'con',
            path: `org.eclipse.jdt.launching.JRE_CONTAINER/` +
            `org.eclipse.jdt.internal.debug.ui.launcher.StandardVMType/JavaSE-1.8`
        },
        {
            kind: 'src',
            path: 'src/test/java'
        },
        {
            kind: 'output',
            path: 'gauge_bin'
        }
    ];

    constructor(projectRoot) {
        this.projectRoot = projectRoot;
    }
    generate() {
        if (isProjectLanguage(this.projectRoot, 'java') && !isMavenProject(this.projectRoot)) {
            this.createDotClassPathFile(path.join(this.projectRoot, '.classpath'));
            this.createDotProjectFile(path.join(this.projectRoot, '.project'));
        }
    }
    private createDotClassPathFile(cpFilePath: string) {
        let versionInfo = getGaugeVersionInfo();
        let javaPluginInfo = versionInfo.plugins.find((plugin) => plugin.hasName('java'));
        let jars = glob.sync(`${javaPluginInfo.version}/libs/*.jar`, { cwd: javaPluginPath })
            .filter( (jar) =>  jar.match(/gauge|assertj-core/));

        let defaultCLassPathEntries = this.defaultCLassPathEntries
            .map((entry) => this.cpEntry(entry.kind, entry.path));
        let classPathForJars = jars
            .map((jar) => this.cpEntry('lib', path.join(javaPluginPath, jar)));

        let classPathObj = {
            classpath: { classpathentry: [...defaultCLassPathEntries, ...classPathForJars] }
        };
        writeFileSync(cpFilePath, xmlbuilder.create(classPathObj, { encoding: 'UTF-8' }).end({ pretty: true }));
    }

    private cpEntry(kind, path) {
        return {
            '@kind': kind,
            '@path': path
        };
    }
    private createDotProjectFile(projectFilePath) {
        const projectObj = {
            projectDescription: {
                name: path.basename(this.projectRoot),
                comment: '',
                projects: {},
                buildSpec: {
                    buildCommand: {
                        name: 'org.eclipse.jdt.core.javabuilder',
                        arguments: {}
                    }
                },
                natures: {
                    nature: 'org.eclipse.jdt.core.javanature'
                }
            }
        };
        const xml = xmlbuilder.create(projectObj, { encoding: 'UTF-8' });
        let content = xml.end({ pretty: true });
        writeFileSync(projectFilePath, content);
    }
}