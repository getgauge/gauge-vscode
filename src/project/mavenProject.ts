'use strict';
import { execSync } from 'child_process';
import { window } from 'vscode';
import { CLI } from '../cli';
import { GaugeProject } from './gaugeProject';
import { GAUGE_CUSTOM_CLASSPATH } from '../constants';

export class MavenProject extends GaugeProject {
    constructor(projectRoot: string, manifest: any) {
        super(projectRoot, manifest);
    }

    public getExecutionCommand(cli: CLI) {
        return cli.mavenCommand();
    }

    public equals(o: Object): boolean {
        if (o == null) return false;
        if (!(o instanceof MavenProject)) return false;
        if (o === this) return true;
        return this.root() === (o as MavenProject).root();
    }

    public envs(cli: CLI): NodeJS.ProcessEnv {
        try {
            let classpath = execSync(`${this.getExecutionCommand(cli)?.command} -q gauge:classpath`, {cwd: this.root()});
            return {[GAUGE_CUSTOM_CLASSPATH]: classpath.toString().trim() };
        } catch (e) {
            window.showErrorMessage(`Error calculating project classpath.\t\n${e.output.toString()}`);
        }
    }

}
