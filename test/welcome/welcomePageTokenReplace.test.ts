import * as assert from 'assert';
import { WelcomePageTokenReplace } from '../../src/welcome/welcomePageTokenReplace';
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
        let text = "name : {{name}}, command : {{command}}";
        let root = "abc";
        let str = new WelcomePageTokenReplace().replaceText(text, false, root);
        let expected = `name : choco, command : choco install gauge`;
        assert.equal(str, expected);
        done();
    });

    test('should not replace {{hello}}', (done) => {
        let text = "name : {{hello}}, command : {{command}}";
        let root = "abc";
        let str = new WelcomePageTokenReplace().replaceText(text, false, root);
        let expected = `name : {{hello}}, command : choco install gauge`;
        assert.equal(str, expected);
        done();
    });

    teardown(() => {
        Object.defineProperty(process, 'platform', {
            value: this.originalPlatform
          });
    });
});