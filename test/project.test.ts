import * as assert from 'assert';
import { tmpdir } from 'os';
import { join } from 'path';
import { GaugeProject } from '../src/project/gaugeProject';

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

});
