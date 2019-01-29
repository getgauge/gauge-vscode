'use strict';

import { CLI } from '../cli';
import { GaugeProject } from './gaugeProject';

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

}
