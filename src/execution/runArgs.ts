import { DebugConfiguration } from "vscode";
import { GaugeCommands } from "../constants";

export type GaugeRunOption = {
    env?: string[];
    'fail-safe'?: boolean;
    failed?: boolean;
    group?: number;
    'hide-suggestion'?: boolean;
    'install-plugins'?: boolean;
    'max-retries-count'?: number;
    n?: number;
    parallel?: boolean;
    repeat?: boolean;
    'retry-only'?: string;
    scenario?: string[];
    'simple-console'?: boolean;
    sort?: boolean;
    strategy?: 'eager' | 'lazy';
    'table-rows'?: string;
    tags?: string;
    verbose?: boolean;
    dir?: string;
    'log-level'?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
    'machine-readable'?: boolean;
}

// Set non-nullish default value to enable runtime type guard
const gaugeRunOption: Readonly<Required<GaugeRunOption>> = {
    env: ['default'],
    'fail-safe': false,
    failed: false,
    group: -1,
    'hide-suggestion': false,
    'install-plugins': true,
    'max-retries-count': 1,
    n: 8,
    parallel: false,
    repeat: false,
    'retry-only': '',
    scenario: [],
    'simple-console': false,
    sort: false,
    strategy: 'lazy',
    'table-rows': '',
    tags: '',
    verbose: false,
    dir: '.',
    'log-level': 'info',
    'machine-readable': false
};

const pickOnlyGaugeRunOption = (object: object): GaugeRunOption =>
    Object.entries(object).filter(([k, v]) => k in gaugeRunOption && typeof gaugeRunOption[k] === typeof v)
        .reduce((out, [k, v]) => { out[k] = v; return out; }, {});

export const extractGaugeRunOption = (configs: DebugConfiguration[]): GaugeRunOption => {
    if (!configs) return {};
    const extracted = configs.find(c => c.type === 'gauge' && c.request === 'test') || {};
    return pickOnlyGaugeRunOption(extracted);
}

type BuildRunArgs = (spec: string, option: GaugeRunOption) => string[]

const flag = (key: string) => `--${key}`

const buildGaugeArgs: BuildRunArgs = (spec, option) => {
    const args: string[] = [GaugeCommands.Run];

    if (option.failed) return args.concat(flag('failed'));
    if (option.repeat) return args.concat(flag('repeat'));

    args.push(...Object.entries(
        { 'hide-suggestion': true, 'simple-console': !option.parallel, ...option }
    ).map(([k, v]) => {
        if (typeof v === 'boolean') return v ? [flag(k)] : [];
        if (v instanceof Array && v.every(e => typeof e === 'string')) return [flag(k), v.join(',')];
        if (typeof v === 'string' || typeof v === 'number') return [flag(k), `${v}`];
        return [];
    }).reduce((acc, arr) => acc.concat(arr)));

    if (spec) args.push(spec);

    return args;
}

const buildJavaRunArgs = (spec: string, option: GaugeRunOption, prefix: String, additionalFlags: (...keys: string[]) => string) => {
    const {
        failed, repeat, tags, parallel, n, env, ...rest
    } = {
        'hide-suggestion': true, 'simple-console': true, ...option
    };
    const p = (str: string) => `${prefix}${str}`;
    const args = [] as string[];
    if (failed) return args.concat(p(additionalFlags('failed')));
    if (repeat) return args.concat(p(additionalFlags('repeat')));
    if (parallel) {
        args.push(p('inParallel=true'));
        if (n) args.push(p(`nodes=${n}`));
    }
    if (tags) args.push(p(`tags=${tags}`));
    if (env) args.push(p(`env=${env.join(',')}`));

    const flags = Object.entries(rest).filter(([, v]) => typeof v === 'boolean' && v).map(([k,]) => k);
    if (flags && 0 < flags.length) args.push(p(additionalFlags(...flags)));

    if (spec) args.push(p(`specsDir=${spec}`));
    return args;
}

const buildGradleArgs: BuildRunArgs = (spec, option) => {
    const additionalFlags = (...keys: string[]) => `additionalFlags=${keys.map(flag).join(' ')}`;
    return ['clean', 'gauge', ...buildJavaRunArgs(spec, option, '-P', additionalFlags)];
}

const buildMavenArgs: BuildRunArgs = (spec, option): string[] => {
    const flags = (...keys: string[]) => `flags=${keys.map(flag).join(',')}`;
    return ['-q', 'clean', 'compile', 'test-compile', 'gauge:execute',
        ...buildJavaRunArgs(spec, option, '-D', flags)];
}

export const buildRunArgs = {
    forGauge: buildGaugeArgs,
    forGradle: buildGradleArgs,
    forMaven: buildMavenArgs,
}
