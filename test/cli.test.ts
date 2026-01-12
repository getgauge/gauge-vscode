import * as assert from 'assert';
import { CLI, Command } from '../src/cli';
import path = require('path');
import { spawnSync } from "child_process";

let testCommandsPath = path.join(__dirname, '..', '..', 'test', 'commands');

suite('CLI', () => {
    test('.isPluginInstalled should tell a gauge plugin is installed or not', () => {
        let info = {
            version: "1.2.3",
            plugins: [
                { name: "csharp", version: "1.2.0" },
                { name: "java", version: "1.0.0" },
                { name: "ruby", version: "1.2.0" },
            ]
        };

        let cli = new CLI(new Command("gauge"), info, new Command('mvn'), new Command('gradle'));
        assert.ok(cli.isPluginInstalled('java'));
        assert.notEqual(true, cli.isPluginInstalled('foo'));
    });

    test('.getPluginVersion should give version of given plugin', () => {
        let info = {
            version: "1.2.3",
            plugins: [
                { name: "csharp", version: "1.2.0" },
                { name: "java", version: "1.0.0" },
                { name: "ruby", version: "1.2.0" },
            ]
        };

        let cli = new CLI(new Command("gauge"), info, new Command('mvn'), new Command('gradle'));
        assert.equal('1.0.0', cli.getGaugePluginVersion('java'));
    });

    test('.isPluginInstalled should tell a gauge plugin is installed or not', () => {
        let info = {
            version: "1.2.3",
            commitHash: "3db28e6",
            plugins: [
                { name: "csharp", version: "1.2.0" },
                { name: "java", version: "1.0.0" },
                { name: "ruby", version: "1.2.0" },
            ]
        };

        let cli = new CLI(new Command("gauge"), info, new Command('mvn'), new Command('gradle'));
        assert.ok(cli.isPluginInstalled('java'));
        assert.notEqual(true, cli.isPluginInstalled('foo'));
    });

    test('.versionString should give its version information as string', (done) => {
        let info = {
            version: "1.2.3",
            commitHash: "3db28e6",
            plugins: [
                { name: "csharp", version: "1.2.0" },
                { name: "java", version: "1.0.0" },
                { name: "ruby", version: "1.2.0" },
            ]
        };

        let cli = new CLI(new Command("gauge"), info, new Command('mvn'), new Command('gradle'));

        let expected = `Gauge version: 1.2.3
Commit Hash: 3db28e6

Plugins
-------
csharp (1.2.0)
java (1.0.0)
ruby (1.2.0)`;

        assert.equal(cli.gaugeVersionString(), expected);
        done();
    });

    test('.versionString should not give commit hash if not available', (done) => {
        let info = {
            version: "1.2.3",
            plugins: [
                { name: "csharp", version: "1.2.0" },
                { name: "java", version: "1.0.0" },
                { name: "ruby", version: "1.2.0" },
            ]
        };

        let cli = new CLI(new Command("gauge"), info, new Command('mvn'), new Command('gradle'));

        let expected = `Gauge version: 1.2.3


Plugins
-------
csharp (1.2.0)
java (1.0.0)
ruby (1.2.0)`;

        assert.equal(cli.gaugeVersionString(), expected);
        done();
    });

    test('.isVersionGreaterOrEqual should tell if version is greater than or' +
        'equal with minimum supported gauge version', (done) => {
            let info = {
                version: "1.2.3",
                commitHash: "3db28e6",
                plugins: [
                    { name: "csharp", version: "1.2.0" },
                    { name: "java", version: "1.0.0" },
                    { name: "ruby", version: "1.2.0" },
                ]
            };

            let cli = new CLI(new Command("gauge"), info, new Command('mvn'), new Command('gradle'));

            assert.ok(cli.isGaugeVersionGreaterOrEqual('1.2.3'));
            assert.ok(cli.isGaugeVersionGreaterOrEqual('1.2.0'));
            assert.ok(cli.isGaugeVersionGreaterOrEqual('0.9.0'));
            assert.ok(cli.isGaugeVersionGreaterOrEqual('0.2.8'));

            done();
        });

    test('.isVersionGreaterOrEqual should tell if version is lower than minimum supported gauge version', (done) => {
        let info = {
            version: "1.2.3",
            commitHash: "3db28e6",
            plugins: [
                { name: "csharp", version: "1.2.0" },
                { name: "java", version: "1.0.0" },
                { name: "ruby", version: "1.2.0" },
            ]
        };
        let cli = new CLI(new Command("gauge"), info, new Command('mvn'), new Command('gradle'));

        assert.ok(!cli.isGaugeVersionGreaterOrEqual('2.0.0'));
        assert.ok(!cli.isGaugeVersionGreaterOrEqual('2.1.3'));
        assert.ok(!cli.isGaugeVersionGreaterOrEqual('1.3.0'));
        done();
    });

    test('.isGaugeInstalled should tell if gauge is installed or not', (done) => {
        assert.ok(new CLI(new Command("gauge"), {}, undefined, undefined).isGaugeInstalled());
        assert.ok(!new CLI(null, {}, undefined, undefined).isGaugeInstalled());
        done();
    });

    test('.getCommandCandidates choices all valid by .isSpawnable', (done) => {
        let candidates = CLI.getCommandCandidates('test_command');
        const originalPath = process.env.PATH;
        process.env.PATH = testCommandsPath;
        let invalid_candidates = [];
        try {
            for (const candidate of candidates) {
                if (!CLI.isCommandInPath(candidate)) {
                    invalid_candidates.push(candidate);
                }
            }
            assert.ok(invalid_candidates.length === 0, `invalid candidates: ${invalid_candidates.join(', ')}, those should be valid`);
        } finally {
            process.env.PATH = originalPath;
        }
        done();
    });

    test('.getCommandCandidates choices can be found as in valid via .isSpawnable', (done) => {
        let candidates = CLI.getCommandCandidates('test_command_not_found');
        const originalPath = process.env.PATH;
        process.env.PATH = testCommandsPath;
        let valid_candidates = [];
        try {
            for (const candidate of candidates) {
                if (CLI.isCommandInPath(candidate)) {
                    valid_candidates.push(candidate);
                }
            }
            assert.ok(valid_candidates.length === 0, `valid candidates: ${valid_candidates.join(', ')}, those should not be valid`);
        } finally {
            process.env.PATH = originalPath;
        }
        done();
    });

    test('.getCommandCandidates can be spawned with an arg', (done) => {
        let candidates = CLI.getCommandCandidates('test_command');
        const originalPath = process.env.PATH;
        process.env.PATH = testCommandsPath;
        try {
            for (const candidate of candidates.filter(c => (c.cmdSuffix !== ".exe"))) {
                const result = candidate.spawnSync(["Hello World"]);
                assert.ok(result.status === 0 && !result.error, `Command candidate ${candidate.command} failed to spawn`);
                assert.equal(result.stdout.toString().trim(), 'Success: "Hello World"', `Command candidate ${candidate.command} has wrong output`)
            }
        } finally {
            process.env.PATH = originalPath;
        }
        done();
    });
});
