import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Gauge Extension Tests', () => {
    test('should activate when manifest file found in path', () => {
        assert.ok(vscode.extensions.getExtension('getgauge.gauge').isActive);
    });
});