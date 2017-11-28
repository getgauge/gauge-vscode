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
});