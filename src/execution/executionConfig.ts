import { GaugeProject } from "../gaugeProject";

export class ExecutionConfig {
    public _inParallel: boolean = false;
    public _failed: boolean = false;
    public _repeat: boolean = false;
    public _debug: boolean = false;

    public _project: GaugeProject;
    public _status: string;

    public setParallel() {
        this._inParallel = true;
        return this;
    }

    public setProject(project: GaugeProject): ExecutionConfig {
        this._project = project;
        return this;
    }

    public setStatus(status: string): ExecutionConfig {
        this._status = status;
        return this;
    }

    public setDebug(): ExecutionConfig {
        this._debug = true;
        return this;
    }

    public setRepeat(): ExecutionConfig {
        this._repeat = true;
        return this;
    }

    public setFailed(): ExecutionConfig {
        this._failed = true;
        return this;
    }

    public getFailed(): boolean {
        return this._failed;
    }

    public getRepeat(): boolean {
        return this._repeat;
    }

    public getParallel(): boolean {
        return this._inParallel;
    }

    public getProject(): GaugeProject {
        return this._project;
    }

    public getStatus(): string {
        return this._status;
    }

    public getDebug(): boolean {
        return this._debug;
    }
}