import * as assert from 'assert';
import * as path from 'path';
import { execute } from '../../src/execution/gaugeExecution'

suite('Gauge Execution Tests', () => {
	this.timeout(10000);
	test('should execute given specification', (done) => {
		let spec = path.join(__dirname, '..', '..', '..', 'test', 'testdata', 'sampleProject', 'specs', 'example.spec');
		execute(spec,false).then((status) => {
			assert.ok(status);
			done();
		}, (err) => {
            assert.ok(false,  'Error: ' + err);
            done();
        });
	});

	test('should execute given scenario', (done) => {
		let spec = path.join(__dirname, '..', '..', '..', 'test', 'testdata', 'sampleProject', 'specs', 'example.spec:6');
		execute(spec,false).then((status) => {
			assert.ok(status);
			done();
		}, (err) => {
            assert.ok(false,  'Error: ' + err);
            done();
        });
	});
});
