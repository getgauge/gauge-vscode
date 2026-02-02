'use strict';

export class LineBuffer {
    private buf: string = '';
    private lineListeners: { (line: string): void; }[] = [];
    private lastListeners: { (last: string): void; }[] = [];

    append(chunk: string) {
        this.buf += chunk;
        do {
            const idx = this.buf.indexOf('\n');
            if (idx === -1) {
                break;
            }

            this.fireLine(this.buf.substring(0, idx));
            this.buf = this.buf.substring(idx + 1);
            // eslint-disable-next-line no-constant-condition
        } while (true);
    }

    done() {
        this.fireDone(this.buf !== '' ? this.buf : null);
    }

    private fireLine(line: string) {
        this.lineListeners.forEach((listener) => listener(line));
    }

    private fireDone(last: string) {
        this.lastListeners.forEach((listener) => listener(last));
    }

    onLine(listener: (line: string) => void) {
        this.lineListeners.push(listener);
    }

    onDone(listener: (last: string) => void) {
        this.lastListeners.push(listener);
    }
}
