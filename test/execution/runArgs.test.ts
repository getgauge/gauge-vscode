import assert = require('assert');
import { buildRunArgs, extractGaugeRunOption } from '../../src/execution/runArgs';

suite("Gauge Run Args Tests", () => {
    suite('buildRunArgs.forGauge', () => {
        test('should ignore other args when failed flag is set', () => {
            assert.strictEqual(
                buildRunArgs.forGauge('my.spec:123', { failed: true, verbose: true }).join(' '),
                'run --failed');
        });

        test('should ignore other args when repeat flag is set', () => {
            assert.strictEqual(
                buildRunArgs.forGauge('my.spec:123', { repeat: true, verbose: true }).join(' '),
                'run --repeat');
        });

        test('should be formatted', () => {
            assert.strictEqual(
                buildRunArgs.forGauge('my.spec:123', {
                    tags: 'foo bar',
                    'max-retries-count': 3,
                    env: ['a', 'b', 'c'],
                    verbose: true,
                    // following should be ignored
                    failed: null,
                    repeat: false,
                    dir: null
                }).join(' '),
                'run --hide-suggestion --simple-console --tags foo bar --max-retries-count 3 --env a,b,c --verbose my.spec:123');
        });

        test('should not contain simple-console flag when parallel flag is set', () => {
            assert.strictEqual(
                buildRunArgs.forGauge('my.spec:123', { parallel: true }).join(' '),
                'run --hide-suggestion --parallel my.spec:123');
        });

        test('should be unsettable', () => {
            assert.strictEqual(
                buildRunArgs.forGauge(null, { 'hide-suggestion': false, 'simple-console': false }).join(' '),
                'run');
        });
    });

    suite('buildRunArgs.forGradle', () => {
        test('should ignore other args when failed flag is set', () => {
            assert.strictEqual(
                buildRunArgs.forGradle('my.spec:123', { failed: true }).join(' '),
                'clean gauge -PadditionalFlags=--failed');
        });

        test('should ignore other args when repeat flag is set', () => {
            assert.strictEqual(
                buildRunArgs.forGradle('my.spec:123', { repeat: true }).join(' '),
                'clean gauge -PadditionalFlags=--repeat');
        });

        test('should be formatted', () => {
            assert.strictEqual(
                buildRunArgs.forGradle('my.spec:123', {
                    tags: 'foo bar',
                    env: ['a', 'b', 'c'],
                    parallel: true,
                    n: 3,
                    // following should be ignored
                    failed: null,
                    repeat: false,
                    dir: null
                }).join(' '),
                'clean gauge -PinParallel=true -Pnodes=3 -Ptags=foo bar -Penv=a,b,c -PadditionalFlags=--hide-suggestion --simple-console -PspecsDir=my.spec:123');
        });

        test('should be unsettable', () => {
            assert.strictEqual(
                buildRunArgs.forGradle(null, { 'hide-suggestion': false, 'simple-console': false }).join(' '),
                'clean gauge');
        });
    });

    suite('buildRunArgs.forMaven', () => {
        test('should ignore other args when failed flag is set', () => {
            assert.strictEqual(
                buildRunArgs.forMaven('my.spec:123', { failed: true }).join(' '),
                '-q clean compile test-compile gauge:execute -Dflags=--failed');
        });

        test('should ignore other args when repeat flag is set', () => {
            assert.strictEqual(
                buildRunArgs.forMaven('my.spec:123', { repeat: true }).join(' '),
                '-q clean compile test-compile gauge:execute -Dflags=--repeat');
        });

        test('should be formatted', () => {
            assert.strictEqual(
                buildRunArgs.forMaven('my.spec:123', {
                    tags: 'foo bar',
                    env: ['a', 'b', 'c'],
                    parallel: true,
                    n: 3,
                    // following should be ignored
                    failed: null,
                    repeat: false,
                    dir: null
                }).join(' '),
                '-q clean compile test-compile gauge:execute -DinParallel=true -Dnodes=3 -Dtags=foo bar -Denv=a,b,c -Dflags=--hide-suggestion,--simple-console -DspecsDir=my.spec:123');
        });

        test('should be unsettable', () => {
            assert.strictEqual(
                buildRunArgs.forMaven(null, { 'hide-suggestion': false, 'simple-console': false }).join(' '),
                '-q clean compile test-compile gauge:execute');
        });

    });

    suite('extractGaugeRunOption', () => {
        test('should extract only gauge run options from the first gauge:test entry', () => {
            const configs = [
                { type: 'foo', name: '1', request: 'launch', tags: 'fail' },
                { type: 'bar', name: '2', request: 'test', tags: 'fail' },
                { type: 'gauge', name: '3', request: 'attach', tags: 'fail' },
                { type: 'gauge', name: '4', request: 'test', tags: 'hit', unknown: 'prop' },
                { type: 'gauge', name: '5', request: 'test', tags: 'fail' }
            ]
            assert.deepStrictEqual(extractGaugeRunOption(configs), { tags: 'hit' });
        });

        test('should return empty object when no gauge:test entry is found', () => {
            const configs = [
                { type: 'foo', name: '1', request: 'launch' },
                { type: 'bar', name: '2', request: 'test' },
                { type: 'gauge', name: '3', request: 'attach' },
            ]
            assert.deepStrictEqual(extractGaugeRunOption(configs), {});
        });

        test('should return empty object for null', () => {
            assert.deepStrictEqual(extractGaugeRunOption(null), {});
        });
    });
});