import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { sign, verify } from 'jsonwebtoken';

/**
 * Manages webview panels
 */
class JWTDebuggerViewPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: JWTDebuggerViewPanel | undefined;

  private static readonly viewType = 'JWTDebugger';

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionPath: string;
  private readonly builtAppFolder: string;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionPath: string): JWTDebuggerViewPanel {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    // If we already have a panel, show it.
    // Otherwise, create Gradle 360 panel.
    if (JWTDebuggerViewPanel.currentPanel) {
      JWTDebuggerViewPanel.currentPanel.panel.reveal(column);
    } else {
      JWTDebuggerViewPanel.currentPanel = new JWTDebuggerViewPanel(extensionPath, column || vscode.ViewColumn.One);
    }
    return JWTDebuggerViewPanel.currentPanel;
  }

  private constructor(extensionPath: string, column: vscode.ViewColumn) {
    this.extensionPath = extensionPath;
    this.builtAppFolder = 'dist';

    // Create and show a new webview panel
    this.panel = vscode.window.createWebviewPanel(JWTDebuggerViewPanel.viewType, 'JWT Debugger', column, {
      // Enable javascript in the webview
      enableScripts: true,

      retainContextWhenHidden: true,

      localResourceRoots: [vscode.Uri.file(path.join(this.extensionPath, this.builtAppFolder))]
    });

    // Set the webview's initial html content
    this.panel.webview.html = this._getHtmlForWebview();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programatically
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      (message: any) => {
        switch (message.command) {
          case 'verifyJwt':
            this.verifyJwt(message.jwt, message.secret);
            break;
          case 'sign':
            this.sign(message.payload, message.secret);
            break;
        }
      },
      null,
      this.disposables
    );

    vscode.window.onDidChangeActiveColorTheme((colorTheme: vscode.ColorTheme) => {
      this.setColorTheme(colorTheme);
    });
  }

  sign(payload: any, secret: string) {
    const jwt = sign(payload, secret);

    this.panel.webview.postMessage({
      command: 'signed',
      jwt
    });
  }

  verifyJwt(jwt: string, secret: string) {
    try {
      verify(jwt, secret);
      this.panel.webview.postMessage({
        command: 'verifyJwtResult',
        signatureVerified: true
      });
    } catch {
      this.panel.webview.postMessage({
        command: 'verifyJwtResult',
        signatureVerified: false
      });
    }
  }

  setColorTheme(colorTheme: vscode.ColorTheme) {
    this.panel.webview.postMessage({
      command: 'colorTheme',
      colorTheme
    });
  }

  public dispose() {
    JWTDebuggerViewPanel.currentPanel = undefined;

    // Clean up our resources
    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Returns html of the start page (index.html)
   */
  private _getHtmlForWebview() {
    // path to dist folder
    const appDistPath = path.join(this.extensionPath, 'dist');
    const appDistPathUri = vscode.Uri.file(appDistPath);

    // path as uri
    const baseUri = this.panel.webview.asWebviewUri(appDistPathUri);

    // get path to index.html file from dist folder
    const indexPath = path.join(appDistPath, 'index.html');

    // read index file from file system
    let indexHtml = fs.readFileSync(indexPath, { encoding: 'utf8' });

    // update the base URI tag
    indexHtml = indexHtml.replace('<base href="/">', `<base href="${String(baseUri)}/">`);

    return indexHtml;
  }
}

/**
 * Activates extension
 * @param context vscode extension context
 */
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('vscode-jwt-debugger.show', () => {
    JWTDebuggerViewPanel.createOrShow(context.extensionPath);
  }));
}
