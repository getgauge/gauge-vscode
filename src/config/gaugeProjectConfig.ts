import * as path from 'path';
import { writeFileSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { exec } from 'child_process';
import * as xmlbuilder from 'xmlbuilder';
import { isProjectLanguage, isMavenProject } from "../util";
import { getGaugeVersionInfo } from '../gaugeVersion';
const javaPluginPath = path.join(homedir(), '.gauge', 'plugins', 'java');
const DEFAULT_JAVA_VERSION = '11';
export class GaugeJavaProjectConfig {
    projectRoot: any;
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
    }

    private defaultCLassPath(javaVersion: string) {
        return [
            {
                kind: 'con',
                path: `org.eclipse.jdt.launching.JRE_CONTAINER/` +
                    `org.eclipse.jdt.internal.debug.ui.launcher.StandardVMType/JavaSE-${javaVersion}`
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
    }

    generate() {
        if (isProjectLanguage(this.projectRoot, 'java') && !isMavenProject(this.projectRoot)) {
            exec('java -version', (err, __, out) => {
                const dotCPFilePath = path.join(this.projectRoot, '.classpath');
                let javaVersion = out.replace(/.*?(\d+\.\d+\.\d+).*(\s+.*)+/, '$1');
                if ( err !== null || !out ) {
                    return this.createDotClassPathFile(dotCPFilePath, DEFAULT_JAVA_VERSION);
                }
                if (javaVersion.match(/^\d\./)) {
                    this.createDotClassPathFile(dotCPFilePath, javaVersion.replace(/(\.\d+(\w+)?$)/, ''));
                } else {
                    this.createDotClassPathFile(dotCPFilePath, javaVersion.replace(/\.\d+/g, ''));
                }
            });
            this.createDotProjectFile(path.join(this.projectRoot, '.project'));
        }
    }
    private createDotClassPathFile(cpFilePath: string, javaVersion: string) {
        let { plugins } = getGaugeVersionInfo();
        let javaPluginInfo = plugins.find((plugin) => plugin.hasName('java'));
        let jars = readdirSync( path.join(javaPluginPath, `${javaPluginInfo.version}/libs/`))
            .filter((jar) => jar.match(/gauge|assertj-core/));
        let classPathForJars = jars
            .map((jar) => this.cpEntry('lib', path.join(javaPluginPath, jar)));
        let classPathObj = {
            classpath: { classpathentry: [...this.getDefaultCPEntries(javaVersion), ...classPathForJars] }
        };
        this.configFile(cpFilePath, classPathObj);
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
        this.configFile(projectFilePath, projectObj);
    }

    private configFile(filePath, contentObj) {
        const xml = xmlbuilder.create(contentObj, { encoding: 'UTF-8' });
        let content = xml.end({ pretty: true });
        writeFileSync(filePath, content);
    }

    private getDefaultCPEntries(javaVersion) {
        return this.defaultCLassPath(javaVersion)
        .map((entry) => this.cpEntry(entry.kind, entry.path));
    }

    private cpEntry(kind, path) {
        return {
            '@kind': kind,
            '@path': path
        };
    }
}