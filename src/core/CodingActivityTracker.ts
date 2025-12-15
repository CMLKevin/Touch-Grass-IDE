import * as vscode from 'vscode';
import { CurrencyManager } from './CurrencyManager';
import { StateManager } from './StateManager';

export class CodingActivityTracker implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private lastActivityTime: number = Date.now();
  private isActive: boolean = false;
  private tickInterval: NodeJS.Timeout | null = null;
  private idleTimeout: number = 30000; // 30 seconds
  private isPanelVisible: boolean = false;
  private isAIGenerating: boolean = false;
  private isPomodoroWorkMode: boolean = false;

  constructor() {
    this.setupListeners();
    this.startTicking();
  }

  private setupListeners(): void {
    // Document text changes (typing)
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.contentChanges.length > 0) {
          this.recordActivity();
        }
      })
    );

    // Document saves
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument(() => {
        this.recordActivity();
      })
    );

    // File switching
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.recordActivity();
      })
    );

    // Window focus
    this.disposables.push(
      vscode.window.onDidChangeWindowState((e) => {
        if (e.focused) {
          this.recordActivity();
        } else {
          this.isActive = false;
        }
      })
    );

    // Update idle timeout from settings
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('touchgrass.idleTimeout')) {
          const config = vscode.workspace.getConfiguration('touchgrass');
          this.idleTimeout = (config.get<number>('idleTimeout') || 30) * 1000;
        }
      })
    );

    // Load initial settings
    const config = vscode.workspace.getConfiguration('touchgrass');
    this.idleTimeout = (config.get<number>('idleTimeout') || 30) * 1000;
  }

  private recordActivity(): void {
    this.lastActivityTime = Date.now();
    this.isActive = true;
  }

  public setPanelVisible(visible: boolean): void {
    this.isPanelVisible = visible;
  }

  public setAIGenerating(generating: boolean): void {
    this.isAIGenerating = generating;
  }

  public setPomodoroWorkMode(isWorkMode: boolean): void {
    this.isPomodoroWorkMode = isWorkMode;
  }

  private startTicking(): void {
    // Award coins every second when actively coding
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick(): void {
    const config = vscode.workspace.getConfiguration('touchgrass');
    const casinoEnabled = config.get<boolean>('casinoEnabled', true);

    if (!casinoEnabled) {
      return;
    }

    const now = Date.now();
    const timeSinceActivity = now - this.lastActivityTime;

    // Check if we should award coins: panel open + Pomodoro work mode active
    const shouldAward = this.isPanelVisible && this.isPomodoroWorkMode;

    if (shouldAward) {
      try {
        const earningRate = config.get<number>('earningRate', 1);
        CurrencyManager.getInstance().addCoins(earningRate, 'coding');
      } catch {
        // CurrencyManager not initialized yet
      }
    }
  }

  public dispose(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
    this.disposables.forEach(d => d.dispose());
  }
}
