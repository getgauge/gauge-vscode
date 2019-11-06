'use strict';

import { CLI } from '../cli';
import { GaugeProject } from './gaugeProject';

export class GradleProject extends GaugeProject {
    constructor(projectRoot: string, manifest: any) {
        super(projectRoot, manifest);
    }

    public getExecutionCommand(cli: CLI) {
        return cli.gradleCommand();
    }

    public equals(o: Object): boolean {
        if (o == null) return false;
        if (!(o instanceof GradleProject)) return false;
        if (o === this) return true;
        return this.root() === (o as GradleProject).root();
    }

}
