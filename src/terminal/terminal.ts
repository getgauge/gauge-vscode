import { Disposable, window, ExtensionContext, commands, Terminal } from "vscode";
import { GaugeVSCodeCommands } from "../constants";

let terminalStack: Terminal[] = [];

export class TerminalProvider extends Disposable {
    private readonly _context: ExtensionContext;
    private readonly _disposable: Disposable;
    constructor(context: ExtensionContext) {
        super(() => this.dispose());
        this._context = context;
        this._disposable = Disposable.from(
            commands.registerCommand(GaugeVSCodeCommands.ExecuteInTerminal, (text: string) => {
                terminalStack.push(window.createTerminal('gauge install'));
                getLatestTerminal().show();
                getLatestTerminal().sendText(text);
            }
        ));
    }
}

function getLatestTerminal() {
    return terminalStack[terminalStack.length - 1];
}
