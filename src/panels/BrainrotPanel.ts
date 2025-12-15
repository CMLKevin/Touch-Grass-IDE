import * as vscode from 'vscode';
import { SessionTracker } from '../core/SessionTracker';
import { AchievementEngine } from '../core/AchievementEngine';
import { PomodoroManager, PomodoroState } from '../core/PomodoroManager';
import { CurrencyManager } from '../core/CurrencyManager';

export class BrainrotPanel {
  public static currentPanel: BrainrotPanel | undefined;
  private static _onVisibilityChange = new vscode.EventEmitter<boolean>();
  public static onVisibilityChange = BrainrotPanel._onVisibilityChange.event;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _context: vscode.ExtensionContext;
  private _disposables: vscode.Disposable[] = [];
  private _pomodoroManager: PomodoroManager | null = null;

  public static createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ): BrainrotPanel {
    const column = vscode.ViewColumn.Beside;

    if (BrainrotPanel.currentPanel) {
      BrainrotPanel.currentPanel._panel.reveal(column);
      return BrainrotPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'touchgrassBrainrot',
      '🌿 Touch Grass',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist', 'webview')],
      }
    );

    BrainrotPanel.currentPanel = new BrainrotPanel(panel, extensionUri, context);
    return BrainrotPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._context = context;

    // Initialize Pomodoro manager
    this._pomodoroManager = new PomodoroManager(context);
    this._pomodoroManager.onStateChange((state) => {
      this._sendPomodoroState(state);
    });

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Track visibility changes for currency earning
    this._panel.onDidChangeViewState(
      (e) => {
        BrainrotPanel._onVisibilityChange.fire(e.webviewPanel.visible);
        if (e.webviewPanel.visible) {
          this._sendBalance();
        }
      },
      null,
      this._disposables
    );

    // Fire initial visibility
    BrainrotPanel._onVisibilityChange.fire(true);

    this._panel.webview.onDidReceiveMessage(
      (message) => this._handleMessage(message),
      null,
      this._disposables
    );
  }

  public minimize(): void {
    if (this._panel.visible) {
      // VSCode doesn't have native minimize
    }
  }

  public show(): void {
    this._panel.reveal(vscode.ViewColumn.Beside);
  }

  private _handleMessage(message: { command: string; [key: string]: unknown }): void {
    switch (message.command) {
      case 'gamePlayed':
        try {
          SessionTracker.getInstance().recordGamePlayed(message.game as string);
          AchievementEngine.getInstance().check('first-game');
        } catch {
          // Not initialized
        }
        break;
      case 'gameScore':
        try {
          SessionTracker.getInstance().recordGameScore(
            message.game as string,
            message.score as number
          );
        } catch {
          // Not initialized
        }
        break;
      case 'socialOpened':
        try {
          AchievementEngine.getInstance().check('first-social');
        } catch {
          // Not initialized
        }
        break;
      case 'requestHighScores':
        this._sendHighScores();
        break;
      case 'requestPomodoroState':
        if (this._pomodoroManager) {
          this._sendPomodoroState(this._pomodoroManager.getState());
        }
        break;
      case 'pomodoroStart':
        this._pomodoroManager?.start();
        break;
      case 'pomodoroPause':
        this._pomodoroManager?.pause();
        break;
      case 'pomodoroReset':
        this._pomodoroManager?.reset();
        break;
      case 'pomodoroSkip':
        this._pomodoroManager?.skip();
        break;
      case 'pomodoroStartWork':
        this._pomodoroManager?.startWork();
        break;
      case 'pomodoroStartBreak':
        this._pomodoroManager?.startBreak();
        break;
      case 'openExternal':
        if (message.url && typeof message.url === 'string') {
          vscode.env.openExternal(vscode.Uri.parse(message.url));
        }
        break;
      case 'getBalance':
        this._sendBalance();
        break;
      case 'casinoBet':
        this._handleCasinoBet(message.amount as number);
        break;
      case 'casinoWin':
        this._handleCasinoWin(message.game as string, message.amount as number);
        break;
      case 'casinoLoss':
        this._handleCasinoLoss(message.amount as number);
        break;
      case 'casinoBlackjackWin':
        try {
          CurrencyManager.getInstance().recordBlackjackWin();
          AchievementEngine.getInstance().checkCasinoAchievements();
        } catch {
          // Not initialized
        }
        break;
      case 'updateSetting':
        this._updateSetting(message.key as string, message.value);
        break;
      case 'resetStats':
        vscode.commands.executeCommand('touchgrass.resetStats');
        break;
    }
  }

  private _updateSetting(key: string, value: unknown): void {
    const config = vscode.workspace.getConfiguration('touchgrass');
    config.update(key, value, vscode.ConfigurationTarget.Global);
  }

  private _sendBalance(): void {
    try {
      const balance = CurrencyManager.getInstance().getBalance();
      this._panel.webview.postMessage({
        command: 'balanceUpdate',
        balance,
      });
    } catch {
      // Not initialized
    }
  }

  private _handleCasinoBet(amount: number): void {
    try {
      const currency = CurrencyManager.getInstance();
      const success = currency.spendCoins(amount);
      this._panel.webview.postMessage({
        command: 'betResult',
        success,
        balance: currency.getBalance(),
      });
      if (success) {
        AchievementEngine.getInstance().check('first-gamble');
        if (amount >= 1000) {
          AchievementEngine.getInstance().check('high-roller');
        }
      }
    } catch {
      // Not initialized
    }
  }

  private _handleCasinoWin(game: string, amount: number): void {
    try {
      const currency = CurrencyManager.getInstance();
      currency.addCoins(amount, 'casino');
      this._sendBalance();

      // Check achievements
      const achievements = AchievementEngine.getInstance();
      if (currency.getBalance() >= 10000) {
        achievements.check('whale');
      }
      achievements.checkCasinoAchievements();
    } catch {
      // Not initialized
    }
  }

  private _handleCasinoLoss(amount: number): void {
    try {
      const currency = CurrencyManager.getInstance();
      currency.recordLoss(amount);
      this._sendBalance();

      // Check achievements
      const achievements = AchievementEngine.getInstance();
      if (currency.getBalance() === 0) {
        achievements.check('broke');
      }
      achievements.checkCasinoAchievements();
    } catch {
      // Not initialized
    }
  }

  private _sendHighScores(): void {
    try {
      const tracker = SessionTracker.getInstance();
      this._panel.webview.postMessage({
        command: 'highScoresUpdate',
        highScores: {
          snake: tracker.getHighScore('snake'),
          '2048': tracker.getHighScore('2048'),
          flappy: tracker.getHighScore('flappy'),
          tetris: tracker.getHighScore('tetris'),
        },
      });
    } catch {
      // Not initialized
    }
  }

  private _sendPomodoroState(state: PomodoroState): void {
    const formattedTime = this._pomodoroManager?.getFormattedTime() || '25:00';
    const stats = this._pomodoroManager?.getStats() || { sessions: 0, workTime: '0m', breakTime: '0m' };
    this._panel.webview.postMessage({
      command: 'pomodoroUpdate',
      state,
      formattedTime,
      stats,
    });
  }

  private _update(): void {
    this._panel.webview.html = this._getHtmlContent();
  }

  private _getHtmlContent(): string {
    const config = vscode.workspace.getConfiguration('touchgrass');
    const intensity = config.get<string>('brainrotIntensity', 'casual');
    const autoDetect = config.get<boolean>('autoDetect', true);
    const autoMinimize = config.get<boolean>('autoMinimize', true);
    const idleTimeout = config.get<number>('idleTimeout', 30);
    const casinoEnabled = config.get<boolean>('casinoEnabled', true);
    const earningRate = config.get<number>('earningRate', 1);
    const enableAchievements = config.get<boolean>('enableAchievements', true);

    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${this._panel.webview.cspSource} 'unsafe-inline';
        script-src 'nonce-${nonce}';
        img-src ${this._panel.webview.cspSource} https: data:;
        frame-src https://www.youtube.com https://www.tiktok.com https://twitter.com https://x.com https://www.reddit.com https:;
      ">
      <title>Touch Grass IDE</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #1e1e1e;
          color: #fff;
          min-height: 100vh;
        }
        .header {
          text-align: center;
          padding: 16px;
          border-bottom: 1px solid #3d3d3d;
        }
        .header h1 { font-size: 20px; color: #4ade80; }
        .status { font-size: 12px; color: #fbbf24; margin-top: 4px; }

        /* Tabs */
        .tab-nav {
          display: flex;
          border-bottom: 1px solid #3d3d3d;
          background: #252525;
        }
        .tab-btn {
          flex: 1;
          padding: 12px;
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        .tab-btn:hover { color: #fff; background: #2d2d2d; }
        .tab-btn.active { color: #4ade80; border-bottom: 2px solid #4ade80; background: #2d2d2d; }
        .tab-panel { display: none; padding: 16px; opacity: 0; transform: translateY(10px); transition: opacity 0.15s ease, transform 0.15s ease; }
        .tab-panel.active { display: block; opacity: 1; transform: translateY(0); }

        /* Games */
        .game-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .game-card {
          background: #2d2d2d;
          border: 2px solid #3d3d3d;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .game-card:hover { border-color: #4ade80; transform: translateY(-2px); }
        .game-icon { font-size: 32px; display: block; margin-bottom: 6px; }
        .game-name { font-weight: 600; display: block; font-size: 14px; }
        .game-highscore { font-size: 11px; color: #888; }
        .game-container { display: none; text-align: center; }
        .game-container.active { display: block; }
        #game-canvas { background: #1a1a1a; border-radius: 8px; max-width: 100%; }
        .game-ui { margin-top: 12px; display: flex; justify-content: space-between; align-items: center; }
        .game-score { font-size: 16px; font-weight: 600; }

        /* Social */
        .social-nav { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
        .social-btn {
          padding: 8px 16px;
          background: #2d2d2d;
          border: 1px solid #3d3d3d;
          border-radius: 20px;
          color: #fff;
          cursor: pointer;
          font-size: 13px;
        }
        .social-btn:hover { border-color: #4ade80; }
        .social-btn.active { background: #4ade80; color: #1e1e1e; border-color: #4ade80; }
        .embed-container {
          background: #2d2d2d;
          border-radius: 8px;
          height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .embed-container iframe { width: 100%; height: 100%; border: none; }
        .embed-placeholder { text-align: center; color: #888; }
        .embed-placeholder p { margin: 8px 0; }

        /* Settings */
        .settings-container { padding: 8px 0; }
        .settings-section {
          background: #2d2d2d;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .settings-section-title {
          font-size: 12px;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }
        .setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #3d3d3d;
        }
        .setting-row:last-child { border-bottom: none; }
        .setting-info { flex: 1; }
        .setting-label { font-size: 14px; color: #fff; }
        .setting-desc { font-size: 11px; color: #888; margin-top: 2px; }
        .setting-control { margin-left: 16px; }
        /* Toggle switch */
        .toggle {
          position: relative;
          width: 44px;
          height: 24px;
          background: #444;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .toggle.active { background: #4ade80; }
        .toggle::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: transform 0.2s;
        }
        .toggle.active::after { transform: translateX(20px); }
        /* Select dropdown */
        .setting-select {
          background: #444;
          border: none;
          color: #fff;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        }
        .setting-select:hover { background: #555; }
        /* Slider */
        .setting-slider {
          width: 100px;
          height: 6px;
          -webkit-appearance: none;
          background: #444;
          border-radius: 3px;
          cursor: pointer;
        }
        .setting-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: #4ade80;
          border-radius: 50%;
          cursor: pointer;
        }
        .slider-value {
          font-size: 12px;
          color: #4ade80;
          min-width: 30px;
          text-align: right;
          margin-left: 8px;
        }
        .slider-group { display: flex; align-items: center; }
        /* Danger button */
        .btn-danger {
          background: #dc2626;
          color: #fff;
        }
        .btn-danger:hover { background: #ef4444; }
        .settings-footer {
          text-align: center;
          padding: 16px;
          color: #666;
          font-size: 11px;
        }
        .settings-footer a { color: #4ade80; text-decoration: none; }
        .settings-footer a:hover { text-decoration: underline; }

        /* Pomodoro */
        .pomodoro-container { text-align: center; padding: 20px; }
        .pomodoro-mode {
          font-size: 14px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 8px;
        }
        .pomodoro-mode.work { color: #ef4444; }
        .pomodoro-mode.break { color: #4ade80; }
        .pomodoro-timer {
          font-size: 72px;
          font-weight: bold;
          font-family: 'SF Mono', Monaco, monospace;
          color: #fff;
          margin: 20px 0;
        }
        .pomodoro-controls {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin: 20px 0;
        }
        .pomodoro-stats {
          display: flex;
          justify-content: center;
          gap: 32px;
          margin: 24px 0;
          padding: 16px;
          background: #2d2d2d;
          border-radius: 8px;
        }
        .pomo-stat { text-align: center; }
        .pomo-stat-value {
          display: block;
          font-size: 24px;
          font-weight: bold;
          color: #4ade80;
        }
        .pomo-stat-label {
          display: block;
          font-size: 11px;
          color: #888;
          margin-top: 4px;
        }
        .pomodoro-info {
          color: #888;
          font-size: 12px;
          margin-top: 20px;
        }
        .pomodoro-info p { margin: 4px 0; }

        /* Buttons */
        .btn {
          background: #4ade80;
          color: #1e1e1e;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
        }
        .btn:hover { background: #22c55e; }
        .btn-secondary { background: #3d3d3d; color: #fff; }
        .btn-secondary:hover { background: #4d4d4d; }

        /* Casino */
        .casino-header {
          text-align: center;
          padding: 12px;
          background: linear-gradient(135deg, #1a472a 0%, #2d5a3f 100%);
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .balance-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 24px;
          font-weight: bold;
        }
        .balance-icon { font-size: 28px; }
        .balance-amount { color: #fbbf24; }
        .balance-label { color: #888; font-size: 14px; }
        .casino-card:hover { border-color: #fbbf24; }
        .casino-controls {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
          margin: 12px 0;
        }
        .casino-ui {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
        }
        .bet-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bet-controls input {
          width: 80px;
          padding: 6px;
          border-radius: 4px;
          border: 1px solid #3d3d3d;
          background: #2d2d2d;
          color: #fff;
          text-align: center;
        }
        .casino-info {
          text-align: center;
          color: #888;
          font-size: 12px;
          margin-top: 16px;
          padding: 12px;
          background: #252525;
          border-radius: 8px;
        }
        .casino-info p { margin: 4px 0; }
        .btn-bet { background: #fbbf24; color: #1e1e1e; }
        .btn-bet:hover { background: #f59e0b; }
        .btn-bet:disabled { background: #555; cursor: not-allowed; }
        .casino-result {
          text-align: center;
          padding: 20px;
          font-size: 24px;
          font-weight: bold;
        }
        .casino-result.win { color: #4ade80; }
        .casino-result.lose { color: #ef4444; }

        /* Game Over */
        .game-over-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.85);
          display: none; justify-content: center; align-items: center;
          z-index: 100;
          backdrop-filter: blur(4px);
        }
        .game-over-overlay.active { display: flex; animation: fadeIn 0.3s ease; }
        .game-over-content { background: #2d2d2d; padding: 32px; border-radius: 16px; text-align: center; animation: scaleIn 0.3s ease; }
        .game-over-content h2 { font-size: 24px; margin-bottom: 8px; }
        .final-score { font-size: 48px; font-weight: bold; color: #4ade80; margin: 16px 0; }
        .game-over-buttons { display: flex; gap: 12px; justify-content: center; margin-top: 20px; }

        /* ===== ANIMATIONS & TRANSITIONS ===== */
        /* Keyframe Animations */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes winPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes scorePop { 0% { transform: scale(1); } 50% { transform: scale(1.4); color: #4ade80; } 100% { transform: scale(1); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 5px rgba(74, 222, 128, 0.3); } 50% { box-shadow: 0 0 20px rgba(74, 222, 128, 0.6); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes coinDrop { 0% { transform: translateY(-50px) rotate(0deg); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(0) rotate(720deg); opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes flash { 0%, 50%, 100% { opacity: 1; } 25%, 75% { opacity: 0.3; } }

        /* Enhanced Transitions */
        .tab-btn, .game-card, .btn, .social-btn, .casino-card { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .tab-btn:hover { background: #3d3d3d; transform: translateY(-1px); }
        .tab-btn:active { transform: translateY(0); }
        .game-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(74, 222, 128, 0.25); }
        .game-card:active { transform: translateY(-2px) scale(0.98); }
        .casino-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(251, 191, 36, 0.3); border-color: #fbbf24; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3); }
        .btn:active { transform: translateY(0) scale(0.95); }
        .btn-bet:hover { box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4); }
        .social-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1); }

        /* Tab panel transitions */
        .tab-panel { animation: fadeIn 0.2s ease; }

        /* Win/Lose Effects */
        .win-effect { animation: winPulse 0.4s ease 3; }
        .lose-effect { animation: shake 0.4s ease; }
        .score-pop { animation: scorePop 0.3s ease; }

        /* Balance animations */
        .balance-amount { transition: all 0.3s ease; }
        .balance-amount.increase { color: #4ade80; animation: scorePop 0.3s ease; }
        .balance-amount.decrease { color: #ef4444; animation: shake 0.3s ease; }

        /* Game card glow on hover */
        .game-card::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 14px;
          background: linear-gradient(45deg, #4ade80, #22c55e, #4ade80);
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: -1;
        }
        .game-card { position: relative; overflow: visible; }
        .game-card:hover::before { opacity: 0.5; }
        .casino-card::before { background: linear-gradient(45deg, #fbbf24, #f59e0b, #fbbf24); }

        /* High score highlight */
        .new-high-score { animation: winPulse 0.5s ease infinite; color: #fbbf24 !important; }

        /* Loading spinner */
        .loading { animation: spin 1s linear infinite; }
      </style>
    </head>
    <body class="intensity-${intensity}">
      <div class="header">
        <h1>🌿 Touch Grass IDE</h1>
        <div class="status">AI is cooking...</div>
      </div>

      <nav class="tab-nav">
        <button class="tab-btn active" data-tab="games">🎮 Games</button>
        <button class="tab-btn" data-tab="pomodoro">🍅 Pomodoro</button>
        <button class="tab-btn" data-tab="social">📱 Social</button>
        <button class="tab-btn" data-tab="settings">⚙️ Settings</button>
      </nav>

      <!-- Games Tab -->
      <section id="games-tab" class="tab-panel active">
        <div class="casino-header">
          <div class="balance-display">
            <span class="balance-icon">🪙</span>
            <span class="balance-amount" id="casino-balance">0</span>
            <span class="balance-label">GC</span>
          </div>
        </div>
        <div id="game-selection" class="game-grid">
          <div class="game-card" data-game="snake">
            <span class="game-icon">🐍</span>
            <span class="game-name">Snake</span>
            <span class="game-highscore">High: <span id="snake-high">0</span></span>
          </div>
          <div class="game-card" data-game="flappy">
            <span class="game-icon">🐦</span>
            <span class="game-name">Flappy</span>
            <span class="game-highscore">High: <span id="flappy-high">0</span></span>
          </div>
          <div class="game-card casino-card" data-game="plinko">
            <span class="game-icon">🎱</span>
            <span class="game-name">Plinko</span>
            <span class="game-highscore">Watch it drop!</span>
          </div>
          <div class="game-card casino-card" data-game="slots">
            <span class="game-icon">🎰</span>
            <span class="game-name">Slots</span>
            <span class="game-highscore">Spin to win!</span>
          </div>
        </div>
        <div id="game-container" class="game-container">
          <canvas id="game-canvas" width="320" height="400"></canvas>
          <div class="game-controls" id="game-controls"></div>
          <div class="game-ui">
            <span class="game-score">Score: <span id="current-score">0</span></span>
            <div class="bet-controls" id="bet-controls" style="display: none;">
              <label>Bet: </label>
              <input type="number" id="bet-amount" value="10" min="1" step="10">
              <span>GC</span>
            </div>
            <button class="btn btn-secondary" id="back-btn">← Back</button>
          </div>
        </div>
        <div class="casino-info">
          <p>💰 Earn <strong>1 GC/second</strong> while coding</p>
          <p>🎮 Panel must be closed to earn</p>
        </div>
      </section>

      <!-- Pomodoro Tab -->
      <section id="pomodoro-tab" class="tab-panel">
        <div class="pomodoro-container">
          <div class="pomodoro-mode" id="pomodoro-mode">Work Time</div>
          <div class="pomodoro-timer" id="pomodoro-timer">25:00</div>
          <div class="pomodoro-controls">
            <button class="btn btn-secondary" id="pomo-reset-btn">Reset</button>
            <button class="btn" id="pomo-toggle-btn">Start</button>
            <button class="btn btn-secondary" id="pomo-skip-btn">Skip</button>
          </div>
          <div class="pomodoro-stats">
            <div class="pomo-stat">
              <span class="pomo-stat-value" id="pomo-sessions">0</span>
              <span class="pomo-stat-label">Sessions</span>
            </div>
            <div class="pomo-stat">
              <span class="pomo-stat-value" id="pomo-work-time">0m</span>
              <span class="pomo-stat-label">Work Time</span>
            </div>
            <div class="pomo-stat">
              <span class="pomo-stat-value" id="pomo-break-time">0m</span>
              <span class="pomo-stat-label">Break Time</span>
            </div>
          </div>
          <div class="pomodoro-info">
            <p>🍅 <strong>Pomodoro Technique</strong></p>
            <p>25 min work → 5 min break</p>
            <p>Every 4 sessions: 15 min long break</p>
          </div>
        </div>
      </section>

      <!-- Social Tab -->
      <section id="social-tab" class="tab-panel">
        <div class="social-nav">
          <button class="social-btn" data-social="youtube">📺 Shorts</button>
          <button class="social-btn" data-social="tiktok">🎵 TikTok</button>
          <button class="social-btn" data-social="twitter">𝕏 Twitter</button>
          <button class="social-btn" data-social="reddit">🤖 Reddit</button>
        </div>
        <div class="embed-container" id="social-embed-container">
          <div class="embed-placeholder">
            <p>📱 Select a platform above</p>
            <p style="font-size: 12px;">YouTube embeds directly, others open in browser</p>
          </div>
        </div>
        <div id="youtube-controls" style="display:none; margin-top: 12px;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 12px;">
            <button class="btn btn-secondary yt-category active" data-category="programming">💻 Coding</button>
            <button class="btn btn-secondary yt-category" data-category="lofi">🎵 Lo-Fi</button>
            <button class="btn btn-secondary yt-category" data-category="satisfying">✨ Satisfying</button>
            <button class="btn btn-secondary yt-category" data-category="memes">😂 Memes</button>
          </div>
          <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 12px;">
            <button class="btn btn-secondary" id="yt-prev-btn">← Prev</button>
            <button class="btn" id="yt-next-btn">Next →</button>
          </div>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="youtube-url-input" placeholder="Paste YouTube/Shorts URL..." style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid #3d3d3d; background: #2d2d2d; color: #fff;">
            <button class="btn" id="youtube-load-btn">Load</button>
          </div>
        </div>
        <div id="external-link-container" style="display:none; text-align: center; padding: 40px;">
          <div style="font-size: 64px; margin-bottom: 16px;" id="external-icon">📱</div>
          <h3 id="external-title" style="margin-bottom: 8px;">Open in Browser</h3>
          <p style="color: #888; margin-bottom: 20px; font-size: 13px;" id="external-desc">This platform doesn't support embedding. Click below to open in your browser.</p>
          <button class="btn" id="open-external-btn">Open <span id="external-name">Platform</span> →</button>
        </div>
      </section>

      <!-- Settings Tab -->
      <section id="settings-tab" class="tab-panel">
        <div class="settings-container">
          <!-- Behavior Section -->
          <div class="settings-section">
            <div class="settings-section-title">Behavior</div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Auto-detect AI generation</div>
                <div class="setting-desc">Show panel when AI starts generating</div>
              </div>
              <div class="setting-control">
                <div class="toggle ${autoDetect ? 'active' : ''}" id="setting-autodetect"></div>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Auto-minimize</div>
                <div class="setting-desc">Hide panel when AI finishes</div>
              </div>
              <div class="setting-control">
                <div class="toggle ${autoMinimize ? 'active' : ''}" id="setting-autominimize"></div>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Idle timeout</div>
                <div class="setting-desc">Seconds before considered idle</div>
              </div>
              <div class="setting-control">
                <div class="slider-group">
                  <input type="range" class="setting-slider" id="setting-idle" min="10" max="120" value="${idleTimeout}">
                  <span class="slider-value" id="idle-value">${idleTimeout}s</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Audio Section -->
          <div class="settings-section">
            <div class="settings-section-title">Audio</div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Sound effects</div>
                <div class="setting-desc">Play sounds in games</div>
              </div>
              <div class="setting-control">
                <div class="toggle active" id="setting-sound"></div>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Volume</div>
                <div class="setting-desc">Sound effects volume</div>
              </div>
              <div class="setting-control">
                <div class="slider-group">
                  <input type="range" class="setting-slider" id="setting-volume" min="0" max="100" value="30">
                  <span class="slider-value" id="volume-value">30%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Economy Section -->
          <div class="settings-section">
            <div class="settings-section-title">Economy</div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Casino games</div>
                <div class="setting-desc">Enable Plinko & Slots with betting</div>
              </div>
              <div class="setting-control">
                <div class="toggle ${casinoEnabled ? 'active' : ''}" id="setting-casino"></div>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Earning rate</div>
                <div class="setting-desc">GC earned per second while coding</div>
              </div>
              <div class="setting-control">
                <div class="slider-group">
                  <input type="range" class="setting-slider" id="setting-earning" min="1" max="10" value="${earningRate}">
                  <span class="slider-value" id="earning-value">${earningRate}/s</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Notifications Section -->
          <div class="settings-section">
            <div class="settings-section-title">Notifications</div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Achievement popups</div>
                <div class="setting-desc">Show notifications when unlocking achievements</div>
              </div>
              <div class="setting-control">
                <div class="toggle ${enableAchievements ? 'active' : ''}" id="setting-achievements"></div>
              </div>
            </div>
          </div>

          <!-- Appearance Section -->
          <div class="settings-section">
            <div class="settings-section-title">Appearance</div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Brainrot intensity</div>
                <div class="setting-desc">Visual theme intensity</div>
              </div>
              <div class="setting-control">
                <select class="setting-select" id="setting-intensity">
                  <option value="touching-grass" ${intensity === 'touching-grass' ? 'selected' : ''}>Touching Grass</option>
                  <option value="casual" ${intensity === 'casual' ? 'selected' : ''}>Casual</option>
                  <option value="degenerate" ${intensity === 'degenerate' ? 'selected' : ''}>Degenerate</option>
                  <option value="terminal" ${intensity === 'terminal' ? 'selected' : ''}>Terminal</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Data Section -->
          <div class="settings-section">
            <div class="settings-section-title">Data</div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Reset all data</div>
                <div class="setting-desc">Clear stats, achievements, and balance</div>
              </div>
              <div class="setting-control">
                <button class="btn btn-danger" id="setting-reset">Reset</button>
              </div>
            </div>
          </div>

          <div class="settings-footer">
            Touch Grass IDE v1.2.0<br>
            <a href="https://github.com/anthropics/touch-grass-ide">GitHub</a> · Made with 🌿
          </div>
        </div>
      </section>


      <div id="game-over-overlay" class="game-over-overlay">
        <div class="game-over-content">
          <h2>Game Over!</h2>
          <div class="final-score" id="final-score">0</div>
          <div class="game-over-buttons">
            <button class="btn" id="play-again-btn">Play Again</button>
            <button class="btn btn-secondary" id="back-to-menu-btn">Back to Menu</button>
          </div>
        </div>
      </div>

      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        let currentGame = null;
        let gameInstance = null;

        // ===================== SOUND MANAGER =====================
        const SoundManager = {
          ctx: null,
          enabled: true,
          volume: 0.3,
          init() {
            if (!this.ctx) {
              try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
              } catch (e) {
                this.enabled = false;
              }
            }
          },
          play(type) {
            if (!this.enabled) return;
            if (!this.ctx) this.init();
            if (!this.ctx || this.ctx.state === 'suspended') {
              this.ctx?.resume();
              return;
            }
            try {
              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              osc.connect(gain);
              gain.connect(this.ctx.destination);
              const sounds = {
                eat: [440, 0.1, 'square', 1.5],
                crash: [150, 0.2, 'sawtooth', 0.5],
                merge: [520, 0.15, 'sine', 1.2],
                clear: [660, 0.25, 'triangle', 1.3],
                jump: [380, 0.08, 'square', 1.4],
                flip: [300, 0.1, 'sine', 1.0],
                spin: [200, 0.05, 'square', 1.0],
                win: [523, 0.3, 'sine', 1.5],
                bigwin: [659, 0.4, 'sine', 1.8],
                lose: [180, 0.25, 'sawtooth', 0.6],
                drop: [250, 0.08, 'triangle', 1.2],
                click: [600, 0.04, 'square', 1.0],
                move: [350, 0.05, 'sine', 1.0],
                lock: [220, 0.1, 'triangle', 0.8],
                levelup: [440, 0.3, 'sine', 1.4]
              };
              const [freq, dur, wave, pitchMult] = sounds[type] || [440, 0.1, 'sine', 1.0];
              osc.type = wave;
              osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(freq * pitchMult, this.ctx.currentTime + dur * 0.5);
              gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
              osc.start();
              osc.stop(this.ctx.currentTime + dur);
            } catch (e) { /* Audio error - ignore */ }
          },
          playSequence(notes, interval = 100) {
            notes.forEach((note, i) => {
              setTimeout(() => this.play(note), i * interval);
            });
          }
        };

        // ===================== PARTICLE SYSTEM =====================
        class ParticleSystem {
          constructor(ctx) {
            this.ctx = ctx;
            this.particles = [];
          }
          emit(x, y, count, color, speed = 3, size = 4) {
            for (let i = 0; i < count; i++) {
              const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5);
              this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed * (0.5 + Math.random()),
                vy: Math.sin(angle) * speed * (0.5 + Math.random()),
                life: 1,
                color,
                size: size + Math.random() * size
              });
            }
          }
          burst(x, y, count, colors, speed = 5) {
            for (let i = 0; i < count; i++) {
              const angle = Math.random() * Math.PI * 2;
              const color = colors[Math.floor(Math.random() * colors.length)];
              this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed * Math.random(),
                vy: Math.sin(angle) * speed * Math.random() - 2,
                life: 1,
                color,
                size: 3 + Math.random() * 4
              });
            }
          }
          trail(x, y, color, size = 3) {
            this.particles.push({
              x, y, vx: 0, vy: 0,
              life: 0.5, color, size,
              isTrail: true
            });
          }
          update() {
            this.particles = this.particles.filter(p => {
              p.x += p.vx;
              p.y += p.vy;
              if (!p.isTrail) {
                p.vy += 0.15; // gravity
                p.vx *= 0.98; // drag
              }
              p.life -= p.isTrail ? 0.08 : 0.025;
              return p.life > 0;
            });
          }
          draw() {
            this.particles.forEach(p => {
              this.ctx.globalAlpha = p.life;
              this.ctx.fillStyle = p.color;
              this.ctx.beginPath();
              this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
              this.ctx.fill();
            });
            this.ctx.globalAlpha = 1;
          }
          clear() {
            this.particles = [];
          }
        }

        // ===================== FLOATING TEXT =====================
        class FloatingText {
          constructor(ctx) {
            this.ctx = ctx;
            this.texts = [];
          }
          add(x, y, text, color = '#fff', size = 16) {
            this.texts.push({ x, y, text, color, size, life: 1, vy: -2 });
          }
          update() {
            this.texts = this.texts.filter(t => {
              t.y += t.vy;
              t.vy *= 0.95;
              t.life -= 0.02;
              return t.life > 0;
            });
          }
          draw() {
            this.texts.forEach(t => {
              this.ctx.globalAlpha = t.life;
              this.ctx.fillStyle = t.color;
              this.ctx.font = 'bold ' + t.size + 'px sans-serif';
              this.ctx.textAlign = 'center';
              this.ctx.fillText(t.text, t.x, t.y);
            });
            this.ctx.globalAlpha = 1;
            this.ctx.textAlign = 'left';
          }
        }

        // Elements
        const gameSelection = document.getElementById('game-selection');
        const gameContainer = document.getElementById('game-container');
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        const currentScoreEl = document.getElementById('current-score');
        const backBtn = document.getElementById('back-btn');
        const gameOverOverlay = document.getElementById('game-over-overlay');
        const finalScoreEl = document.getElementById('final-score');
        const playAgainBtn = document.getElementById('play-again-btn');
        const backToMenuBtn = document.getElementById('back-to-menu-btn');
        // Init
        vscode.postMessage({ command: 'requestHighScores' });
        vscode.postMessage({ command: 'requestPomodoroState' });
        vscode.postMessage({ command: 'getBalance' });

        // Casino/betting elements
        const gameControls = document.getElementById('game-controls');
        const betControlsEl = document.getElementById('bet-controls');
        const betAmountInput = document.getElementById('bet-amount');
        const casinoBalanceEl = document.getElementById('casino-balance');
        let playerBalance = 0;
        const casinoGames = ['plinko', 'slots'];

        // Pomodoro elements
        const pomoTimerEl = document.getElementById('pomodoro-timer');
        const pomoModeEl = document.getElementById('pomodoro-mode');
        const pomoToggleBtn = document.getElementById('pomo-toggle-btn');
        const pomoResetBtn = document.getElementById('pomo-reset-btn');
        const pomoSkipBtn = document.getElementById('pomo-skip-btn');
        const pomoSessionsEl = document.getElementById('pomo-sessions');
        const pomoWorkTimeEl = document.getElementById('pomo-work-time');
        const pomoBreakTimeEl = document.getElementById('pomo-break-time');
        let pomodoroActive = false;

        pomoToggleBtn.addEventListener('click', () => {
          vscode.postMessage({ command: pomodoroActive ? 'pomodoroPause' : 'pomodoroStart' });
        });
        pomoResetBtn.addEventListener('click', () => {
          vscode.postMessage({ command: 'pomodoroReset' });
        });
        pomoSkipBtn.addEventListener('click', () => {
          vscode.postMessage({ command: 'pomodoroSkip' });
        });

        // Tab switching with smooth transitions
        document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            SoundManager.play('click');
            const currentTab = document.querySelector('.tab-panel.active');
            const nextTab = document.getElementById(btn.dataset.tab + '-tab');

            if (currentTab === nextTab) return;

            // Fade out current tab
            if (currentTab) {
              currentTab.style.opacity = '0';
              currentTab.style.transform = 'translateY(10px)';
            }

            setTimeout(() => {
              document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
              document.querySelectorAll('.tab-panel').forEach(p => {
                p.classList.remove('active');
                p.style.opacity = '0';
                p.style.transform = 'translateY(10px)';
              });
              btn.classList.add('active');
              nextTab.classList.add('active');

              // Fade in new tab
              requestAnimationFrame(() => {
                nextTab.style.opacity = '1';
                nextTab.style.transform = 'translateY(0)';
              });
            }, 150);
          });
        });

        // Animated balance counter
        let displayedBalance = 0;
        let balanceAnimationId = null;
        function animateBalance(targetBalance) {
          if (balanceAnimationId) cancelAnimationFrame(balanceAnimationId);

          const startBalance = displayedBalance;
          const diff = targetBalance - startBalance;
          const duration = Math.min(500, Math.abs(diff) * 10);
          const startTime = performance.now();

          // Flash color based on change
          if (diff > 0) {
            casinoBalanceEl.style.color = '#4ade80';
            casinoBalanceEl.style.textShadow = '0 0 10px rgba(74, 222, 128, 0.5)';
          } else if (diff < 0) {
            casinoBalanceEl.style.color = '#ef4444';
            casinoBalanceEl.style.textShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
          }

          function step(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic

            displayedBalance = Math.round(startBalance + diff * eased);
            casinoBalanceEl.textContent = displayedBalance.toLocaleString();

            if (progress < 1) {
              balanceAnimationId = requestAnimationFrame(step);
            } else {
              displayedBalance = targetBalance;
              casinoBalanceEl.textContent = targetBalance.toLocaleString();
              // Reset color
              setTimeout(() => {
                casinoBalanceEl.style.color = '#fbbf24';
                casinoBalanceEl.style.textShadow = 'none';
              }, 300);
            }
          }
          balanceAnimationId = requestAnimationFrame(step);
        }

        // Add click sounds to all buttons
        document.addEventListener('click', (e) => {
          if (e.target.matches('button, .btn, .game-card, .casino-card, .social-btn')) {
            SoundManager.play('click');
          }
        });

        // Messages from extension
        window.addEventListener('message', event => {
          const msg = event.data;
          if (msg.command === 'highScoresUpdate') {
            document.getElementById('snake-high').textContent = msg.highScores.snake || 0;
            document.getElementById('2048-high').textContent = msg.highScores['2048'] || 0;
            document.getElementById('flappy-high').textContent = msg.highScores.flappy || 0;
            document.getElementById('tetris-high').textContent = msg.highScores.tetris || 0;
          } else if (msg.command === 'pomodoroUpdate') {
            pomoTimerEl.textContent = msg.formattedTime;
            pomodoroActive = msg.state.isActive;
            pomoToggleBtn.textContent = msg.state.isActive ? 'Pause' : 'Start';
            const modeText = msg.state.mode === 'work' ? 'Work Time' : (msg.state.mode === 'longBreak' ? 'Long Break' : 'Break Time');
            pomoModeEl.textContent = modeText;
            pomoModeEl.className = 'pomodoro-mode ' + (msg.state.mode === 'work' ? 'work' : 'break');
            pomoSessionsEl.textContent = msg.stats.sessions;
            pomoWorkTimeEl.textContent = msg.stats.workTime;
            pomoBreakTimeEl.textContent = msg.stats.breakTime;
          } else if (msg.command === 'balanceUpdate') {
            playerBalance = msg.balance;
            animateBalance(msg.balance);
          } else if (msg.command === 'betResult') {
            if (msg.success) {
              playerBalance = msg.balance;
              animateBalance(msg.balance);
            }
          }
        });

        function updateBalance(change, isWin) {
          if (isWin) {
            vscode.postMessage({ command: 'casinoWin', game: currentGame, amount: change });
          } else {
            vscode.postMessage({ command: 'casinoLoss', amount: Math.abs(change) });
          }
        }

        function placeBet(amount) {
          vscode.postMessage({ command: 'casinoBet', amount: amount });
        }

        // Game cards (unified for all games)
        document.querySelectorAll('.game-card').forEach(card => {
          card.addEventListener('click', () => startGame(card.dataset.game));
        });

        backBtn.addEventListener('click', () => { stopGame(); showMenu(); });
        playAgainBtn.addEventListener('click', () => { gameOverOverlay.classList.remove('active'); startGame(currentGame); });
        backToMenuBtn.addEventListener('click', () => { gameOverOverlay.classList.remove('active'); showMenu(); });

        function showMenu() {
          gameSelection.style.display = 'grid';
          gameContainer.classList.remove('active');
          betControlsEl.style.display = 'none';
          gameControls.innerHTML = '';
          currentGame = null;
        }

        function startGame(game) {
          currentGame = game;
          gameSelection.style.display = 'none';
          gameContainer.classList.add('active');
          currentScoreEl.textContent = '0';
          gameControls.innerHTML = '';
          vscode.postMessage({ command: 'gamePlayed', game: game });

          const isCasinoGame = casinoGames.includes(game);
          betControlsEl.style.display = isCasinoGame ? 'flex' : 'none';

          // Resize canvas based on game
          if (game === 'flappy') {
            canvas.width = 320;
            canvas.height = 480;
          } else if (isCasinoGame) {
            canvas.width = 320;
            canvas.height = 400;
          } else {
            canvas.width = 320;
            canvas.height = 320;
          }

          if (game === 'snake') {
            gameInstance = new SnakeGame(canvas, ctx, updateScore, gameOver);
            gameInstance.start();
          } else if (game === 'flappy') {
            gameInstance = new FlappyGame(canvas, ctx, updateScore, gameOver);
            gameInstance.start();
          } else if (game === 'plinko') {
            gameInstance = new PlinkoGame(canvas, ctx, gameControls, betAmountInput, updateBalance);
            gameInstance.init();
          } else if (game === 'slots') {
            gameInstance = new SlotsGame(canvas, ctx, gameControls, betAmountInput, updateBalance);
            gameInstance.init();
          }
        }

        function stopGame() {
          if (gameInstance && gameInstance.stop) gameInstance.stop();
          gameInstance = null;
        }

        function updateScore(score) { currentScoreEl.textContent = score; }
        function gameOver(finalScore) {
          finalScoreEl.textContent = finalScore;
          gameOverOverlay.classList.add('active');
          vscode.postMessage({ command: 'gameScore', game: currentGame, score: finalScore });
          vscode.postMessage({ command: 'requestHighScores' });
        }

        // Social media handling
        const socialEmbedContainer = document.getElementById('social-embed-container');
        const youtubeControls = document.getElementById('youtube-controls');
        const externalLinkContainer = document.getElementById('external-link-container');
        let currentExternalUrl = '';

        // Curated YouTube Shorts video IDs for different categories
        const youtubeShorts = {
          programming: ['ZI1PHBd1gco', 'JFpZwDh2q0k', 'UQMEJZgPnCY', '6s_2zVp8LV4', 'QH2-TGUlwu4'],
          lofi: ['n61ULEU7CO0', 'MGGquQPnhGE', 'b3F9Z-GR3PE'],
          satisfying: ['5aUq4VzTDyI', 'TBFjxjYGT1g', 'G8CeP15EAS8'],
          memes: ['cL9Wu2kWwSY', 'a3Z7zEc7AXQ', 'Ss7SRjiOCM4', 'kdemFfbS5H0']
        };
        let currentShortIndex = 0;
        let currentCategory = 'programming';

        function loadYouTubeShort(videoId) {
          // YouTube Shorts embed - use embed URL with loop and controls
          socialEmbedContainer.innerHTML = '<iframe src="https://www.youtube.com/embed/' + videoId + '?autoplay=1&loop=1&playlist=' + videoId + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="aspect-ratio: 9/16; max-height: 400px; width: auto; margin: 0 auto;"></iframe>';
          socialEmbedContainer.style.display = 'flex';
          socialEmbedContainer.style.justifyContent = 'center';
          externalLinkContainer.style.display = 'none';
        }

        function nextShort() {
          const shorts = youtubeShorts[currentCategory];
          currentShortIndex = (currentShortIndex + 1) % shorts.length;
          loadYouTubeShort(shorts[currentShortIndex]);
        }

        function prevShort() {
          const shorts = youtubeShorts[currentCategory];
          currentShortIndex = (currentShortIndex - 1 + shorts.length) % shorts.length;
          loadYouTubeShort(shorts[currentShortIndex]);
        }

        function extractYouTubeId(url) {
          const patterns = [
            /(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/|youtube\\.com\\/embed\\/|youtube\\.com\\/shorts\\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/
          ];
          for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
          }
          return null;
        }

        function showExternalLink(platform, icon, url) {
          const platformNames = { tiktok: 'TikTok', twitter: 'Twitter/X', reddit: 'Reddit' };
          const descriptions = {
            tiktok: 'TikTok videos require their native player to work properly.',
            twitter: 'Twitter/X blocks embedding due to security restrictions.',
            reddit: 'Reddit requires authentication for embedded viewing.'
          };
          document.getElementById('external-icon').textContent = icon;
          document.getElementById('external-title').textContent = platformNames[platform] || platform;
          document.getElementById('external-desc').textContent = descriptions[platform] || 'This platform doesn\\'t support embedding.';
          document.getElementById('external-name').textContent = platformNames[platform] || platform;
          currentExternalUrl = url;
          socialEmbedContainer.style.display = 'none';
          youtubeControls.style.display = 'none';
          externalLinkContainer.style.display = 'block';
        }

        document.querySelectorAll('.social-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.social-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const platform = btn.dataset.social;

            if (platform === 'youtube') {
              // Show YouTube Shorts with embed and controls
              currentCategory = 'programming';
              currentShortIndex = Math.floor(Math.random() * youtubeShorts[currentCategory].length);
              loadYouTubeShort(youtubeShorts[currentCategory][currentShortIndex]);
              youtubeControls.style.display = 'block';
              externalLinkContainer.style.display = 'none';
            } else {
              // Show external link for platforms that can't embed
              const externalUrls = {
                tiktok: 'https://www.tiktok.com/foryou',
                twitter: 'https://twitter.com/explore',
                reddit: 'https://www.reddit.com/r/programming'
              };
              const icons = { tiktok: '🎵', twitter: '𝕏', reddit: '🤖' };
              showExternalLink(platform, icons[platform], externalUrls[platform]);
              youtubeControls.style.display = 'none';
            }
            vscode.postMessage({ command: 'socialOpened' });
          });
        });

        // YouTube Shorts category buttons
        document.querySelectorAll('.yt-category').forEach(btn => {
          btn.addEventListener('click', () => {
            currentCategory = btn.dataset.category;
            currentShortIndex = Math.floor(Math.random() * youtubeShorts[currentCategory].length);
            loadYouTubeShort(youtubeShorts[currentCategory][currentShortIndex]);
            // Highlight active category
            document.querySelectorAll('.yt-category').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
          });
        });

        // YouTube Shorts navigation
        document.getElementById('yt-prev-btn')?.addEventListener('click', prevShort);
        document.getElementById('yt-next-btn')?.addEventListener('click', nextShort);

        // YouTube URL input
        document.getElementById('youtube-load-btn').addEventListener('click', () => {
          const input = document.getElementById('youtube-url-input');
          const videoId = extractYouTubeId(input.value.trim());
          if (videoId) {
            loadYouTubeShort(videoId);
            input.value = '';
          }
        });

        // Open external URL button
        document.getElementById('open-external-btn').addEventListener('click', () => {
          if (currentExternalUrl) {
            vscode.postMessage({ command: 'openExternal', url: currentExternalUrl });
          }
        });

        // Settings handlers
        document.querySelectorAll('.toggle').forEach(toggle => {
          toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            const id = toggle.id;
            const value = toggle.classList.contains('active');
            SoundManager.play('click');
            if (id === 'setting-autodetect') {
              vscode.postMessage({ command: 'updateSetting', key: 'autoDetect', value });
            } else if (id === 'setting-autominimize') {
              vscode.postMessage({ command: 'updateSetting', key: 'autoMinimize', value });
            } else if (id === 'setting-casino') {
              vscode.postMessage({ command: 'updateSetting', key: 'casinoEnabled', value });
            } else if (id === 'setting-achievements') {
              vscode.postMessage({ command: 'updateSetting', key: 'enableAchievements', value });
            } else if (id === 'setting-sound') {
              SoundManager.enabled = value;
            }
          });
        });

        // Slider handlers
        document.getElementById('setting-idle')?.addEventListener('input', (e) => {
          const value = e.target.value;
          document.getElementById('idle-value').textContent = value + 's';
        });
        document.getElementById('setting-idle')?.addEventListener('change', (e) => {
          vscode.postMessage({ command: 'updateSetting', key: 'idleTimeout', value: parseInt(e.target.value) });
        });

        document.getElementById('setting-volume')?.addEventListener('input', (e) => {
          const value = e.target.value;
          document.getElementById('volume-value').textContent = value + '%';
          SoundManager.volume = value / 100;
        });

        document.getElementById('setting-earning')?.addEventListener('input', (e) => {
          const value = e.target.value;
          document.getElementById('earning-value').textContent = value + '/s';
        });
        document.getElementById('setting-earning')?.addEventListener('change', (e) => {
          vscode.postMessage({ command: 'updateSetting', key: 'earningRate', value: parseInt(e.target.value) });
        });

        // Intensity select
        document.getElementById('setting-intensity')?.addEventListener('change', (e) => {
          SoundManager.play('click');
          vscode.postMessage({ command: 'updateSetting', key: 'brainrotIntensity', value: e.target.value });
        });

        // Reset button
        document.getElementById('setting-reset')?.addEventListener('click', () => {
          if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
            SoundManager.play('crash');
            vscode.postMessage({ command: 'resetStats' });
          }
        });

        // ===================== SNAKE =====================
        class SnakeGame {
          constructor(canvas, ctx, onScore, onGameOver) {
            this.canvas = canvas; this.ctx = ctx; this.onScore = onScore; this.onGameOver = onGameOver;
            this.gridSize = 20;
            this.particles = new ParticleSystem(ctx);
            this.floatingText = new FloatingText(ctx);
          }
          reset() {
            const cx = Math.floor(this.canvas.width / this.gridSize / 2);
            const cy = Math.floor(this.canvas.height / this.gridSize / 2);
            this.snake = [{x:cx,y:cy},{x:cx-1,y:cy},{x:cx-2,y:cy}];
            this.direction = 'right'; this.nextDirection = 'right'; this.score = 0;
            this.inputQueue = [];
            this.animProgress = 0;
            this.foodPulse = 0;
            this.screenShake = 0;
            this.baseSpeed = 70;
            this.spawnFood();
            this.particles.clear();
          }
          start() {
            this.reset();
            this.bindControls();
            this.lastTime = performance.now();
            this.running = true;
            this.loop();
          }
          stop() { this.running = false; this.unbindControls(); }
          loop() {
            if (!this.running) return;
            const now = performance.now();
            const delta = now - this.lastTime;
            // Smooth animation at 60fps
            this.animProgress += delta / this.baseSpeed;
            this.foodPulse += delta * 0.005;
            if (this.screenShake > 0) this.screenShake -= delta * 0.01;
            // Update game state at fixed interval
            if (this.animProgress >= 1) {
              this.animProgress = 0;
              this.update();
            }
            this.draw();
            this.lastTime = now;
            requestAnimationFrame(() => this.loop());
          }
          bindControls() {
            this.keyHandler = (e) => {
              const k = e.key;
              let newDir = null;
              if ((k === 'ArrowUp' || k === 'w') && this.direction !== 'down') newDir = 'up';
              if ((k === 'ArrowDown' || k === 's') && this.direction !== 'up') newDir = 'down';
              if ((k === 'ArrowLeft' || k === 'a') && this.direction !== 'right') newDir = 'left';
              if ((k === 'ArrowRight' || k === 'd') && this.direction !== 'left') newDir = 'right';
              if (newDir && (this.inputQueue.length === 0 || this.inputQueue[this.inputQueue.length-1] !== newDir)) {
                this.inputQueue.push(newDir);
                if (this.inputQueue.length > 2) this.inputQueue.shift();
              }
            };
            document.addEventListener('keydown', this.keyHandler);
          }
          unbindControls() { if (this.keyHandler) document.removeEventListener('keydown', this.keyHandler); }
          update() {
            // Process input queue
            if (this.inputQueue.length > 0) {
              const next = this.inputQueue.shift();
              if ((next === 'up' && this.direction !== 'down') ||
                  (next === 'down' && this.direction !== 'up') ||
                  (next === 'left' && this.direction !== 'right') ||
                  (next === 'right' && this.direction !== 'left')) {
                this.direction = next;
              }
            }
            const head = {...this.snake[0]};
            if (this.direction === 'up') head.y--;
            if (this.direction === 'down') head.y++;
            if (this.direction === 'left') head.x--;
            if (this.direction === 'right') head.x++;
            if (this.checkCollision(head)) {
              this.die();
              return;
            }
            this.snake.unshift(head);
            if (head.x === this.food.x && head.y === this.food.y) {
              this.score += 10;
              this.onScore(this.score);
              SoundManager.play('eat');
              // Particles on eat
              const fx = this.food.x * this.gridSize + this.gridSize/2;
              const fy = this.food.y * this.gridSize + this.gridSize/2;
              this.particles.emit(fx, fy, 12, '#ef4444', 4);
              this.floatingText.add(fx, fy, '+10', '#4ade80', 14);
              // Speed up slightly every 50 points
              if (this.score % 50 === 0 && this.baseSpeed > 40) {
                this.baseSpeed -= 5;
              }
              this.spawnFood();
            } else {
              this.snake.pop();
            }
          }
          die() {
            SoundManager.play('crash');
            // Death explosion
            const head = this.snake[0];
            const hx = head.x * this.gridSize + this.gridSize/2;
            const hy = head.y * this.gridSize + this.gridSize/2;
            this.particles.burst(hx, hy, 30, ['#ef4444', '#f97316', '#fbbf24'], 6);
            this.screenShake = 10;
            // Let particles animate before game over
            setTimeout(() => {
              this.stop();
              this.onGameOver(this.score);
            }, 500);
          }
          checkCollision(h) {
            const mx = this.canvas.width / this.gridSize, my = this.canvas.height / this.gridSize;
            if (h.x < 0 || h.x >= mx || h.y < 0 || h.y >= my) return true;
            return this.snake.some(s => s.x === h.x && s.y === h.y);
          }
          spawnFood() {
            const mx = this.canvas.width / this.gridSize, my = this.canvas.height / this.gridSize;
            do { this.food = {x: Math.floor(Math.random()*mx), y: Math.floor(Math.random()*my)}; }
            while (this.snake.some(s => s.x === this.food.x && s.y === this.food.y));
          }
          draw() {
            const ctx = this.ctx;
            // Apply screen shake
            ctx.save();
            if (this.screenShake > 0) {
              ctx.translate(
                (Math.random() - 0.5) * this.screenShake,
                (Math.random() - 0.5) * this.screenShake
              );
            }
            // Background with subtle grid
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 0.5;
            for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
              ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.canvas.height); ctx.stroke();
            }
            for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
              ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvas.width, y); ctx.stroke();
            }
            // Draw snake with gradient
            this.snake.forEach((s, i) => {
              const progress = i / this.snake.length;
              const brightness = 1 - progress * 0.6;
              const r = Math.floor(74 * brightness);
              const g = Math.floor(222 * brightness);
              const b = Math.floor(128 * brightness);
              ctx.fillStyle = 'rgb('+r+','+g+','+b+')';
              // Rounded rectangles for snake body
              const x = s.x * this.gridSize + 2;
              const y = s.y * this.gridSize + 2;
              const w = this.gridSize - 4;
              const h = this.gridSize - 4;
              const radius = 4;
              ctx.beginPath();
              ctx.moveTo(x + radius, y);
              ctx.lineTo(x + w - radius, y);
              ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
              ctx.lineTo(x + w, y + h - radius);
              ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
              ctx.lineTo(x + radius, y + h);
              ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
              ctx.lineTo(x, y + radius);
              ctx.quadraticCurveTo(x, y, x + radius, y);
              ctx.fill();
              // Eyes on head
              if (i === 0) {
                ctx.fillStyle = '#fff';
                const eyeOffset = this.gridSize / 4;
                let ex1, ey1, ex2, ey2;
                if (this.direction === 'right') { ex1 = x + w - 6; ey1 = y + 4; ex2 = x + w - 6; ey2 = y + h - 6; }
                else if (this.direction === 'left') { ex1 = x + 4; ey1 = y + 4; ex2 = x + 4; ey2 = y + h - 6; }
                else if (this.direction === 'up') { ex1 = x + 4; ey1 = y + 4; ex2 = x + w - 6; ey2 = y + 4; }
                else { ex1 = x + 4; ey1 = y + h - 6; ex2 = x + w - 6; ey2 = y + h - 6; }
                ctx.beginPath(); ctx.arc(ex1, ey1, 2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(ex2, ey2, 2, 0, Math.PI * 2); ctx.fill();
              }
            });
            // Food with pulse effect and glow
            const fx = this.food.x * this.gridSize + this.gridSize/2;
            const fy = this.food.y * this.gridSize + this.gridSize/2;
            const pulse = Math.sin(this.foodPulse) * 0.2 + 1;
            const baseRadius = this.gridSize/2 - 3;
            // Glow
            const gradient = ctx.createRadialGradient(fx, fy, 0, fx, fy, baseRadius * pulse * 1.5);
            gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
            gradient.addColorStop(0.6, 'rgba(239, 68, 68, 0.3)');
            gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(fx, fy, baseRadius * pulse * 1.5, 0, Math.PI * 2);
            ctx.fill();
            // Core
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(fx, fy, baseRadius * pulse, 0, Math.PI * 2);
            ctx.fill();
            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.arc(fx - 2, fy - 2, baseRadius * 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Update and draw particles
            this.particles.update();
            this.particles.draw();
            this.floatingText.update();
            this.floatingText.draw();
            ctx.restore();
          }
        }

        // ===================== FLAPPY =====================
        class FlappyGame {
          constructor(canvas, ctx, onScore, onGameOver) {
            this.canvas = canvas; this.ctx = ctx; this.onScore = onScore; this.onGameOver = onGameOver;
            this.particles = new ParticleSystem(ctx);
            this.floatingText = new FloatingText(ctx);
          }
          reset() {
            this.bird = {x:80, y:200, vel:0, rotation: 0};
            this.pipes = [];
            this.score = 0;
            this.running = true;
            this.started = false;
            this.gravity = 0.26;
            this.jumpStrength = -4.9;
            this.pipeGap = 130;
            this.pipeWidth = 52;
            this.groundOffset = 0;
            this.cloudOffset = 0;
            this.wingFrame = 0;
            this.lastTime = 0;
            this.screenShake = 0;
            this.particles.clear();
          }
          start() {
            this.reset();
            this.bindControls();
            this.lastTime = performance.now();
            this.loop();
          }
          stop() { this.running = false; this.unbindControls(); }
          bindControls() {
            this.keyHandler = (e) => {
              if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                this.jump();
              }
            };
            this.clickHandler = () => this.jump();
            document.addEventListener('keydown', this.keyHandler);
            this.canvas.addEventListener('click', this.clickHandler);
          }
          unbindControls() {
            if (this.keyHandler) document.removeEventListener('keydown', this.keyHandler);
            if (this.clickHandler) this.canvas.removeEventListener('click', this.clickHandler);
          }
          jump() {
            if (!this.running) return;
            if (!this.started) this.started = true;
            this.bird.vel = this.jumpStrength;
            this.wingFrame = 1;
            SoundManager.play('jump');
          }
          loop() {
            if (!this.running) return;
            const now = performance.now();
            const delta = now - this.lastTime;
            this.lastTime = now;
            this.update(delta);
            this.draw();
            requestAnimationFrame(() => this.loop());
          }
          update(delta) {
            // Update parallax
            this.cloudOffset = (this.cloudOffset + delta * 0.02) % this.canvas.width;
            this.groundOffset = (this.groundOffset + delta * 0.15) % 24;
            // Wing animation
            if (this.wingFrame > 0) this.wingFrame -= delta * 0.01;
            // Screen shake decay
            if (this.screenShake > 0) this.screenShake -= delta * 0.01;
            // Update particles
            this.particles.update();
            this.floatingText.update();
            if (!this.started) return;
            // Physics
            this.bird.vel += this.gravity;
            this.bird.y += this.bird.vel;
            // Bird rotation based on velocity
            const targetRotation = Math.min(Math.max(this.bird.vel * 4, -30), 70);
            this.bird.rotation += (targetRotation - this.bird.rotation) * 0.15;
            // Spawn pipes
            if (this.pipes.length === 0 || this.pipes[this.pipes.length-1].x < this.canvas.width - 180) {
              const minGap = 80;
              const maxGap = this.canvas.height - 120;
              const gapY = Math.random() * (maxGap - minGap) + minGap;
              this.pipes.push({x: this.canvas.width, gapY: gapY, passed: false});
            }
            // Move pipes
            const speed = 1.9;
            this.pipes.forEach(p => p.x -= speed);
            this.pipes = this.pipes.filter(p => p.x > -this.pipeWidth);
            // Score
            this.pipes.forEach(p => {
              if (!p.passed && p.x + this.pipeWidth < this.bird.x) {
                p.passed = true;
                this.score++;
                this.onScore(this.score);
                SoundManager.play('eat');
                // Floating score
                this.floatingText.add(this.bird.x, this.bird.y - 20, '+1', '#4ade80', 16);
              }
            });
            // Collision
            if (this.checkCollision()) {
              this.die();
            }
          }
          die() {
            SoundManager.play('crash');
            this.screenShake = 8;
            // Death particles
            this.particles.burst(this.bird.x + 12, this.bird.y + 12, 20, ['#f7dc6f', '#f39c12', '#fff'], 5);
            setTimeout(() => {
              this.stop();
              this.onGameOver(this.score);
            }, 400);
          }
          checkCollision() {
            const birdRadius = 10;
            const bx = this.bird.x + 12;
            const by = this.bird.y + 12;
            // Ground and ceiling
            if (by - birdRadius < 0 || by + birdRadius > this.canvas.height - 30) return true;
            // Pipes
            for (const p of this.pipes) {
              // Simplified hitbox
              if (bx + birdRadius > p.x && bx - birdRadius < p.x + this.pipeWidth) {
                if (by - birdRadius < p.gapY - this.pipeGap/2 || by + birdRadius > p.gapY + this.pipeGap/2) {
                  return true;
                }
              }
            }
            return false;
          }
          draw() {
            const ctx = this.ctx;
            ctx.save();
            // Screen shake
            if (this.screenShake > 0) {
              ctx.translate(
                (Math.random() - 0.5) * this.screenShake,
                (Math.random() - 0.5) * this.screenShake
              );
            }
            // Sky gradient
            const skyGrad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            skyGrad.addColorStop(0, '#4ec0ca');
            skyGrad.addColorStop(0.7, '#70c5ce');
            skyGrad.addColorStop(1, '#87ceeb');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            // Clouds (parallax)
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            for (let i = 0; i < 4; i++) {
              const cx = ((i * 100 + 50) - this.cloudOffset + this.canvas.width) % (this.canvas.width + 100) - 50;
              ctx.beginPath();
              ctx.arc(cx, 60 + i * 30, 25, 0, Math.PI * 2);
              ctx.arc(cx + 20, 55 + i * 30, 20, 0, Math.PI * 2);
              ctx.arc(cx + 35, 60 + i * 30, 22, 0, Math.PI * 2);
              ctx.fill();
            }
            // Pipes with 3D effect
            this.pipes.forEach(p => {
              const pipeX = p.x;
              const topHeight = p.gapY - this.pipeGap/2;
              const bottomY = p.gapY + this.pipeGap/2;
              // Top pipe
              this.drawPipe(ctx, pipeX, 0, topHeight, true);
              // Bottom pipe
              this.drawPipe(ctx, pipeX, bottomY, this.canvas.height - 30 - bottomY, false);
            });
            // Ground
            ctx.fillStyle = '#ded895';
            ctx.fillRect(0, this.canvas.height - 30, this.canvas.width, 30);
            // Ground pattern
            ctx.fillStyle = '#c4b67c';
            for (let x = -this.groundOffset; x < this.canvas.width; x += 24) {
              ctx.fillRect(x, this.canvas.height - 30, 12, 4);
            }
            ctx.fillStyle = '#8b7355';
            ctx.fillRect(0, this.canvas.height - 26, this.canvas.width, 2);
            // Bird
            this.drawBird(ctx);
            // Particles
            this.particles.draw();
            this.floatingText.draw();
            // Start message
            if (!this.started) {
              ctx.fillStyle = 'rgba(0,0,0,0.3)';
              ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
              ctx.fillStyle = '#fff';
              ctx.font = 'bold 20px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('Click or Space to Start', this.canvas.width/2, this.canvas.height/2);
              ctx.font = '14px sans-serif';
              ctx.fillText('Tap to flap!', this.canvas.width/2, this.canvas.height/2 + 30);
            }
            ctx.textAlign = 'left';
            ctx.restore();
          }
          drawPipe(ctx, x, y, height, isTop) {
            if (height <= 0) return;
            const w = this.pipeWidth;
            const capH = 26;
            // Pipe body gradient
            const grad = ctx.createLinearGradient(x, 0, x + w, 0);
            grad.addColorStop(0, '#5a9f2f');
            grad.addColorStop(0.3, '#73bf2e');
            grad.addColorStop(0.7, '#73bf2e');
            grad.addColorStop(1, '#4a8a25');
            ctx.fillStyle = grad;
            if (isTop) {
              ctx.fillRect(x, y, w, height - capH);
              // Cap
              ctx.fillRect(x - 3, height - capH, w + 6, capH);
            } else {
              ctx.fillRect(x - 3, y, w + 6, capH);
              ctx.fillRect(x, y + capH, w, height - capH);
            }
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(x + 4, isTop ? y : y + capH, 6, isTop ? height - capH : height - capH);
          }
          drawBird(ctx) {
            const bx = this.bird.x;
            const by = this.bird.y;
            ctx.save();
            ctx.translate(bx + 12, by + 12);
            ctx.rotate(this.bird.rotation * Math.PI / 180);
            // Body
            const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
            bodyGrad.addColorStop(0, '#ffe066');
            bodyGrad.addColorStop(1, '#f7dc6f');
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, 14, 11, 0, 0, Math.PI * 2);
            ctx.fill();
            // Wing
            const wingY = this.wingFrame > 0.5 ? -4 : 2;
            ctx.fillStyle = '#e8c547';
            ctx.beginPath();
            ctx.ellipse(-2, wingY, 8, 5, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Eye (white)
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(5, -3, 5, 0, Math.PI * 2);
            ctx.fill();
            // Pupil
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(6, -3, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Beak
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(18, 2);
            ctx.lineTo(10, 5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }

        // ===================== PLINKO =====================
        class PlinkoGame {
          constructor(canvas, ctx, controls, betInput, onUpdate) {
            this.canvas = canvas; this.ctx = ctx; this.controls = controls;
            this.betInput = betInput; this.onUpdate = onUpdate;
            this.rows = 8; this.risk = 'medium';
            this.multipliers = {
              low: { 8: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6] },
              medium: { 8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13] },
              high: { 8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29] }
            };
            this.particles = new ParticleSystem(ctx);
            this.floatingTexts = [];
            this.litPins = []; // {x, y, brightness, color}
            this.landingSlot = null; // {index, glow}
            this.lastTime = 0;
          }
          init() {
            this.balls = []; this.currentBet = 0; this.gameState = 'betting';
            this.litPins = []; this.landingSlot = null; this.floatingTexts = [];
            this.draw(); this.updateControls();
          }
          stop() { if (this.animationId) cancelAnimationFrame(this.animationId); }
          drop() {
            const bet = parseInt(this.betInput.value) || 10;
            if (bet > playerBalance) { alert('Not enough GC!'); return; }
            placeBet(bet);
            SoundManager.play('click');
            this.currentBet = bet;
            this.gameState = 'dropping';
            // Ball with trail history
            const ball = {
              x: this.canvas.width / 2 + (Math.random() - 0.5) * 10,
              y: 20, vx: 0, vy: 0, bet: bet,
              trail: [] // Store last positions for trail effect
            };
            this.balls.push(ball);
            this.lastTime = performance.now();
            this.animate();
            this.updateControls();
          }
          animate(currentTime = performance.now()) {
            const deltaTime = Math.min((currentTime - this.lastTime) / 16.67, 2);
            this.lastTime = currentTime;

            let running = false;
            const pinSpacing = (this.canvas.width - 40) / this.rows;

            for (const ball of this.balls) {
              // Store trail position
              ball.trail.push({ x: ball.x, y: ball.y });
              if (ball.trail.length > 12) ball.trail.shift();

              if (ball.y < this.canvas.height - 40) {
                running = true;
                ball.vy += 0.25 * deltaTime;
                ball.x += ball.vx * deltaTime;
                ball.y += ball.vy * deltaTime;

                // Pin collision with lighting effect
                for (let row = 0; row < this.rows; row++) {
                  const pinsInRow = row + 3;
                  const rowY = 60 + row * 35;
                  const startX = (this.canvas.width - (pinsInRow - 1) * pinSpacing) / 2;
                  for (let i = 0; i < pinsInRow; i++) {
                    const px = startX + i * pinSpacing;
                    const dist = Math.sqrt((ball.x - px) ** 2 + (ball.y - rowY) ** 2);
                    if (dist < 12) {
                      // Bounce
                      const angle = Math.atan2(ball.y - rowY, ball.x - px);
                      ball.vx = Math.cos(angle) * 3 * (0.8 + Math.random() * 0.4);
                      ball.vy = Math.abs(ball.vy) * 0.4;
                      ball.y = rowY + Math.sin(angle) * 12;

                      // Light up pin
                      this.litPins.push({ x: px, y: rowY, brightness: 1, color: '#fbbf24' });
                      SoundManager.play('drop');

                      // Small particle burst
                      this.particles.emit(px, rowY, 3, '#fbbf24', 1.5, 2);
                    }
                  }
                }
                // Bounds
                if (ball.x < 20) { ball.x = 20; ball.vx = Math.abs(ball.vx) * 0.8; }
                if (ball.x > this.canvas.width - 20) { ball.x = this.canvas.width - 20; ball.vx = -Math.abs(ball.vx) * 0.8; }
              }
            }

            // Update lit pins (fade out)
            this.litPins = this.litPins.filter(p => {
              p.brightness -= 0.03 * deltaTime;
              return p.brightness > 0;
            });

            // Update landing slot glow
            if (this.landingSlot) {
              this.landingSlot.glow -= 0.02 * deltaTime;
              if (this.landingSlot.glow <= 0) this.landingSlot = null;
            }

            // Update floating texts
            this.floatingTexts = this.floatingTexts.filter(t => {
              t.y -= 1.5 * deltaTime;
              t.life -= 0.02 * deltaTime;
              return t.life > 0;
            });

            // Update particles
            this.particles.update();

            this.draw();
            if (running) {
              this.animationId = requestAnimationFrame((t) => this.animate(t));
            } else {
              this.resolveBalls();
            }
          }
          resolveBalls() {
            const mults = this.multipliers[this.risk][this.rows];
            const slotWidth = (this.canvas.width - 20) / mults.length;

            for (const ball of this.balls) {
              const slot = Math.floor((ball.x - 10) / slotWidth);
              const clampedSlot = Math.max(0, Math.min(mults.length - 1, slot));
              const mult = mults[clampedSlot];
              const winAmount = Math.floor(ball.bet * mult);

              // Set landing slot glow
              this.landingSlot = { index: clampedSlot, glow: 1 };

              // Landing particles
              const slotCenterX = 10 + clampedSlot * slotWidth + slotWidth / 2;
              const slotY = this.canvas.height - 20;

              if (mult >= 1) {
                const color = mult >= 5 ? '#4ade80' : '#fbbf24';
                this.particles.burst(slotCenterX, slotY, 15, [color, '#fff'], 4);
                SoundManager.play('win');
                this.onUpdate(winAmount, true);

                // Floating win text
                this.floatingTexts.push({
                  x: slotCenterX, y: slotY - 20,
                  text: '+' + winAmount + ' GC',
                  color: color, life: 1
                });

                if (mult >= 10) {
                  vscode.postMessage({ command: 'casinoWin', game: 'plinko-edge', amount: winAmount });
                  // Extra celebration for edge hits
                  this.particles.burst(slotCenterX, slotY, 25, ['#4ade80', '#fbbf24', '#fff'], 6);
                }
              } else {
                this.particles.emit(slotCenterX, slotY, 5, '#ef4444', 2, 3);
                SoundManager.play('lose');
                this.onUpdate(ball.bet - winAmount, false);
                if (winAmount > 0) this.onUpdate(winAmount, true);

                this.floatingTexts.push({
                  x: slotCenterX, y: slotY - 20,
                  text: mult + 'x',
                  color: '#ef4444', life: 1
                });
              }
            }
            this.balls = [];
            this.gameState = 'betting';
            this.updateControls();

            // Continue animation for effects
            this.continueEffects();
          }
          continueEffects() {
            const hasEffects = this.particles.particles.length > 0 ||
                             this.floatingTexts.length > 0 ||
                             this.litPins.length > 0 ||
                             this.landingSlot;
            if (hasEffects) {
              this.particles.update();
              this.floatingTexts = this.floatingTexts.filter(t => {
                t.y -= 1.5;
                t.life -= 0.02;
                return t.life > 0;
              });
              this.litPins = this.litPins.filter(p => {
                p.brightness -= 0.03;
                return p.brightness > 0;
              });
              if (this.landingSlot) {
                this.landingSlot.glow -= 0.02;
                if (this.landingSlot.glow <= 0) this.landingSlot = null;
              }
              this.draw();
              requestAnimationFrame(() => this.continueEffects());
            }
          }
          updateControls() {
            this.controls.innerHTML = '';
            const dropBtn = document.createElement('button');
            dropBtn.className = 'btn btn-bet'; dropBtn.textContent = 'Drop Ball';
            dropBtn.onclick = () => this.drop();
            if (this.gameState === 'dropping') dropBtn.disabled = true;
            this.controls.appendChild(dropBtn);
            // Risk selector
            const riskLabel = document.createElement('span');
            riskLabel.textContent = ' Risk: ';
            riskLabel.style.color = '#888';
            const riskSelect = document.createElement('select');
            riskSelect.style.cssText = 'padding: 6px; border-radius: 4px; background: #2d2d2d; color: #fff; border: 1px solid #3d3d3d;';
            ['low', 'medium', 'high'].forEach(r => {
              const opt = document.createElement('option');
              opt.value = r; opt.textContent = r.charAt(0).toUpperCase() + r.slice(1);
              if (r === this.risk) opt.selected = true;
              riskSelect.appendChild(opt);
            });
            riskSelect.onchange = (e) => { this.risk = e.target.value; this.draw(); };
            this.controls.appendChild(riskLabel);
            this.controls.appendChild(riskSelect);
          }
          draw() {
            // Background with subtle gradient
            const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            bgGrad.addColorStop(0, '#0a0a1a');
            bgGrad.addColorStop(1, '#0f0f23');
            this.ctx.fillStyle = bgGrad;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw pin board area
            this.ctx.fillStyle = 'rgba(30, 30, 50, 0.5)';
            this.ctx.beginPath();
            this.ctx.moveTo(this.canvas.width / 2, 30);
            this.ctx.lineTo(20, this.canvas.height - 45);
            this.ctx.lineTo(this.canvas.width - 20, this.canvas.height - 45);
            this.ctx.closePath();
            this.ctx.fill();

            // Pins with glow for lit ones
            const pinSpacing = (this.canvas.width - 40) / this.rows;
            for (let row = 0; row < this.rows; row++) {
              const pinsInRow = row + 3;
              const rowY = 60 + row * 35;
              const startX = (this.canvas.width - (pinsInRow - 1) * pinSpacing) / 2;
              for (let i = 0; i < pinsInRow; i++) {
                const px = startX + i * pinSpacing;

                // Check if this pin is lit
                const litPin = this.litPins.find(p =>
                  Math.abs(p.x - px) < 1 && Math.abs(p.y - rowY) < 1
                );

                if (litPin) {
                  // Glow effect
                  const glow = this.ctx.createRadialGradient(px, rowY, 0, px, rowY, 15);
                  glow.addColorStop(0, 'rgba(251, 191, 36, ' + litPin.brightness * 0.6 + ')');
                  glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
                  this.ctx.fillStyle = glow;
                  this.ctx.beginPath();
                  this.ctx.arc(px, rowY, 15, 0, Math.PI * 2);
                  this.ctx.fill();
                }

                // Pin with metallic gradient
                const pinGrad = this.ctx.createRadialGradient(px - 1, rowY - 1, 0, px, rowY, 5);
                pinGrad.addColorStop(0, litPin ? '#ffd700' : '#888');
                pinGrad.addColorStop(0.5, litPin ? '#fbbf24' : '#666');
                pinGrad.addColorStop(1, litPin ? '#b8860b' : '#444');
                this.ctx.fillStyle = pinGrad;
                this.ctx.beginPath();
                this.ctx.arc(px, rowY, 5, 0, Math.PI * 2);
                this.ctx.fill();
              }
            }

            // Multiplier slots with glow effect
            const mults = this.multipliers[this.risk][this.rows];
            const slotWidth = (this.canvas.width - 20) / mults.length;
            mults.forEach((m, i) => {
              const isLanding = this.landingSlot && this.landingSlot.index === i;
              const baseColor = m >= 5 ? '#4ade80' : (m >= 1 ? '#fbbf24' : '#ef4444');

              // Glow effect for landing slot
              if (isLanding) {
                this.ctx.shadowColor = baseColor;
                this.ctx.shadowBlur = 20 * this.landingSlot.glow;
              }

              // Slot background with gradient
              const slotGrad = this.ctx.createLinearGradient(
                10 + i * slotWidth, this.canvas.height - 35,
                10 + i * slotWidth, this.canvas.height - 5
              );
              slotGrad.addColorStop(0, baseColor);
              slotGrad.addColorStop(1, this.darkenColor(baseColor, 0.3));
              this.ctx.fillStyle = slotGrad;

              // Rounded slot
              const slotX = 10 + i * slotWidth + 1;
              const slotY = this.canvas.height - 35;
              const sw = slotWidth - 4;
              const sh = 30;
              this.ctx.beginPath();
              this.ctx.roundRect(slotX, slotY, sw, sh, 4);
              this.ctx.fill();

              this.ctx.shadowBlur = 0;

              // Multiplier text
              this.ctx.fillStyle = '#000';
              this.ctx.font = 'bold 11px sans-serif';
              this.ctx.textAlign = 'center';
              this.ctx.fillText(m + 'x', slotX + sw/2, this.canvas.height - 15);
            });
            this.ctx.textAlign = 'left';

            // Ball trails and balls
            for (const ball of this.balls) {
              // Draw trail
              ball.trail.forEach((pos, idx) => {
                const alpha = (idx / ball.trail.length) * 0.4;
                const size = 3 + (idx / ball.trail.length) * 5;
                this.ctx.beginPath();
                this.ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(251, 191, 36, ' + alpha + ')';
                this.ctx.fill();
              });

              // Ball glow
              const ballGlow = this.ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, 20);
              ballGlow.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
              ballGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
              this.ctx.fillStyle = ballGlow;
              this.ctx.beginPath();
              this.ctx.arc(ball.x, ball.y, 20, 0, Math.PI * 2);
              this.ctx.fill();

              // Ball with gradient
              const grad = this.ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0, ball.x, ball.y, 8);
              grad.addColorStop(0, '#fff');
              grad.addColorStop(0.3, '#fcd34d');
              grad.addColorStop(1, '#b8860b');
              this.ctx.fillStyle = grad;
              this.ctx.beginPath();
              this.ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
              this.ctx.fill();
            }

            // Draw particles
            this.particles.draw();

            // Draw floating texts
            this.floatingTexts.forEach(t => {
              this.ctx.globalAlpha = t.life;
              this.ctx.fillStyle = t.color;
              this.ctx.font = 'bold 16px sans-serif';
              this.ctx.textAlign = 'center';
              this.ctx.fillText(t.text, t.x, t.y);
            });
            this.ctx.globalAlpha = 1;
            this.ctx.textAlign = 'left';
          }
          darkenColor(hex, factor) {
            const r = parseInt(hex.slice(1,3), 16);
            const g = parseInt(hex.slice(3,5), 16);
            const b = parseInt(hex.slice(5,7), 16);
            return '#' + Math.floor(r * (1 - factor)).toString(16).padStart(2, '0') +
                         Math.floor(g * (1 - factor)).toString(16).padStart(2, '0') +
                         Math.floor(b * (1 - factor)).toString(16).padStart(2, '0');
          }
        }

        // ===================== SLOTS =====================
        class SlotsGame {
          constructor(canvas, ctx, controls, betInput, onUpdate) {
            this.canvas = canvas; this.ctx = ctx; this.controls = controls;
            this.betInput = betInput; this.onUpdate = onUpdate;
            this.symbols = ['7', 'BAR', '🍒', '🍋', '🍊', '🔔', '⭐'];
            this.symbolColors = { '7': '#ef4444', 'BAR': '#4ade80', '🍒': '#ef4444', '🍋': '#fbbf24', '🍊': '#f97316', '🔔': '#fbbf24', '⭐': '#fbbf24' };
            this.payouts = { '7': [5, 25, 100], 'BAR': [3, 15, 50], '🔔': [2, 10, 25], '⭐': [2, 5, 15], '🍒': [1, 3, 10], '🍋': [0.5, 2, 5], '🍊': [0.5, 2, 5] };
            this.reels = 3;
            this.particles = new ParticleSystem(ctx);
            this.floatingTexts = [];
          }
          init() {
            this.currentBet = 0; this.spinning = false;
            // Each reel has array of symbols (for scrolling effect)
            this.reelStrips = Array(this.reels).fill(null).map(() =>
              Array(20).fill(null).map(() => this.symbols[Math.floor(Math.random() * this.symbols.length)])
            );
            this.reelPositions = [0, 0, 0]; // Current scroll position
            this.reelSpeeds = [0, 0, 0]; // Scroll speed per reel
            this.reelTargets = [null, null, null]; // Target stop positions
            this.finalSymbols = ['7', '7', '7']; // Final symbols shown
            this.winHighlight = 0; // For win animation
            this.lastWinAmount = 0;
            this.lastTime = 0;
            this.draw(); this.updateControls();
          }
          stop() { if (this.animationId) cancelAnimationFrame(this.animationId); }
          spin() {
            const bet = parseInt(this.betInput.value) || 10;
            if (bet > playerBalance) { alert('Not enough GC!'); return; }
            placeBet(bet);
            SoundManager.play('click');
            this.currentBet = bet;
            this.spinning = true;
            this.winHighlight = 0;
            this.lastWinAmount = 0;
            this.updateControls();

            // Initialize spin with staggered speeds
            this.reelSpeeds = [25 + Math.random() * 5, 28 + Math.random() * 5, 31 + Math.random() * 5];
            this.reelTargets = [null, null, null];
            this.stopTimes = [
              performance.now() + 1000 + Math.random() * 200,  // Reel 0 stops first
              performance.now() + 1400 + Math.random() * 200,  // Reel 1 stops second
              performance.now() + 1800 + Math.random() * 200   // Reel 2 stops last
            ];

            // Generate final results
            this.finalSymbols = Array(this.reels).fill(null).map(() =>
              this.symbols[Math.floor(Math.random() * this.symbols.length)]
            );

            this.lastTime = performance.now();
            this.animate();
          }
          animate(currentTime = performance.now()) {
            const deltaTime = Math.min((currentTime - this.lastTime) / 16.67, 3);
            this.lastTime = currentTime;

            let stillSpinning = false;

            for (let i = 0; i < this.reels; i++) {
              if (this.reelSpeeds[i] > 0) {
                stillSpinning = true;

                // Check if it's time to start stopping this reel
                if (currentTime >= this.stopTimes[i] && this.reelTargets[i] === null) {
                  // Set target to final symbol
                  const finalIdx = this.symbols.indexOf(this.finalSymbols[i]);
                  this.reelTargets[i] = Math.floor(this.reelPositions[i] / 60) * 60 + finalIdx * 60 + 120;
                  SoundManager.play('drop');
                }

                // Apply deceleration if we have a target
                if (this.reelTargets[i] !== null) {
                  const distance = this.reelTargets[i] - this.reelPositions[i];
                  if (distance > 10) {
                    // Ease out deceleration
                    this.reelSpeeds[i] = Math.max(2, distance * 0.08);
                  } else {
                    // Snap to target
                    this.reelPositions[i] = this.reelTargets[i];
                    this.reelSpeeds[i] = 0;
                    SoundManager.play('flip');
                  }
                }

                // Update position
                this.reelPositions[i] += this.reelSpeeds[i] * deltaTime;

                // Play tick sound occasionally during fast spin
                if (this.reelSpeeds[i] > 15 && Math.random() < 0.1) {
                  SoundManager.play('spin');
                }
              }
            }

            // Update particles and floating texts
            this.particles.update();
            this.floatingTexts = this.floatingTexts.filter(t => {
              t.y -= 1.2 * deltaTime;
              t.life -= 0.015 * deltaTime;
              return t.life > 0;
            });

            // Win highlight animation
            if (this.winHighlight > 0) {
              this.winHighlight -= 0.02 * deltaTime;
            }

            this.draw();

            if (stillSpinning) {
              this.animationId = requestAnimationFrame((t) => this.animate(t));
            } else {
              this.checkWin();
            }
          }
          checkWin() {
            this.spinning = false;
            const symbols = this.finalSymbols;
            let winAmount = 0;
            let isTriple = false;

            // Check for matches
            if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
              isTriple = true;
              const sym = symbols[0];
              const payout = this.payouts[sym] ? this.payouts[sym][2] : 5;
              winAmount = Math.floor(this.currentBet * payout);
              if (sym === '7') {
                vscode.postMessage({ command: 'casinoWin', game: 'lucky-7', amount: winAmount });
              }
            } else if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {
              const matchSym = symbols[0] === symbols[1] ? symbols[0] : (symbols[1] === symbols[2] ? symbols[1] : symbols[0]);
              const payout = this.payouts[matchSym] ? this.payouts[matchSym][0] : 0.5;
              winAmount = Math.floor(this.currentBet * payout);
            }

            if (winAmount > 0) {
              this.lastWinAmount = winAmount;
              this.winHighlight = 1;
              this.onUpdate(winAmount, true);
              SoundManager.play('win');

              // Particles for win
              const reelWidth = (this.canvas.width - 60) / 3;
              const centerY = 160;
              if (isTriple) {
                // Big celebration for triple
                for (let i = 0; i < 3; i++) {
                  const x = 30 + i * reelWidth + reelWidth / 2;
                  this.particles.burst(x, centerY, 20, [this.symbolColors[symbols[i]] || '#fbbf24', '#fff'], 5);
                }
                // Floating text
                this.floatingTexts.push({
                  x: this.canvas.width / 2, y: 80,
                  text: '+' + winAmount + ' GC!',
                  color: '#4ade80', life: 1, scale: 1.5
                });
              } else {
                this.particles.burst(this.canvas.width / 2, centerY, 10, ['#fbbf24', '#fff'], 3);
                this.floatingTexts.push({
                  x: this.canvas.width / 2, y: 80,
                  text: '+' + winAmount + ' GC',
                  color: '#fbbf24', life: 1, scale: 1
                });
              }

              if (winAmount >= this.currentBet * 100) {
                vscode.postMessage({ command: 'casinoWin', game: 'jackpot', amount: winAmount });
              }

              // Continue animation for effects
              this.continueEffects();
            } else {
              SoundManager.play('lose');
              this.onUpdate(this.currentBet, false);
            }

            this.updateControls();
          }
          continueEffects() {
            const hasEffects = this.particles.particles.length > 0 ||
                             this.floatingTexts.length > 0 ||
                             this.winHighlight > 0;
            if (hasEffects) {
              this.particles.update();
              this.floatingTexts = this.floatingTexts.filter(t => {
                t.y -= 1.2;
                t.life -= 0.015;
                return t.life > 0;
              });
              if (this.winHighlight > 0) this.winHighlight -= 0.02;
              this.draw();
              requestAnimationFrame(() => this.continueEffects());
            }
          }
          updateControls() {
            this.controls.innerHTML = '';
            const spinBtn = document.createElement('button');
            spinBtn.className = 'btn btn-bet'; spinBtn.textContent = 'SPIN';
            spinBtn.onclick = () => this.spin();
            spinBtn.disabled = this.spinning;
            this.controls.appendChild(spinBtn);
          }
          draw() {
            // Background with gradient
            const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            bgGrad.addColorStop(0, '#1a0f2e');
            bgGrad.addColorStop(1, '#2d1b4e');
            this.ctx.fillStyle = bgGrad;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Decorative lights at top
            for (let i = 0; i < 10; i++) {
              const x = 25 + i * ((this.canvas.width - 50) / 9);
              const hue = (Date.now() / 20 + i * 36) % 360;
              this.ctx.beginPath();
              this.ctx.arc(x, 25, 6, 0, Math.PI * 2);
              this.ctx.fillStyle = 'hsl(' + hue + ', 80%, 60%)';
              this.ctx.fill();
              // Glow
              const glow = this.ctx.createRadialGradient(x, 25, 0, x, 25, 15);
              glow.addColorStop(0, 'hsla(' + hue + ', 80%, 60%, 0.4)');
              glow.addColorStop(1, 'transparent');
              this.ctx.fillStyle = glow;
              this.ctx.fillRect(x - 15, 10, 30, 30);
            }

            // Title
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.font = 'bold 28px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = '#fbbf24';
            this.ctx.shadowBlur = 10;
            this.ctx.fillText('SLOTS', this.canvas.width / 2, 65);
            this.ctx.shadowBlur = 0;

            // Slot machine frame with 3D effect
            const frameX = 15, frameY = 90, frameW = this.canvas.width - 30, frameH = 130;

            // Outer frame glow
            if (this.winHighlight > 0) {
              this.ctx.shadowColor = '#4ade80';
              this.ctx.shadowBlur = 30 * this.winHighlight;
            }

            // Frame background
            const frameGrad = this.ctx.createLinearGradient(frameX, frameY, frameX, frameY + frameH);
            frameGrad.addColorStop(0, '#2a2a2a');
            frameGrad.addColorStop(0.5, '#1a1a1a');
            frameGrad.addColorStop(1, '#0a0a0a');
            this.ctx.fillStyle = frameGrad;
            this.ctx.beginPath();
            this.ctx.roundRect(frameX, frameY, frameW, frameH, 10);
            this.ctx.fill();

            // Frame border
            this.ctx.strokeStyle = '#fbbf24';
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;

            // Inner gold trim
            this.ctx.strokeStyle = '#b8860b';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.roundRect(frameX + 6, frameY + 6, frameW - 12, frameH - 12, 6);
            this.ctx.stroke();

            // Reels
            const reelWidth = (frameW - 40) / 3;
            const reelHeight = frameH - 30;
            const reelY = frameY + 15;

            for (let i = 0; i < 3; i++) {
              const reelX = frameX + 15 + i * (reelWidth + 5);

              // Reel background
              this.ctx.fillStyle = '#fff';
              this.ctx.beginPath();
              this.ctx.roundRect(reelX, reelY, reelWidth, reelHeight, 4);
              this.ctx.fill();

              // Draw symbols (3 visible, scrolling)
              this.ctx.save();
              this.ctx.beginPath();
              this.ctx.roundRect(reelX, reelY, reelWidth, reelHeight, 4);
              this.ctx.clip();

              const symbolHeight = 60;
              const offset = this.reelPositions[i] % symbolHeight;
              const baseIndex = Math.floor(this.reelPositions[i] / symbolHeight);

              // Draw 3 symbols
              for (let j = -1; j <= 1; j++) {
                const symIndex = (baseIndex + j + 100 * this.symbols.length) % this.symbols.length;
                const sym = this.spinning ? this.symbols[symIndex] : (j === 0 ? this.finalSymbols[i] : this.symbols[(symIndex + j + this.symbols.length) % this.symbols.length]);
                const y = reelY + reelHeight / 2 + j * symbolHeight - offset + symbolHeight / 2;

                // Blur effect when spinning fast
                if (this.reelSpeeds[i] > 10) {
                  this.ctx.globalAlpha = 0.4;
                }

                this.ctx.fillStyle = '#000';
                this.ctx.font = 'bold 32px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(sym, reelX + reelWidth / 2, y);
                this.ctx.globalAlpha = 1;
              }

              this.ctx.restore();

              // Highlight center row
              this.ctx.strokeStyle = this.winHighlight > 0 ? 'rgba(74, 222, 128, ' + this.winHighlight + ')' : 'rgba(251, 191, 36, 0.3)';
              this.ctx.lineWidth = this.winHighlight > 0 ? 3 : 1;
              this.ctx.beginPath();
              this.ctx.roundRect(reelX - 2, reelY + reelHeight / 2 - 25, reelWidth + 4, 50, 4);
              this.ctx.stroke();
            }

            // Win line indicator arrows
            this.ctx.fillStyle = this.winHighlight > 0 ? '#4ade80' : '#fbbf24';
            // Left arrow
            this.ctx.beginPath();
            this.ctx.moveTo(frameX - 5, frameY + frameH / 2);
            this.ctx.lineTo(frameX + 8, frameY + frameH / 2 - 10);
            this.ctx.lineTo(frameX + 8, frameY + frameH / 2 + 10);
            this.ctx.fill();
            // Right arrow
            this.ctx.beginPath();
            this.ctx.moveTo(frameX + frameW + 5, frameY + frameH / 2);
            this.ctx.lineTo(frameX + frameW - 8, frameY + frameH / 2 - 10);
            this.ctx.lineTo(frameX + frameW - 8, frameY + frameH / 2 + 10);
            this.ctx.fill();

            // Paytable
            this.ctx.fillStyle = '#888';
            this.ctx.font = '11px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('777 = 100x  |  BAR = 50x  |  2 match = 1-5x', this.canvas.width / 2, 245);

            // Last win display
            if (this.lastWinAmount > 0 && !this.spinning) {
              this.ctx.fillStyle = '#4ade80';
              this.ctx.font = 'bold 16px sans-serif';
              this.ctx.fillText('WIN: ' + this.lastWinAmount + ' GC', this.canvas.width / 2, 270);
            }

            this.ctx.textAlign = 'left';

            // Draw particles
            this.particles.draw();

            // Draw floating texts
            this.floatingTexts.forEach(t => {
              this.ctx.globalAlpha = t.life;
              this.ctx.fillStyle = t.color;
              this.ctx.font = 'bold ' + (16 * (t.scale || 1)) + 'px sans-serif';
              this.ctx.textAlign = 'center';
              this.ctx.fillText(t.text, t.x, t.y);
            });
            this.ctx.globalAlpha = 1;
            this.ctx.textAlign = 'left';
          }
        }
      </script>
    </body>
    </html>`;
  }

  public dispose(): void {
    BrainrotPanel.currentPanel = undefined;
    this._panel.dispose();
    this._pomodoroManager?.dispose();
    this._disposables.forEach((d) => d.dispose());
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
