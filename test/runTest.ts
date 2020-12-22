import * as path from 'path';


import { runTests } from 'vscode-test';

async function go() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './');
        const testWorkspace = path.resolve(__dirname, './testdata');

        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [testWorkspace,'--disable-extensions']
        });


    } catch (err) {
        console.error('---Failed to run tests---');
        console.error(err);
        process.exit(1);
    }
}

go()