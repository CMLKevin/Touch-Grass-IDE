import * as vscode from 'vscode';

/**
 * ActivityDetector monitors for AI tool activity.
 *
 * Note: VSCode's stable API doesn't provide terminal output streaming.
 * This implementation uses terminal state changes and timing heuristics.
 * For better detection, users can manually trigger the panel.
 */
export class ActivityDetector implements vscode.Disposable {
  private isGenerating: boolean = false;
  private generationStartTime: number | null = null;
  private disposables: vscode.Disposable[] = [];
  private triggerTimeout: NodeJS.Timeout | null = null;
  private activeTerminalName: string = '';

  private _onGenerationStart = new vscode.EventEmitter<void>();
  private _onGenerationEnd = new vscode.EventEmitter<void>();

  public onGenerationStart = this._onGenerationStart.event;
  public onGenerationEnd = this._onGenerationEnd.event;

  // Terminal names that suggest AI tools
  private readonly AI_TERMINAL_PATTERNS = [
    /claude/i,
    /cursor/i,
    /copilot/i,
    /ai/i,
    /agent/i,
  ];

  public activate(): void {
    // Watch for active terminal changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTerminal((terminal) => {
        if (terminal) {
          this.handleTerminalChange(terminal);
        }
      })
    );

    // Watch for terminal creation
    this.disposables.push(
      vscode.window.onDidOpenTerminal((terminal) => {
        this.handleTerminalOpen(terminal);
      })
    );

    // Watch for terminal close
    this.disposables.push(
      vscode.window.onDidCloseTerminal((terminal) => {
        if (terminal.name === this.activeTerminalName && this.isGenerating) {
          this.endGeneration();
        }
      })
    );

    // Check initial terminals
    vscode.window.terminals.forEach((terminal) => {
      if (this.isAITerminal(terminal)) {
        this.handleTerminalOpen(terminal);
      }
    });

    // Periodic timeout check
    const intervalId = setInterval(() => this.checkGenerationTimeout(), 5000);
    this.disposables.push({ dispose: () => clearInterval(intervalId) });
  }

  private isAITerminal(terminal: vscode.Terminal): boolean {
    return this.AI_TERMINAL_PATTERNS.some((pattern) => pattern.test(terminal.name));
  }

  private handleTerminalOpen(terminal: vscode.Terminal): void {
    if (this.isAITerminal(terminal)) {
      // AI terminal opened - likely starting generation
      this.activeTerminalName = terminal.name;
      this.startGeneration();
    }
  }

  private handleTerminalChange(terminal: vscode.Terminal): void {
    // When switching to an AI terminal, assume it might be generating
    if (this.isAITerminal(terminal) && !this.isGenerating) {
      this.activeTerminalName = terminal.name;
      // Don't auto-start, let the user manually trigger or wait for terminal open
    }
  }

  private startGeneration(): void {
    if (this.isGenerating) return;

    this.isGenerating = true;
    this.generationStartTime = Date.now();

    // Delay before showing panel (avoid flashing for quick operations)
    this.triggerTimeout = setTimeout(() => {
      if (this.isGenerating) {
        this._onGenerationStart.fire();
      }
    }, 2000);
  }

  private endGeneration(): void {
    if (!this.isGenerating) return;

    this.isGenerating = false;
    this.generationStartTime = null;

    if (this.triggerTimeout) {
      clearTimeout(this.triggerTimeout);
      this.triggerTimeout = null;
    }

    this._onGenerationEnd.fire();
  }

  private checkGenerationTimeout(): void {
    // Auto-end generation after 5 minutes (assumed completion)
    if (this.isGenerating && this.generationStartTime) {
      const elapsed = Date.now() - this.generationStartTime;
      if (elapsed > 300000) {
        this.endGeneration();
      }
    }
  }

  /**
   * Manually trigger generation start (for users to call via command)
   */
  public manualStart(): void {
    this.startGeneration();
    // Immediately fire if manual
    if (this.triggerTimeout) {
      clearTimeout(this.triggerTimeout);
      this.triggerTimeout = null;
    }
    this._onGenerationStart.fire();
  }

  /**
   * Manually trigger generation end
   */
  public manualEnd(): void {
    this.endGeneration();
  }

  public dispose(): void {
    if (this.triggerTimeout) {
      clearTimeout(this.triggerTimeout);
    }
    this._onGenerationStart.dispose();
    this._onGenerationEnd.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
