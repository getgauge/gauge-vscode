import * as assert from 'assert';
import { TextTransformer } from '../../src/welcome/textTransformer';
import * as vscode from 'vscode';
import { platform } from 'os';

suite('WelcomePage', () => {
    setup(() => {
        this.originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', {
            value: 'win32'
          });
    });

    test('should replace the given text with given values', (done) => {
        let text = "name : {{name}}, command : {{command}}, doNotShowWelcome : {{doNotShowWelcome}}";
        let root = "abc";
        let str = new TextTransformer().replaceText(text, false, root);
        let expected = `name : choco, command : choco install gauge, doNotShowWelcome : `;
        assert.equal(str, expected);
        done();
    });

    test('should not replace {{hello}}', (done) => {
        let text = "name : {{hello}}, command : {{command}}, doNotShowWelcome : {{doNotShowWelcome}}";
        let root = "abc";
        let str = new TextTransformer().replaceText(text, false, root);
        let expected = `name : {{hello}}, command : choco install gauge, doNotShowWelcome : `;
        assert.equal(str, expected);
        done();
    });

    teardown(() => {
        Object.defineProperty(process, 'platform', {
            value: this.originalPlatform
          });
    });
});