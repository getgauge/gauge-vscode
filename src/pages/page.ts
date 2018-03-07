export interface Page {
    content(): string | Thenable<string>;
}

export const welcomeUri = "gauge://global/welcome";
export const reportUri = "gauge://workspace/htmlreport";
