import * as assert from 'assert';
import { GaugeVersionInfo } from '../src/gaugeVersion';

suite('GaugeVersionInfo', () => {
    test('should give its version information as string', (done) => {
        let version = "1.2.3";
        let plugins = [
            { name: "csharp", version: "1.2.0" },
            { name: "java", version: "1.0.0" },
            { name: "ruby", version: "1.2.0" },
        ];
        let gv = new GaugeVersionInfo(version, "3db28e6", plugins);

        let expected = `Gauge version: 1.2.3
Commit Hash: 3db28e6

Plugins
-------
csharp (1.2.0)
java (1.0.0)
ruby (1.2.0)`;

        assert.equal(gv.toString(), expected);
        done();
    });

    test('should not give commit hash if not available', (done) => {
        let version = "1.2.3";
        let plugins = [
            { name: "csharp", version: "1.2.0" },
            { name: "java", version: "1.0.0" },
            { name: "ruby", version: "1.2.0" },
        ];
        let gv = new GaugeVersionInfo(version, undefined, plugins);

        let expected = `Gauge version: 1.2.3


Plugins
-------
csharp (1.2.0)
java (1.0.0)
ruby (1.2.0)`;

        assert.equal(gv.toString(), expected);
        done();
    });

    test('should tell if version is greater than or equal with minimum supported gauge version', (done) => {
        let version = "1.2.3";
        let plugins = [
            { name: "csharp", version: "1.2.0" },
            { name: "java", version: "1.0.0" },
            { name: "ruby", version: "1.2.0" },
        ];
        let gv = new GaugeVersionInfo(version, undefined, plugins);

        assert.ok(gv.isGreaterOrEqual('1.2.3'));
        assert.ok(gv.isGreaterOrEqual('1.2.0'));
        assert.ok(gv.isGreaterOrEqual('0.9.0'));
        assert.ok(gv.isGreaterOrEqual('0.2.8'));

        done();
    });

    test('should tell if version is lower than minimum supported gauge version', (done) => {
        let version = "1.2.3";
        let plugins = [
            { name: "csharp", version: "1.2.0" },
            { name: "java", version: "1.0.0" },
            { name: "ruby", version: "1.2.0" },
        ];
        let gv = new GaugeVersionInfo(version, undefined, plugins);

        assert.ok(!gv.isGreaterOrEqual('2.0.0'));
        assert.ok(!gv.isGreaterOrEqual('2.1.3'));
        assert.ok(!gv.isGreaterOrEqual('1.3.0'));
        done();
    });
});
