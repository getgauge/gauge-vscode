import * as path from 'path';
import { FileListItem } from "./types/fileListItem";

const NEW_FILE = 'New File';
const COPY_TO_CLIPBOARD = 'Copy To Clipboard';

export function getFileLists(files: string[], cwd: string, copy = true): FileListItem[] {
    const showFileList: FileListItem[] = files.map((file) => {
        return new FileListItem(path.basename(file), path.relative(cwd, path.dirname(file)), file);
    });
    const quickPickFileList = [new FileListItem(NEW_FILE, "Create a new file", NEW_FILE)];
    if (copy) {
        quickPickFileList.push(new FileListItem(COPY_TO_CLIPBOARD, "", COPY_TO_CLIPBOARD));
    }
    return quickPickFileList.concat(showFileList);

}
