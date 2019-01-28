'use strict';

import { existsSync, readFileSync } from 'fs';
import { GAUGE_MANIFEST_FILE, MAVEN_POM } from './constants';
import { join, parse, relative, isAbsolute } from 'path';
import { CLI } from './cli';

export class GaugeProject {
    private readonly _projectRoot: string;
    private readonly _isGaugeProject: boolean;
    private readonly _language: any;
    private readonly _plugins: any;

    public constructor(projectRoot: string, manifest: any) {
        this._projectRoot = projectRoot;
        this._isGaugeProject = manifest != null;
        if (this._isGaugeProject) {
            this._language = manifest.Language;
            this._plugins = manifest.Plugins;
        }
    }

    public getExecutionCommand(cli: CLI): string {
        if (this.isMavenProject()) return cli.mavenCommand();
        return cli.gaugeCommand();
    }

    public isMavenProject() {
        return existsSync(join(this.root(), MAVEN_POM));
    }

    public isGaugeProject(): boolean {
        return this._isGaugeProject;
    }

    public language(): string {
        return this._language;
    }

    public hasFile(file: string) {
        if (this.root() === file) return true;
        const rel = relative(this.root(), file);
        return !rel.startsWith('..') && !isAbsolute(rel);
    }

    public isProjectLanguage(language: string): any {
        return this._language === language;
    }

    public root(): any {
        return this._projectRoot;
    }

    public toString(): string {
        return `Project Path: ${this._projectRoot}\n` +
            `Language: ${this._language}\n` +
            `Plugins:${this._plugins.join(', ')}`;
    }

    public equals(o: Object): boolean {
        if (o == null) return false;
        if (!(o instanceof GaugeProject)) return false;
        if (o === this) return true;
        return this.root() === (o as GaugeProject).root();
    }

}

function createProject(dir: string) {
    const filePath = join(dir, GAUGE_MANIFEST_FILE);
    if (existsSync(filePath)) {
        try {
            const content = readFileSync(filePath);
            const data = JSON.parse(content.toString());
            return new GaugeProject(dir, data);
        } catch (e) {
            return new GaugeProject(dir, null);
        }
    }
    return new GaugeProject(dir, null);
}

export function getGaugeProject(filePath: string): GaugeProject {
    let project = createProject(filePath);
    while (!project.isGaugeProject()) {
        project = createProject(parse(project.root()).dir);
    }
    return project;
}
