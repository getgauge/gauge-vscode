'use strict';

import { existsSync, readFileSync } from 'fs';
import { GAUGE_MANIFEST_FILE } from './constants';
import { join } from 'path';

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

    public isGaugeProject(): boolean {
        return this._isGaugeProject;
    }

    public language(): string {
        return this._language;
    }

    public isProjectLanguage(language: string): any {
        return this._language === language;
    }

    public root(): any {
        return this._projectRoot;
    }

    public versionString(): string {
        return `Project Path: ${this._projectRoot}
Language: ${this._language}
Plugins:${this._plugins.join(', ')}`;
    }

}

export function getGaugeProject(dir: any) {
    const basePath = (typeof dir === 'string' ? dir : dir.uri.fsPath);
    const filePath = join(basePath, GAUGE_MANIFEST_FILE);
    if (existsSync(filePath)) {
        try {
            const content = readFileSync(filePath);
            const data = JSON.parse(content.toString());
            return new GaugeProject(basePath, data);
        } catch (e) {
            return new GaugeProject(basePath, null);
        }
    }
    return new GaugeProject(basePath, null);
}
