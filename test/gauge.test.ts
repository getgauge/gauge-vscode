import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { extensions, ExtensionContext, Memento } from 'vscode'
import {notifyOnNewGaugeVsCodeVersion} from '../src/extension'

suite('Gauge Extension Tests', () => {
    let testDataPath = path.join(__dirname, '..', '..', 'test', 'testdata', 'sampleProject');

    test('should activate when manifest file found in path', () => {
        assert.equal(vscode.workspace.rootPath, vscode.Uri.file(testDataPath).fsPath);
        assert.ok(vscode.extensions.getExtension('getgauge.gauge').isActive);
    });

    test('should show update message when gauge plugin updates', () => {
        const GAUGE_EXTENSION_ID = 'getgauge.gauge';
        const GAUGE_VSCODE_VERSION = 'gaugeVsCodeVersion';
        const gauge = extensions.getExtension(GAUGE_EXTENSION_ID)!;
        const gaugeVsCodeVersion = gauge.packageJSON.version;

        class MementoImpl<T> implements Memento {
            arr :{ [key:string]:T; } = {};

            get(key: string): T {
                return this.arr[key];
            };

            update(key: string, value: any): Thenable<void> {
                this.arr[key] = value;
                return Promise.resolve();
            }
        }
        var globalState: MementoImpl<String> = new MementoImpl();
        globalState.update(GAUGE_VSCODE_VERSION, gaugeVsCodeVersion);

        const [major, minor, patch] = gaugeVsCodeVersion.split('.');
        const higherVersion = [major, minor, patch + 1].join('.')
        assert.ok(!notifyOnNewGaugeVsCodeVersion(globalState, gaugeVsCodeVersion))
        assert.ok(notifyOnNewGaugeVsCodeVersion(globalState, higherVersion))
        assert.ok(!notifyOnNewGaugeVsCodeVersion(globalState, higherVersion))

    })
});