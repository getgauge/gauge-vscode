export interface Page {
    content(): string | Thenable<string>;
}