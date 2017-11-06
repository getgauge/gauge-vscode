import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Gauge Extension Tests', () => {
    let testDataPath = path.join(__dirname, '..', '..', 'test', 'testdata', 'sampleProject');

    test('should activate when manifest file found in path', () => {
        assert.equal(vscode.workspace.rootPath, testDataPath);
        assert.ok(vscode.extensions.getExtension('getgauge.gauge').isActive);
    });
});