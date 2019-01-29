import * as assert from 'assert';
import { GaugeClients } from '../src/gaugeClients';
import { GaugeProject } from '../src/project/gaugeProject';
import { tmpdir } from 'os';
import { join } from 'path';
import { LanguageClient } from 'vscode-languageclient';
suite('GaugeClients', () => {

    test('.get should give the project and client for given project root if exists', () => {
        let pr = join(tmpdir(), 'gauge');
        let gaugeProject = new GaugeProject(pr, { langauge: 'java', plugins: {} });
        let clients = new GaugeClients();
        clients.set(pr, { project: gaugeProject, client: new LanguageClient("gauge", null, null) });
        assert.equal(clients.get(pr).project, gaugeProject);
    });

    test('.get should give the project and client for given file if blongs to a existing project', () => {
        let pr = join(tmpdir(), 'gauge');
        let spec = join(pr, "specs", "example.spec");
        let gaugeProject = new GaugeProject(pr, { langauge: 'java', plugins: {} });
        let clients = new GaugeClients();
        clients.set(pr, { project: gaugeProject, client: new LanguageClient("gauge", null, null) });
        assert.ok(clients.get(pr));
        assert.equal(clients.get(spec).project, gaugeProject);
    });

    test('.get should give undefined is the given path does not belong to any project', () => {
        let tmp = tmpdir();
        let pr = join(tmp, 'gauge');
        let spec = join(tmp, "gauge2", "foo.spec");
        let gaugeProject = new GaugeProject(pr, { langauge: 'java', plugins: {} });
        let clients = new GaugeClients();
        clients.set(pr, { project: gaugeProject, client: new LanguageClient("gauge", null, null) });
        assert.ok(clients.get(spec) === undefined);
    });

});
