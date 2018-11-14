import * as assert from 'assert';
import { WelcomePageTokenReplace } from '../../src/pages/welcomePageTokenReplace';

suite('Welcome Page', () => {
    setup(() => {
        this.originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', {
            value: 'win32'
          });
    });

    test('should replace the given text with given values', (done) => {
        let text = "name : {{name}}, command : {{command}}";
        let root = "abc";
        let str = new WelcomePageTokenReplace().replaceText(text, false, true, root);
        let expected = `name : choco, command : choco install gauge`;
        assert.equal(str, expected);
        done();
    });

    test('should set activated when gauge is activated', (done) => {
        let text = "action {{activated}}";
        let str = new WelcomePageTokenReplace().replaceText(text, false, true, "");
        let expected = `action activated`;
        assert.equal(str, expected);
        done();
    });

    test('should set disabled when gauge is not activated', (done) => {
        let text = "action {{activated}}";
        let str = new WelcomePageTokenReplace().replaceText(text, false, false, "");
        let expected = `action disabled`;
        assert.equal(str, expected);
        done();
    });

    test('should not replace {{hello}}', (done) => {
        let text = "name : {{hello}}, command : {{command}}";
        let root = "abc";
        let str = new WelcomePageTokenReplace().replaceText(text, false, true, root);
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