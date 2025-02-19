import * as assert from 'assert';
import * as child_process from 'child_process';
import { join } from 'path';
import { platform } from 'os';
import { createSandbox, SinonSandbox } from 'sinon';
import { CLI } from '../src/cli';
import { MAVEN_COMMAND } from '../src/constants';
import { buildRunArgs } from '../src/execution/runArgs';

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

suite('Actual Gauge Run Spec Execution', () => {

    test('executes "Run Spec" for a maven project via Maven args and verifies output', function () {
        // Increase timeout for long-running processes.
        this.timeout(15000);

        // Adjust projectRoot correctly from the compiled out directory to the source testdata folder.
        const projectRoot = join(__dirname, '..', '..', 'test', 'testdata', 'mavenProject');
        // Use a relative path for the spec file so that -DspecsDir is set to "specs"
        const specFile = join('specs', 'example.spec');

        // Build the Maven arguments using the extension’s runArgs logic.
        // With a relative spec, buildMavenArgs should produce -DspecsDir=specs.
        const args = buildRunArgs.forMaven(specFile, {}); // Use default options

        // Get the Maven command (mvn or mvn.cmd) from the CLI.
        const mavenCmd = (CLI as any).getCommand(MAVEN_COMMAND);

        // Build the spawn options. Add shell: true on Windows.
        const spawnOptions: child_process.SpawnSyncOptions = {
            encoding: 'utf8',
            cwd: projectRoot
        };
        if (platform() === 'win32') {
            spawnOptions.shell = true;
        }

        // Echo mavenCmd, args, and spawnOptions to the console.
        //console.log('mavenCmd:', mavenCmd);
        //console.log('args:', args);
        //console.log('spawnOptions:', spawnOptions);

        // Spawn the Maven process with the constructed arguments.
        const result = child_process.spawnSync(mavenCmd, args, spawnOptions);

        // If an error occurred during spawnSync, fail the test.
        if (result.error) {
            assert.fail(`Error executing maven run: ${result.error.message}`);
        }

        // Verify that the process exited successfully.
        assert.strictEqual(result.status, 0, 'Process should exit with status 0');

        // Verify that stdout contains the expected specification summary.
        const expectedSubstring = 'Specifications:\t1 executed\t1 passed\t0 failed\t0 skipped';
        assert.ok(
            result.stdout.includes(expectedSubstring),
            `Expected output to include "${expectedSubstring}".\nActual output:\n${result.stdout}`
        );
    });
});