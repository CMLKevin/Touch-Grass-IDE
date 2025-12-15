import * as vscode from 'vscode';

export interface PomodoroState {
  isActive: boolean;
  mode: 'work' | 'break' | 'longBreak';
  timeRemaining: number; // seconds
  sessionsCompleted: number;
  totalWorkTime: number; // seconds
  totalBreakTime: number; // seconds
}

export class PomodoroManager implements vscode.Disposable {
  private state: PomodoroState = {
    isActive: false,
    mode: 'work',
    timeRemaining: 25 * 60,
    sessionsCompleted: 0,
    totalWorkTime: 0,
    totalBreakTime: 0,
  };

  private timer: NodeJS.Timeout | null = null;
  private disposables: vscode.Disposable[] = [];

  // Settings
  private workDuration = 25 * 60; // 25 minutes
  private breakDuration = 5 * 60; // 5 minutes
  private longBreakDuration = 15 * 60; // 15 minutes
  private sessionsUntilLongBreak = 4;

  private _onStateChange = new vscode.EventEmitter<PomodoroState>();
  public onStateChange = this._onStateChange.event;

  private _onWorkComplete = new vscode.EventEmitter<void>();
  public onWorkComplete = this._onWorkComplete.event;

  private _onBreakComplete = new vscode.EventEmitter<void>();
  public onBreakComplete = this._onBreakComplete.event;

  constructor(private context: vscode.ExtensionContext) {
    this.loadState();
  }

  private loadState(): void {
    const saved = this.context.globalState.get<Partial<PomodoroState>>('pomodoro-state');
    if (saved) {
      this.state = { ...this.state, ...saved, isActive: false };
      this.state.timeRemaining = this.getDurationForMode(this.state.mode);
    }
  }

  private saveState(): void {
    this.context.globalState.update('pomodoro-state', {
      sessionsCompleted: this.state.sessionsCompleted,
      totalWorkTime: this.state.totalWorkTime,
      totalBreakTime: this.state.totalBreakTime,
    });
  }

  private getDurationForMode(mode: 'work' | 'break' | 'longBreak'): number {
    switch (mode) {
      case 'work':
        return this.workDuration;
      case 'break':
        return this.breakDuration;
      case 'longBreak':
        return this.longBreakDuration;
    }
  }

  public start(): void {
    if (this.state.isActive) return;

    this.state.isActive = true;
    this.timer = setInterval(() => this.tick(), 1000);
    this._onStateChange.fire({ ...this.state });
  }

  public pause(): void {
    if (!this.state.isActive) return;

    this.state.isActive = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this._onStateChange.fire({ ...this.state });
  }

  public reset(): void {
    this.pause();
    this.state.timeRemaining = this.getDurationForMode(this.state.mode);
    this._onStateChange.fire({ ...this.state });
  }

  public skip(): void {
    this.pause();
    this.completeCurrentPhase();
  }

  private tick(): void {
    if (this.state.timeRemaining > 0) {
      this.state.timeRemaining--;

      // Track time
      if (this.state.mode === 'work') {
        this.state.totalWorkTime++;
      } else {
        this.state.totalBreakTime++;
      }

      this._onStateChange.fire({ ...this.state });
    } else {
      this.completeCurrentPhase();
    }
  }

  private completeCurrentPhase(): void {
    this.pause();

    if (this.state.mode === 'work') {
      // Work session completed
      this.state.sessionsCompleted++;
      this._onWorkComplete.fire();

      // Show notification
      vscode.window.showInformationMessage(
        `🍅 Pomodoro complete! Time for a ${this.shouldTakeLongBreak() ? 'long ' : ''}break.`,
        'Start Break',
        'Skip'
      ).then((choice) => {
        if (choice === 'Start Break') {
          this.startBreak();
        }
      });
    } else {
      // Break completed
      this._onBreakComplete.fire();

      vscode.window.showInformationMessage(
        '⏰ Break over! Ready to focus?',
        'Start Work',
        'Skip'
      ).then((choice) => {
        if (choice === 'Start Work') {
          this.startWork();
        }
      });
    }

    this.saveState();
  }

  private shouldTakeLongBreak(): boolean {
    return this.state.sessionsCompleted % this.sessionsUntilLongBreak === 0;
  }

  public startWork(): void {
    this.state.mode = 'work';
    this.state.timeRemaining = this.workDuration;
    this.start();
  }

  public startBreak(): void {
    if (this.shouldTakeLongBreak()) {
      this.state.mode = 'longBreak';
      this.state.timeRemaining = this.longBreakDuration;
    } else {
      this.state.mode = 'break';
      this.state.timeRemaining = this.breakDuration;
    }
    this.start();
  }

  public getState(): PomodoroState {
    return { ...this.state };
  }

  public getFormattedTime(): string {
    const minutes = Math.floor(this.state.timeRemaining / 60);
    const seconds = this.state.timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  public getStats(): { sessions: number; workTime: string; breakTime: string } {
    const formatTime = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      if (hours > 0) {
        return `${hours}h ${mins}m`;
      }
      return `${mins}m`;
    };

    return {
      sessions: this.state.sessionsCompleted,
      workTime: formatTime(this.state.totalWorkTime),
      breakTime: formatTime(this.state.totalBreakTime),
    };
  }

  public dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this._onStateChange.dispose();
    this._onWorkComplete.dispose();
    this._onBreakComplete.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.saveState();
  }
}
