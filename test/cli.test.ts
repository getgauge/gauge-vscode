import * as assert from 'assert';
import { CLI } from '../src/cli';

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

        let cli = new CLI("gauge", info, 'mvn');
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

        let cli = new CLI("gauge", info, 'mvn');
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

        let cli = new CLI("gauge", info, 'mvn');
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

        let cli = new CLI("gauge", info, 'mvn');

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

        let cli = new CLI("gauge", info, 'mvn');

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

            let cli = new CLI("gauge", info, 'mvn');

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
        let cli = new CLI("gauge", info, 'mvn');

        assert.ok(!cli.isGaugeVersionGreaterOrEqual('2.0.0'));
        assert.ok(!cli.isGaugeVersionGreaterOrEqual('2.1.3'));
        assert.ok(!cli.isGaugeVersionGreaterOrEqual('1.3.0'));
        done();
    });
});
