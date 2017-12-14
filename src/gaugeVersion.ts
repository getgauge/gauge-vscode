import { spawnSync } from 'child_process';
import { GaugeCommands } from './commands';

export class GaugeVersionInfo {
	public version: string;
	public commitHash: string
	public plugins: Array<Object>;

	public constructor(v: string, commitHash: string, plugins: Array<Object>) {
		this.version = v;
		this.commitHash = commitHash;
		this.plugins = plugins;
	}

	isGreaterOrEqual(version: string): boolean {
		return this.version >= version;
	}

	getVersion(): string {
		return this.version
	}

	toString(): string {
		let v = `Gauge version: ${this.version}`;
		let cm = this.commitHash && `Commit Hash: ${this.commitHash}` || '';
		let plugins = this.plugins
			.map((p: any) => p.name + ' (' + p.version + ')')
			.join('\n');
		plugins = `Plugins\n-------\n${plugins}`;
		return `${v}\n${cm}\n\n${plugins}`;
	}

}

export function getGaugeVersionInfo() {
	let gv = spawnSync(GaugeCommands.Gauge, [GaugeCommands.Version, GaugeCommands.MachineReadable]);
	if (gv.error) {
		return null;
	}
	let m = JSON.parse(gv.stdout.toString());
	return new GaugeVersionInfo(m.version, m.commitHash, m.plugins)
}
