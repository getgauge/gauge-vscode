import * as assert from 'assert';
import { tmpdir } from 'os';
import { createSandbox } from 'sinon';
import * as child_process from 'child_process';
import { join } from 'path';
import { GaugeProject } from '../src/project/gaugeProject';
import { MavenProject } from '../src/project/mavenProject';
import { CLI } from '../src/cli';
import { window } from 'vscode';
import { GradleProject } from '../src/project/gradleProject';

suite('GaugeProject', () => {
    suite('.hasFile', () => {
        test('should tell if a given file path belongs to the project', () => {
            let pr = join(tmpdir(), 'gauge');
            let project = new GaugeProject(pr, { langauge: 'java', plugins: [] });
            assert.ok(project.hasFile(join(tmpdir(), 'gauge', 'specs', 'example.spec')));
        });

        test('should tell if a given file path does not belong to the project', () => {
            let pr = join(tmpdir(), 'gauge');
            let project = new GaugeProject(pr, { langauge: 'java', plugins: [] });
            assert.ok(!project.hasFile(join(tmpdir(), 'gauge2', 'specs', 'example.spec')));
        });

        test('should tell if a given file path belonga to the project for the root itself', () => {
            let pr = join(tmpdir(), 'gauge');
            let project = new GaugeProject(pr, { langauge: 'java', plugins: [] });
            assert.ok(project.hasFile(pr));
        });
    });

    suite('.envs', () => {
        let cli: CLI;
        let sandbox;
        setup( () => {
            sandbox = createSandbox();
            cli = sandbox.createStubInstance(CLI);
        });

        teardown(() => {
            sandbox.restore();
        });
        test('should return envs for maven project', () => {
            let pr = join(tmpdir(), 'gauge');
            let project = new MavenProject(pr, { langauge: 'java', plugins: [] });
            let stub = sandbox.stub(child_process, 'execSync');
            stub.returns("/user/local/gauge_custom_classspath/");
            assert.deepEqual(project.envs(cli), { gauge_custom_classpath: '/user/local/gauge_custom_classspath/'});
        });

        test('should show error message for maven project', () => {
            let pr = join(tmpdir(), 'gauge');
            let project = new MavenProject(pr, { langauge: 'java', plugins: [] });
            let expectedErrorMessage;
            sandbox.stub(window, 'showErrorMessage').callsFake((args) => expectedErrorMessage = args );
            sandbox.stub(child_process, 'execSync').throws({output: "Error message."});
            project.envs(cli);
            assert.deepEqual(expectedErrorMessage, "Error calculating project classpath.\t\nError message.");
        });

        test('should return envs for gradle project', () => {
            let pr = join(tmpdir(), 'gauge');
            let project = new GradleProject(pr, { langauge: 'java', plugins: [] });
            let stub = sandbox.stub(child_process, 'execSync');
            stub.returns("/user/local/gauge_custom_classspath/");
            assert.deepEqual(project.envs(cli), { gauge_custom_classpath: '/user/local/gauge_custom_classspath/'});
        });

        test('should show error message for gradle project', () => {
            let pr = join(tmpdir(), 'gauge');
            let project = new GradleProject(pr, { langauge: 'java', plugins: [] });
            let expectedErrorMessage;
            sandbox.stub(window, 'showErrorMessage').callsFake((args) => expectedErrorMessage = args );
            sandbox.stub(child_process, 'execSync').throws({output: "Error message."});
            project.envs(cli);
            assert.deepEqual(expectedErrorMessage, "Error calculating project classpath.\t\nError message.");
        });
    });

});
