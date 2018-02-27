import { QuickPickItem } from 'vscode';

export class FileListItem implements QuickPickItem {
    label: string;
    description: string;
    value: string;

    constructor(l: string, d: string, v: string) {
        this.label = l;
        this.description = d;
        this.value = v;
    }
}
