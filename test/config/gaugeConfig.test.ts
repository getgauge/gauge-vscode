import * as assert from 'assert';
import { homedir } from 'os';
import { join } from 'path';
import GaugeConfig from '../../src/config/gaugeConfig';
let appDataEnv;
suite('GaugeConfig', () => {
    setup( () => {
        appDataEnv = process.env.APPDATA;
    });
    teardown( () => {
        delete process.env.GAUGE_HOME;
        process.env.APPDATA = appDataEnv;
    });

    test('should calculate plugins path for window platform', (done) => {
        let appData = '/Users/userName/AppData/Roaming';
        process.env.APPDATA = appData;
        const expectedPluginsPath = join(appData, 'Gauge', 'plugins');

        const actualPluginsPath = new GaugeConfig('win32').pluginsPath();
        assert.equal(actualPluginsPath, expectedPluginsPath);
        done();
    });

    test('should calculate plugins path for window platform when GAUGE_HOME env is set', (done) => {
        let gaugeHome = '/Users/userName/gaugeHome';
        process.env.GAUGE_HOME = gaugeHome;
        const expectedPluginsPath = join(gaugeHome, 'plugins');

        const actualPluginsPath = new GaugeConfig('win32').pluginsPath();
        assert.equal(actualPluginsPath, expectedPluginsPath);
        done();
    });

    test('should calculate plugins path for non window platform', (done) => {
        const expectedPluginsPath = join(homedir(), '.gauge', 'plugins');

        const actualPluginsPath = new GaugeConfig('darwin').pluginsPath();
        assert.equal(actualPluginsPath, expectedPluginsPath);
        done();
    });

    test('should calculate plugins path for non  window platform when GAUGE_HOME env is set', (done) => {
        let gaugeHome = '/Users/userName/gaugeHome';
        process.env.GAUGE_HOME = gaugeHome;
        const expectedPluginsPath = join(gaugeHome, 'plugins');

        const actualPluginsPath = new GaugeConfig('darwin').pluginsPath();
        assert.equal(actualPluginsPath, expectedPluginsPath);
        done();
    });
});
