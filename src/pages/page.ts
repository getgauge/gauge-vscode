'use strict';

export interface Page {
    content(activated: Boolean): string | Thenable<string>;
}