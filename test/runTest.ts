import { runTests } from '@vscode/test-electron';
import * as path from 'path';
import { engines } from "../package.json";

async function go(version?: string) {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './');
        const testWorkspace = path.resolve(__dirname, '../../test/testdata/sampleProject');

        if (version===undefined){
            // run tests with current stable vscode version
            version = "stable";
        }
        console.log(`Running tests with version: ${version}`)

        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [testWorkspace, '--disable-extensions'],
            version: version
        });

    } catch (err) {
        console.error('---Failed to run tests---');
        console.error(err);
        process.exit(1);
    }
}

console.log(process.argv);

if (process.argv[2] && process.argv[2] === '--compatibility') {
    // Running the tests with the minimum vscode version that this plugin supports.
    // The version is directly taken from this plugins package version
    //
    // This rerun is here to catch incompatibilities of @types/vscode with the lsp
    // packages vscode-languageclient

    // Upgrading vscode-languageclient might require a @types/vscode version bump
    // (these version bumps are not mentioned in their release notes).
    // Bumping @types/vscode will require bumping the minimum supported vscode version in
    // package.json (engines["vscode"]) as well.
    // The value of engines["vscode"] cannot be a pinned version "~1.67.0" but must use the
    // minimum version notation "^1.67.0" indicating that this is the minimum supported
    // vscode version
    const version = engines["vscode"].replace("^", "");
    go(version)
} else {
    go()
}

