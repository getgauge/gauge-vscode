import * as assert from 'assert';
import * as child_process from 'child_process';
import { platform } from 'os';
import { createSandbox, SinonSandbox } from 'sinon';
import { CLI } from '../src/cli';
import { MAVEN_COMMAND } from '../src/constants';

suite('CLI.getCommand MAVEN_COMMAND', () => {
    let sandbox: SinonSandbox;

    setup(() => {
        sandbox = createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('returns correct mvn command string', () => {
        // Stub spawnSync to simulate command resolution based on platform.
        sandbox.stub(child_process, 'spawnSync').callsFake(
            (command: string, args?: readonly string[], options?: child_process.SpawnSyncOptions) => {
                const successResult = {
                    pid: 1234,
                    output: [ '', Buffer.from(''), Buffer.from('') ],
                    stdout: Buffer.from(''),
                    stderr: Buffer.from(''),
                    status: 0,
                    signal: null,
                    error: null
                };

                const failureResult = {
                    pid: 1234,
                    output: [ '', Buffer.from(''), Buffer.from('') ],
                    stdout: Buffer.from(''),
                    stderr: Buffer.from(''),
                    status: 1,
                    signal: null,
                    error: new Error('command not found')
                };

                if (platform() === 'win32') {
                    // On Windows, only "mvn.cmd" should succeed.
                    return command === `${MAVEN_COMMAND}.cmd` ? successResult : failureResult;
                } else {
                    // On non-Windows, only "mvn" should succeed.
                    return command === MAVEN_COMMAND ? successResult : failureResult;
                }
            }
        );

        const actual = (CLI as any).getCommand(MAVEN_COMMAND);
        if (platform() === 'win32') {
            assert.strictEqual(actual, `${MAVEN_COMMAND}.cmd`);
        } else {
            assert.strictEqual(actual, MAVEN_COMMAND);
        }
    });
});