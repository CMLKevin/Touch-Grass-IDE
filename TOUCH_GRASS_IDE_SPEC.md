# Touch Grass IDE — Technical Specification

> "The open-source brainrot IDE that YC should have funded."

A VSCode extension that integrates entertainment, social media, and minigames into your coding workflow during AI generation wait times. Built as a free, open-source alternative to Chad IDE.

---

## 1. Product Overview

### 1.1 Positioning

Touch Grass IDE is a satirical-but-functional VSCode extension that:
- Detects when AI coding tools (Claude Code, Cursor, Copilot, etc.) are generating
- Surfaces a "brainrot panel" with entertainment options during wait times
- Auto-dismisses when generation completes
- Tracks your productivity vs. degeneracy ratio
- Includes an achievement system for maximum meme value

### 1.2 Key Differentiators from Chad IDE

| Feature | Chad IDE | Touch Grass IDE |
|---------|----------|-----------------|
| Pricing | Closed beta, likely paid | Free & open source |
| Availability | Invite-only waitlist | Install from marketplace |
| Platform | Custom IDE | VSCode extension (works everywhere) |
| AI Tool Support | Proprietary integration | Works with any terminal-based AI tool |
| Self-Awareness | "Productivity tool" | Knows it's degenerate (achievement system) |
| Anti-Brainrot Mode | None | Pomodoro mode that blocks brainrot |

### 1.3 Target Audience

- Developers who use AI coding assistants (Claude Code, Cursor, Copilot)
- The "chronically online" developer demographic
- People who appreciated the Chad IDE concept but won't pay/wait for access
- Developers who want a laugh while shipping code

---

## 2. Technical Architecture

### 2.1 Extension Structure

```
touch-grass-ide/
├── .vscode/
│   └── launch.json                 # Extension debugging config
├── src/
│   ├── extension.ts                # Main extension entry point
│   ├── core/
│   │   ├── ActivityDetector.ts     # Terminal/AI generation detection
│   │   ├── StateManager.ts         # Global state management
│   │   ├── SessionTracker.ts       # Time tracking & analytics
│   │   └── AchievementEngine.ts    # Achievement system logic
│   ├── panels/
│   │   ├── BrainrotPanel.ts        # Main webview panel controller
│   │   ├── StatsPanel.ts           # Statistics dashboard panel
│   │   └── SettingsPanel.ts        # Settings UI panel
│   ├── providers/
│   │   ├── StatusBarProvider.ts    # Status bar integration
│   │   └── TreeViewProvider.ts     # Sidebar tree view (optional)
│   ├── webview/
│   │   ├── index.html              # Main brainrot panel HTML
│   │   ├── stats.html              # Stats dashboard HTML
│   │   ├── settings.html           # Settings panel HTML
│   │   ├── styles/
│   │   │   ├── main.css
│   │   │   └── themes/
│   │   │       ├── dark.css
│   │   │       └── brainrot.css    # Extra cursed theme
│   │   ├── scripts/
│   │   │   ├── main.ts             # Main webview logic
│   │   │   ├── games/
│   │   │   │   ├── snake.ts
│   │   │   │   ├── tetris.ts
│   │   │   │   ├── 2048.ts
│   │   │   │   └── flappy.ts
│   │   │   ├── embeds/
│   │   │   │   ├── tiktok.ts
│   │   │   │   ├── youtube.ts
│   │   │   │   ├── twitter.ts
│   │   │   │   └── custom.ts
│   │   │   └── components/
│   │   │       ├── TabSwitcher.ts
│   │   │       ├── Timer.ts
│   │   │       └── AchievementPopup.ts
│   │   └── assets/
│   │       ├── icons/
│   │       ├── sounds/             # Achievement sounds
│   │       └── images/
├── test/
│   ├── suite/
│   │   ├── extension.test.ts
│   │   ├── activityDetector.test.ts
│   │   └── achievements.test.ts
│   └── runTest.ts
├── package.json                    # Extension manifest
├── tsconfig.json
├── webpack.config.js               # Bundle webview assets
├── README.md
├── CHANGELOG.md
└── LICENSE                         # MIT
```

### 2.2 Core Dependencies

```json
{
  "devDependencies": {
    "@types/vscode": "^1.84.0",
    "@types/node": "^20.x",
    "typescript": "^5.3.0",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "ts-loader": "^9.5.0",
    "@vscode/test-electron": "^2.3.0",
    "esbuild": "^0.19.0"
  },
  "dependencies": {
    // Minimal runtime dependencies - keep it lean
  }
}
```

### 2.3 VSCode Extension Manifest (package.json)

```json
{
  "name": "touch-grass-ide",
  "displayName": "Touch Grass IDE",
  "description": "The open-source brainrot IDE. Gamble with your time while AI writes your code.",
  "version": "1.0.0",
  "publisher": "pigeon",
  "repository": {
    "type": "git",
    "url": "https://github.com/CMLKevin/touch-grass-ide"
  },
  "engines": {
    "vscode": "^1.84.0"
  },
  "categories": [
    "Other",
    "Entertainment"
  ],
  "keywords": [
    "brainrot",
    "ai",
    "productivity",
    "games",
    "chad",
    "vibe-coding"
  ],
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "touchgrass.openBrainrot",
        "title": "Touch Grass: Open Brainrot Panel",
        "icon": "$(game)"
      },
      {
        "command": "touchgrass.openStats",
        "title": "Touch Grass: View Stats Dashboard"
      },
      {
        "command": "touchgrass.openSettings",
        "title": "Touch Grass: Settings"
      },
      {
        "command": "touchgrass.toggleAutoMode",
        "title": "Touch Grass: Toggle Auto-Detection"
      },
      {
        "command": "touchgrass.startPomodoro",
        "title": "Touch Grass: Start Pomodoro Mode"
      },
      {
        "command": "touchgrass.resetStats",
        "title": "Touch Grass: Reset All Stats"
      }
    ],
    "configuration": {
      "title": "Touch Grass IDE",
      "properties": {
        "touchgrass.autoDetect": {
          "type": "boolean",
          "default": true,
          "description": "Automatically show brainrot panel during AI generation"
        },
        "touchgrass.autoMinimize": {
          "type": "boolean",
          "default": true,
          "description": "Auto-hide panel when AI generation completes"
        },
        "touchgrass.brainrotIntensity": {
          "type": "string",
          "enum": ["touching-grass", "casual", "degenerate", "terminal"],
          "default": "casual",
          "description": "How much brainrot do you want?"
        },
        "touchgrass.defaultTab": {
          "type": "string",
          "enum": ["games", "social", "custom"],
          "default": "games",
          "description": "Default tab when panel opens"
        },
        "touchgrass.pomodoroWorkMinutes": {
          "type": "number",
          "default": 25,
          "description": "Work duration in Pomodoro mode"
        },
        "touchgrass.pomodoroBreakMinutes": {
          "type": "number",
          "default": 5,
          "description": "Break duration in Pomodoro mode"
        },
        "touchgrass.customSources": {
          "type": "array",
          "default": [],
          "description": "Custom URLs to embed in brainrot panel",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "url": { "type": "string" },
              "icon": { "type": "string" }
            }
          }
        },
        "touchgrass.enableSounds": {
          "type": "boolean",
          "default": true,
          "description": "Play sounds for achievements"
        },
        "touchgrass.enableAchievements": {
          "type": "boolean",
          "default": true,
          "description": "Show achievement notifications"
        }
      }
    },
    "viewsContainers": {
      "activitybar": [
        {
          "id": "touchgrass",
          "title": "Touch Grass",
          "icon": "resources/icon.svg"
        }
      ]
    },
    "views": {
      "touchgrass": [
        {
          "id": "touchgrass.quickActions",
          "name": "Quick Actions"
        },
        {
          "id": "touchgrass.stats",
          "name": "Today's Stats"
        },
        {
          "id": "touchgrass.achievements",
          "name": "Achievements"
        }
      ]
    },
    "menus": {
      "editor/title": [
        {
          "command": "touchgrass.openBrainrot",
          "group": "navigation",
          "when": "config.touchgrass.showInTitleBar"
        }
      ]
    }
  }
}
```

---

## 3. Core Features Specification

### 3.1 Activity Detection System

The heart of the extension—detecting when AI tools are generating code.

```typescript
// src/core/ActivityDetector.ts

interface DetectionConfig {
  // Terminal patterns that indicate AI generation in progress
  terminalPatterns: {
    claudeCode: RegExp[];
    cursor: RegExp[];
    copilot: RegExp[];
    generic: RegExp[];
  };
  // Minimum duration before triggering brainrot panel (ms)
  triggerThreshold: number;
  // How often to check terminal output (ms)
  pollInterval: number;
}

const DEFAULT_PATTERNS: DetectionConfig = {
  terminalPatterns: {
    claudeCode: [
      /⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏/,  // Spinner characters
      /Thinking\.\.\./i,
      /Generating\.\.\./i,
      /Claude is writing/i,
      /\[claude\].*processing/i,
    ],
    cursor: [
      /Generating code/i,
      /AI is thinking/i,
      /Cursor.*processing/i,
    ],
    copilot: [
      /Copilot.*suggesting/i,
      /Synthesizing/i,
    ],
    generic: [
      /loading|processing|generating|thinking|waiting/i,
      /\.{3,}/,  // Multiple dots often indicate loading
    ]
  },
  triggerThreshold: 2000,  // 2 seconds before showing panel
  pollInterval: 500,       // Check every 500ms
};

class ActivityDetector {
  private isGenerating: boolean = false;
  private generationStartTime: number | null = null;
  private disposables: vscode.Disposable[] = [];
  
  // Event emitters
  private _onGenerationStart = new vscode.EventEmitter<void>();
  private _onGenerationEnd = new vscode.EventEmitter<void>();
  
  public onGenerationStart = this._onGenerationStart.event;
  public onGenerationEnd = this._onGenerationEnd.event;
  
  constructor(private config: DetectionConfig = DEFAULT_PATTERNS) {}
  
  public activate(): void {
    // Watch terminal output
    this.disposables.push(
      vscode.window.onDidWriteTerminalData(this.handleTerminalData.bind(this))
    );
    
    // Watch for terminal creation/disposal
    this.disposables.push(
      vscode.window.onDidOpenTerminal(this.handleTerminalOpen.bind(this))
    );
    
    // Periodic check for stuck states
    setInterval(() => this.checkGenerationTimeout(), 5000);
  }
  
  private handleTerminalData(e: vscode.TerminalDataWriteEvent): void {
    const data = e.data;
    const isGenerationIndicator = this.matchesGenerationPattern(data);
    
    if (isGenerationIndicator && !this.isGenerating) {
      this.startGeneration();
    } else if (!isGenerationIndicator && this.isGenerating) {
      // Check if output indicates completion
      if (this.matchesCompletionPattern(data)) {
        this.endGeneration();
      }
    }
  }
  
  private matchesGenerationPattern(data: string): boolean {
    const allPatterns = [
      ...this.config.terminalPatterns.claudeCode,
      ...this.config.terminalPatterns.cursor,
      ...this.config.terminalPatterns.copilot,
      ...this.config.terminalPatterns.generic,
    ];
    return allPatterns.some(pattern => pattern.test(data));
  }
  
  private matchesCompletionPattern(data: string): boolean {
    const completionPatterns = [
      /Done!/i,
      /Complete/i,
      /Finished/i,
      /\n\$/,  // New prompt appeared
      />/,     // Shell prompt
    ];
    return completionPatterns.some(pattern => pattern.test(data));
  }
  
  private startGeneration(): void {
    this.isGenerating = true;
    this.generationStartTime = Date.now();
    
    // Only fire event after threshold
    setTimeout(() => {
      if (this.isGenerating) {
        this._onGenerationStart.fire();
      }
    }, this.config.triggerThreshold);
  }
  
  private endGeneration(): void {
    if (this.isGenerating) {
      this.isGenerating = false;
      this.generationStartTime = null;
      this._onGenerationEnd.fire();
    }
  }
  
  private checkGenerationTimeout(): void {
    // Auto-end generation if it's been too long (probably missed the end signal)
    if (this.isGenerating && this.generationStartTime) {
      const elapsed = Date.now() - this.generationStartTime;
      if (elapsed > 300000) { // 5 minutes max
        this.endGeneration();
      }
    }
  }
  
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
```

### 3.2 Brainrot Panel (Webview)

The main entertainment panel that appears during generation.

```typescript
// src/panels/BrainrotPanel.ts

class BrainrotPanel {
  public static currentPanel: BrainrotPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  
  public static createOrShow(extensionUri: vscode.Uri): BrainrotPanel {
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
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist', 'webview')
        ]
      }
    );
    
    BrainrotPanel.currentPanel = new BrainrotPanel(panel, extensionUri);
    return BrainrotPanel.currentPanel;
  }
  
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    
    this._update();
    
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    
    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      message => this._handleMessage(message),
      null,
      this._disposables
    );
  }
  
  public minimize(): void {
    // Don't dispose, just hide
    this._panel.visible && this._panel.reveal(undefined, true);
  }
  
  public show(): void {
    this._panel.reveal(vscode.ViewColumn.Beside);
  }
  
  private _handleMessage(message: any): void {
    switch (message.command) {
      case 'achievementUnlocked':
        AchievementEngine.getInstance().unlock(message.achievementId);
        break;
      case 'trackTime':
        SessionTracker.getInstance().addBrainrotTime(message.duration);
        break;
      case 'gameScore':
        SessionTracker.getInstance().recordGameScore(message.game, message.score);
        break;
      case 'requestStats':
        this._sendStats();
        break;
    }
  }
  
  private _sendStats(): void {
    const stats = SessionTracker.getInstance().getStats();
    this._panel.webview.postMessage({ command: 'statsUpdate', stats });
  }
  
  private _update(): void {
    this._panel.webview.html = this._getHtmlContent();
  }
  
  private _getHtmlContent(): string {
    const webviewUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview')
    );
    
    const config = vscode.workspace.getConfiguration('touchgrass');
    const intensity = config.get<string>('brainrotIntensity', 'casual');
    const customSources = config.get<any[]>('customSources', []);
    
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${this._panel.webview.cspSource} 'unsafe-inline';
        script-src ${this._panel.webview.cspSource};
        img-src ${this._panel.webview.cspSource} https: data:;
        frame-src https://www.youtube.com https://www.tiktok.com https://twitter.com https://x.com;
        connect-src https:;
      ">
      <link rel="stylesheet" href="${webviewUri}/styles/main.css">
      <title>Touch Grass IDE</title>
    </head>
    <body class="intensity-${intensity}">
      <div id="app">
        <header class="brainrot-header">
          <h1>🌿 Touch Grass IDE</h1>
          <div class="status-bar">
            <span id="generation-status" class="status generating">AI is cooking...</span>
            <span id="session-time">Session: 0:00</span>
          </div>
        </header>
        
        <nav class="tab-nav">
          <button class="tab-btn active" data-tab="games">🎮 Games</button>
          <button class="tab-btn" data-tab="social">📱 Social</button>
          <button class="tab-btn" data-tab="custom">⚙️ Custom</button>
        </nav>
        
        <main class="tab-content">
          <!-- Games Tab -->
          <section id="games-tab" class="tab-panel active">
            <div class="game-grid">
              <button class="game-card" data-game="snake">
                <span class="game-icon">🐍</span>
                <span class="game-name">Snake</span>
                <span class="game-highscore">High: <span id="snake-high">0</span></span>
              </button>
              <button class="game-card" data-game="2048">
                <span class="game-icon">🔢</span>
                <span class="game-name">2048</span>
                <span class="game-highscore">High: <span id="2048-high">0</span></span>
              </button>
              <button class="game-card" data-game="tetris">
                <span class="game-icon">🧱</span>
                <span class="game-name">Tetris</span>
                <span class="game-highscore">High: <span id="tetris-high">0</span></span>
              </button>
              <button class="game-card" data-game="flappy">
                <span class="game-icon">🐦</span>
                <span class="game-name">Flappy</span>
                <span class="game-highscore">High: <span id="flappy-high">0</span></span>
              </button>
            </div>
            <div id="game-container" class="game-container hidden">
              <canvas id="game-canvas"></canvas>
              <div id="game-ui">
                <span id="game-score">Score: 0</span>
                <button id="game-close" class="btn-close">✕ Back</button>
              </div>
            </div>
          </section>
          
          <!-- Social Tab -->
          <section id="social-tab" class="tab-panel">
            <div class="social-nav">
              <button class="social-btn active" data-social="tiktok">TikTok</button>
              <button class="social-btn" data-social="youtube">YouTube Shorts</button>
              <button class="social-btn" data-social="twitter">Twitter/X</button>
            </div>
            <div class="embed-container">
              <iframe id="social-embed" src="" frameborder="0" allowfullscreen></iframe>
              <div class="embed-placeholder">
                <p>Select a platform above</p>
                <p class="disclaimer">⚠️ Content loads in iframe. Some features may be limited.</p>
              </div>
            </div>
          </section>
          
          <!-- Custom Tab -->
          <section id="custom-tab" class="tab-panel">
            <div class="custom-sources">
              <div id="custom-sources-list"></div>
              <button id="add-custom-source" class="btn-add">+ Add Custom Source</button>
            </div>
            <div class="embed-container">
              <iframe id="custom-embed" src="" frameborder="0"></iframe>
            </div>
          </section>
        </main>
        
        <footer class="brainrot-footer">
          <div class="degeneracy-meter">
            <span>Degeneracy Level:</span>
            <div class="meter-bar">
              <div id="degeneracy-fill" class="meter-fill" style="width: 0%"></div>
            </div>
            <span id="degeneracy-label">Touching Grass</span>
          </div>
        </footer>
        
        <!-- Achievement popup -->
        <div id="achievement-popup" class="achievement-popup hidden">
          <div class="achievement-content">
            <span class="achievement-icon">🏆</span>
            <div class="achievement-text">
              <span class="achievement-title">Achievement Unlocked!</span>
              <span id="achievement-name"></span>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        window.TOUCHGRASS_CONFIG = {
          intensity: '${intensity}',
          customSources: ${JSON.stringify(customSources)},
          webviewUri: '${webviewUri}'
        };
      </script>
      <script src="${webviewUri}/scripts/main.js"></script>
    </body>
    </html>`;
  }
  
  public dispose(): void {
    BrainrotPanel.currentPanel = undefined;
    this._panel.dispose();
    this._disposables.forEach(d => d.dispose());
  }
}
```

### 3.3 Session Tracker & Stats

```typescript
// src/core/SessionTracker.ts

interface SessionStats {
  // Today's stats
  today: {
    codingTimeMs: number;
    brainrotTimeMs: number;
    gamesPlayed: number;
    achievementsUnlocked: number;
    aiGenerationsDetected: number;
  };
  // All-time stats
  allTime: {
    totalCodingTimeMs: number;
    totalBrainrotTimeMs: number;
    totalGamesPlayed: number;
    totalAchievements: number;
    gameHighScores: Record<string, number>;
    longestBrainrotSession: number;
    daysActive: number;
  };
  // Computed metrics
  computed: {
    productivityRatio: number;      // coding / (coding + brainrot)
    degeneracyLevel: string;        // "touching-grass" | "casual" | "degenerate" | "terminal"
    averageBrainrotPerGeneration: number;
  };
}

class SessionTracker {
  private static instance: SessionTracker;
  private stats: SessionStats;
  private context: vscode.ExtensionContext;
  private sessionStartTime: number;
  private brainrotStartTime: number | null = null;
  
  public static getInstance(): SessionTracker {
    if (!SessionTracker.instance) {
      throw new Error('SessionTracker not initialized');
    }
    return SessionTracker.instance;
  }
  
  public static initialize(context: vscode.ExtensionContext): SessionTracker {
    SessionTracker.instance = new SessionTracker(context);
    return SessionTracker.instance;
  }
  
  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.sessionStartTime = Date.now();
    this.stats = this.loadStats();
    
    // Check if it's a new day
    this.checkNewDay();
    
    // Save stats periodically
    setInterval(() => this.saveStats(), 30000);
  }
  
  private loadStats(): SessionStats {
    const saved = this.context.globalState.get<SessionStats>('touchgrass.stats');
    if (saved) return saved;
    
    return this.getDefaultStats();
  }
  
  private getDefaultStats(): SessionStats {
    return {
      today: {
        codingTimeMs: 0,
        brainrotTimeMs: 0,
        gamesPlayed: 0,
        achievementsUnlocked: 0,
        aiGenerationsDetected: 0,
      },
      allTime: {
        totalCodingTimeMs: 0,
        totalBrainrotTimeMs: 0,
        totalGamesPlayed: 0,
        totalAchievements: 0,
        gameHighScores: {},
        longestBrainrotSession: 0,
        daysActive: 1,
      },
      computed: {
        productivityRatio: 1.0,
        degeneracyLevel: 'touching-grass',
        averageBrainrotPerGeneration: 0,
      }
    };
  }
  
  private checkNewDay(): void {
    const lastActive = this.context.globalState.get<string>('touchgrass.lastActiveDate');
    const today = new Date().toDateString();
    
    if (lastActive !== today) {
      // Reset daily stats
      this.stats.today = this.getDefaultStats().today;
      this.stats.allTime.daysActive++;
      this.context.globalState.update('touchgrass.lastActiveDate', today);
    }
  }
  
  public startBrainrot(): void {
    this.brainrotStartTime = Date.now();
    this.stats.today.aiGenerationsDetected++;
  }
  
  public endBrainrot(): void {
    if (this.brainrotStartTime) {
      const duration = Date.now() - this.brainrotStartTime;
      this.addBrainrotTime(duration);
      this.brainrotStartTime = null;
    }
  }
  
  public addBrainrotTime(durationMs: number): void {
    this.stats.today.brainrotTimeMs += durationMs;
    this.stats.allTime.totalBrainrotTimeMs += durationMs;
    
    if (durationMs > this.stats.allTime.longestBrainrotSession) {
      this.stats.allTime.longestBrainrotSession = durationMs;
    }
    
    this.updateComputedStats();
    this.checkBrainrotAchievements(durationMs);
  }
  
  public addCodingTime(durationMs: number): void {
    this.stats.today.codingTimeMs += durationMs;
    this.stats.allTime.totalCodingTimeMs += durationMs;
    this.updateComputedStats();
  }
  
  public recordGameScore(game: string, score: number): void {
    this.stats.today.gamesPlayed++;
    this.stats.allTime.totalGamesPlayed++;
    
    const currentHigh = this.stats.allTime.gameHighScores[game] || 0;
    if (score > currentHigh) {
      this.stats.allTime.gameHighScores[game] = score;
      // Trigger high score achievement check
      AchievementEngine.getInstance().checkGameAchievements(game, score);
    }
  }
  
  private updateComputedStats(): void {
    const totalTime = this.stats.today.codingTimeMs + this.stats.today.brainrotTimeMs;
    
    this.stats.computed.productivityRatio = totalTime > 0 
      ? this.stats.today.codingTimeMs / totalTime 
      : 1.0;
    
    // Calculate degeneracy level
    const brainrotRatio = 1 - this.stats.computed.productivityRatio;
    if (brainrotRatio < 0.1) {
      this.stats.computed.degeneracyLevel = 'touching-grass';
    } else if (brainrotRatio < 0.3) {
      this.stats.computed.degeneracyLevel = 'casual';
    } else if (brainrotRatio < 0.5) {
      this.stats.computed.degeneracyLevel = 'degenerate';
    } else {
      this.stats.computed.degeneracyLevel = 'terminal';
    }
    
    // Average brainrot per generation
    if (this.stats.today.aiGenerationsDetected > 0) {
      this.stats.computed.averageBrainrotPerGeneration = 
        this.stats.today.brainrotTimeMs / this.stats.today.aiGenerationsDetected;
    }
  }
  
  private checkBrainrotAchievements(sessionDuration: number): void {
    const achievements = AchievementEngine.getInstance();
    
    // Check various brainrot milestones
    if (sessionDuration > 60000) achievements.check('brainrot-1min');
    if (sessionDuration > 300000) achievements.check('brainrot-5min');
    if (sessionDuration > 600000) achievements.check('brainrot-10min');
    
    // Check cumulative
    const totalBrainrot = this.stats.allTime.totalBrainrotTimeMs;
    if (totalBrainrot > 3600000) achievements.check('brainrot-1hr-total');
    if (totalBrainrot > 36000000) achievements.check('brainrot-10hr-total');
  }
  
  public getStats(): SessionStats {
    return { ...this.stats };
  }
  
  private saveStats(): void {
    this.context.globalState.update('touchgrass.stats', this.stats);
  }
  
  public reset(): void {
    this.stats = this.getDefaultStats();
    this.saveStats();
  }
}
```

### 3.4 Achievement System

```typescript
// src/core/AchievementEngine.ts

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  secret?: boolean;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'cursed';
}

const ACHIEVEMENTS: Achievement[] = [
  // Getting Started
  {
    id: 'first-brainrot',
    name: 'Baby\'s First Brainrot',
    description: 'Opened the brainrot panel for the first time',
    icon: '👶',
    rarity: 'common'
  },
  {
    id: 'first-game',
    name: 'Gamer Moment',
    description: 'Played your first minigame',
    icon: '🎮',
    rarity: 'common'
  },
  
  // Time-based
  {
    id: 'brainrot-1min',
    name: 'Just a Quick Break',
    description: 'Spent 1 minute in brainrot during a single generation',
    icon: '⏱️',
    rarity: 'common'
  },
  {
    id: 'brainrot-5min',
    name: 'AI is Still Cooking',
    description: 'Spent 5 minutes in brainrot during a single generation',
    icon: '🍳',
    rarity: 'uncommon'
  },
  {
    id: 'brainrot-10min',
    name: 'Touch Grass (Ignored)',
    description: 'Spent 10 minutes in brainrot. Maybe actually touch grass?',
    icon: '🌿',
    rarity: 'rare'
  },
  {
    id: 'brainrot-1hr-total',
    name: 'Professional Procrastinator',
    description: 'Accumulated 1 hour of total brainrot time',
    icon: '📱',
    rarity: 'uncommon'
  },
  {
    id: 'brainrot-10hr-total',
    name: 'Terminal Brainrot',
    description: 'Accumulated 10 hours of total brainrot time. Are you okay?',
    icon: '🧠',
    rarity: 'legendary'
  },
  
  // Productivity
  {
    id: 'productivity-streak-5',
    name: 'Actually Working',
    description: 'Kept productivity ratio above 80% for 5 AI generations in a row',
    icon: '📈',
    rarity: 'rare'
  },
  {
    id: 'no-brainrot-day',
    name: 'Touched Grass Today',
    description: 'Used AI coding tools all day without opening brainrot panel',
    icon: '🌱',
    rarity: 'legendary',
    secret: true
  },
  
  // Gaming
  {
    id: 'snake-100',
    name: 'Snek Master',
    description: 'Score 100+ in Snake',
    icon: '🐍',
    rarity: 'uncommon'
  },
  {
    id: '2048-achieved',
    name: '2048 or Bust',
    description: 'Actually reach 2048 in 2048',
    icon: '🔢',
    rarity: 'rare'
  },
  {
    id: 'tetris-10-lines',
    name: 'Line Clear Pro',
    description: 'Clear 10 lines in a single Tetris session',
    icon: '🧱',
    rarity: 'uncommon'
  },
  {
    id: 'flappy-50',
    name: 'Bird Brain',
    description: 'Score 50+ in Flappy Bird',
    icon: '🐦',
    rarity: 'rare'
  },
  {
    id: 'all-games-played',
    name: 'Jack of All Trades',
    description: 'Played every minigame at least once',
    icon: '🃏',
    rarity: 'common'
  },
  {
    id: 'games-100',
    name: 'Chronic Gamer',
    description: 'Played 100 total minigames',
    icon: '🏆',
    rarity: 'rare'
  },
  
  // Social
  {
    id: 'first-social',
    name: 'Doom Scroller',
    description: 'Opened a social media embed for the first time',
    icon: '📱',
    rarity: 'common'
  },
  {
    id: 'custom-source',
    name: 'Power User',
    description: 'Added a custom brainrot source',
    icon: '⚙️',
    rarity: 'uncommon'
  },
  
  // Secret/Cursed
  {
    id: 'midnight-coder',
    name: 'Sleep is for the Weak',
    description: 'Used Touch Grass IDE between 2am and 5am',
    icon: '🌙',
    rarity: 'cursed',
    secret: true
  },
  {
    id: 'weekend-warrior',
    name: 'No Work-Life Balance',
    description: 'Used Touch Grass IDE on both Saturday and Sunday',
    icon: '💀',
    rarity: 'cursed',
    secret: true
  },
  {
    id: 'degeneracy-terminal',
    name: 'Terminal Velocity',
    description: 'Reached "terminal" degeneracy level',
    icon: '🔥',
    rarity: 'cursed',
    secret: true
  },
  {
    id: 'yc-funded',
    name: 'Why Didn\'t YC Fund This?',
    description: 'Accumulated more brainrot time than code generation time in a day',
    icon: '💸',
    rarity: 'legendary',
    secret: true
  }
];

class AchievementEngine {
  private static instance: AchievementEngine;
  private unlockedAchievements: Set<string>;
  private context: vscode.ExtensionContext;
  private _onAchievementUnlocked = new vscode.EventEmitter<Achievement>();
  
  public onAchievementUnlocked = this._onAchievementUnlocked.event;
  
  public static getInstance(): AchievementEngine {
    if (!AchievementEngine.instance) {
      throw new Error('AchievementEngine not initialized');
    }
    return AchievementEngine.instance;
  }
  
  public static initialize(context: vscode.ExtensionContext): AchievementEngine {
    AchievementEngine.instance = new AchievementEngine(context);
    return AchievementEngine.instance;
  }
  
  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    const saved = context.globalState.get<string[]>('touchgrass.achievements') || [];
    this.unlockedAchievements = new Set(saved);
  }
  
  public check(achievementId: string): boolean {
    if (this.unlockedAchievements.has(achievementId)) {
      return false; // Already unlocked
    }
    return this.unlock(achievementId);
  }
  
  public unlock(achievementId: string): boolean {
    if (this.unlockedAchievements.has(achievementId)) {
      return false;
    }
    
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return false;
    
    this.unlockedAchievements.add(achievementId);
    this.save();
    
    // Fire event for UI
    this._onAchievementUnlocked.fire(achievement);
    
    // Show notification
    const config = vscode.workspace.getConfiguration('touchgrass');
    if (config.get<boolean>('enableAchievements', true)) {
      this.showAchievementNotification(achievement);
    }
    
    // Update stats
    SessionTracker.getInstance().getStats().today.achievementsUnlocked++;
    
    return true;
  }
  
  private showAchievementNotification(achievement: Achievement): void {
    const rarityEmoji = {
      common: '⬜',
      uncommon: '🟩',
      rare: '🟦',
      legendary: '🟨',
      cursed: '🟥'
    };
    
    vscode.window.showInformationMessage(
      `${rarityEmoji[achievement.rarity]} Achievement Unlocked: ${achievement.icon} ${achievement.name}`,
      'View All'
    ).then(selection => {
      if (selection === 'View All') {
        vscode.commands.executeCommand('touchgrass.openStats');
      }
    });
  }
  
  public checkGameAchievements(game: string, score: number): void {
    switch (game) {
      case 'snake':
        if (score >= 100) this.check('snake-100');
        break;
      case '2048':
        if (score >= 2048) this.check('2048-achieved');
        break;
      case 'flappy':
        if (score >= 50) this.check('flappy-50');
        break;
    }
    
    // Check all games played
    const stats = SessionTracker.getInstance().getStats();
    if (stats.allTime.totalGamesPlayed >= 100) {
      this.check('games-100');
    }
  }
  
  public checkTimeBasedAchievements(): void {
    const hour = new Date().getHours();
    if (hour >= 2 && hour < 5) {
      this.check('midnight-coder');
    }
    
    const day = new Date().getDay();
    const weekendUsage = this.context.globalState.get<number[]>('touchgrass.weekendUsage') || [];
    if (day === 0 || day === 6) {
      if (!weekendUsage.includes(day)) {
        weekendUsage.push(day);
        this.context.globalState.update('touchgrass.weekendUsage', weekendUsage);
      }
      if (weekendUsage.includes(0) && weekendUsage.includes(6)) {
        this.check('weekend-warrior');
      }
    }
  }
  
  public getUnlockedAchievements(): Achievement[] {
    return ACHIEVEMENTS.filter(a => 
      this.unlockedAchievements.has(a.id) || !a.secret
    ).map(a => ({
      ...a,
      unlocked: this.unlockedAchievements.has(a.id)
    }));
  }
  
  public getProgress(): { unlocked: number; total: number } {
    return {
      unlocked: this.unlockedAchievements.size,
      total: ACHIEVEMENTS.length
    };
  }
  
  private save(): void {
    this.context.globalState.update(
      'touchgrass.achievements',
      Array.from(this.unlockedAchievements)
    );
  }
}
```

### 3.5 Pomodoro Mode

```typescript
// src/core/PomodoroManager.ts

type PomodoroState = 'idle' | 'working' | 'break' | 'paused';

interface PomodoroConfig {
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionsUntilLongBreak: number;
}

class PomodoroManager {
  private static instance: PomodoroManager;
  private state: PomodoroState = 'idle';
  private timeRemainingMs: number = 0;
  private sessionCount: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private config: PomodoroConfig;
  private extensionUri: vscode.Uri;
  
  private _onStateChange = new vscode.EventEmitter<PomodoroState>();
  private _onTick = new vscode.EventEmitter<number>();
  private _onComplete = new vscode.EventEmitter<'work' | 'break'>();
  
  public onStateChange = this._onStateChange.event;
  public onTick = this._onTick.event;
  public onComplete = this._onComplete.event;
  
  private constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
    this.config = this.loadConfig();
  }
  
  public static getInstance(): PomodoroManager {
    if (!PomodoroManager.instance) {
      throw new Error('PomodoroManager not initialized');
    }
    return PomodoroManager.instance;
  }
  
  public static initialize(extensionUri: vscode.Uri): PomodoroManager {
    PomodoroManager.instance = new PomodoroManager(extensionUri);
    return PomodoroManager.instance;
  }
  
  private loadConfig(): PomodoroConfig {
    const vsConfig = vscode.workspace.getConfiguration('touchgrass');
    return {
      workMinutes: vsConfig.get('pomodoroWorkMinutes', 25),
      breakMinutes: vsConfig.get('pomodoroBreakMinutes', 5),
      longBreakMinutes: vsConfig.get('pomodoroLongBreakMinutes', 15),
      sessionsUntilLongBreak: vsConfig.get('pomodoroSessionsUntilLongBreak', 4),
    };
  }
  
  public start(): void {
    if (this.state !== 'idle' && this.state !== 'paused') return;
    
    this.state = 'working';
    this.timeRemainingMs = this.config.workMinutes * 60 * 1000;
    this._onStateChange.fire(this.state);
    
    // Block brainrot panel during work
    this.blockBrainrot(true);
    
    this.startTimer();
  }
  
  public pause(): void {
    if (this.state === 'working' || this.state === 'break') {
      this.state = 'paused';
      this.stopTimer();
      this._onStateChange.fire(this.state);
    }
  }
  
  public resume(): void {
    if (this.state === 'paused') {
      this.state = 'working'; // Resume to work state
      this.startTimer();
      this._onStateChange.fire(this.state);
    }
  }
  
  public stop(): void {
    this.state = 'idle';
    this.stopTimer();
    this.blockBrainrot(false);
    this._onStateChange.fire(this.state);
  }
  
  private startTimer(): void {
    this.intervalId = setInterval(() => {
      this.timeRemainingMs -= 1000;
      this._onTick.fire(this.timeRemainingMs);
      
      if (this.timeRemainingMs <= 0) {
        this.handleTimerComplete();
      }
    }, 1000);
  }
  
  private stopTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  private handleTimerComplete(): void {
    this.stopTimer();
    
    if (this.state === 'working') {
      // Work session complete
      this.sessionCount++;
      this._onComplete.fire('work');
      
      // Start break
      const isLongBreak = this.sessionCount % this.config.sessionsUntilLongBreak === 0;
      this.state = 'break';
      this.timeRemainingMs = (isLongBreak ? this.config.longBreakMinutes : this.config.breakMinutes) * 60 * 1000;
      
      // Allow brainrot during break
      this.blockBrainrot(false);
      
      // Auto-open brainrot panel for break
      BrainrotPanel.createOrShow(this.extensionUri).show();
      
      this.startTimer();
      this._onStateChange.fire(this.state);
      
      vscode.window.showInformationMessage(
        `🍅 Work session complete! Time for a ${isLongBreak ? 'long ' : ''}break.`
      );
      
    } else if (this.state === 'break') {
      // Break complete
      this._onComplete.fire('break');
      this.state = 'working';
      this.timeRemainingMs = this.config.workMinutes * 60 * 1000;
      
      // Block brainrot again
      this.blockBrainrot(true);
      BrainrotPanel.currentPanel?.minimize();
      
      this.startTimer();
      this._onStateChange.fire(this.state);
      
      vscode.window.showInformationMessage(
        '🍅 Break over! Back to work.'
      );
    }
  }
  
  private blockBrainrot(block: boolean): void {
    // Disable auto-show of brainrot panel during work sessions
    StateManager.getInstance().setBrainrotBlocked(block);
    
    if (block && BrainrotPanel.currentPanel) {
      BrainrotPanel.currentPanel.minimize();
    }
  }
  
  public getState(): { state: PomodoroState; timeRemainingMs: number; sessionCount: number } {
    return {
      state: this.state,
      timeRemainingMs: this.timeRemainingMs,
      sessionCount: this.sessionCount,
    };
  }
}
```

---

## 4. Minigames Specification

### 4.1 Snake

```typescript
// src/webview/scripts/games/snake.ts

interface SnakeGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  gridSize: number;
  snake: { x: number; y: number }[];
  food: { x: number; y: number };
  direction: 'up' | 'down' | 'left' | 'right';
  score: number;
  gameLoop: number | null;
  speed: number;
}

class Snake implements SnakeGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  gridSize = 20;
  snake: { x: number; y: number }[] = [];
  food = { x: 0, y: 0 };
  direction: 'up' | 'down' | 'left' | 'right' = 'right';
  score = 0;
  gameLoop: number | null = null;
  speed = 100; // ms between moves
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.canvas.width = 400;
    this.canvas.height = 400;
    this.init();
  }
  
  init(): void {
    // Initialize snake in center
    const centerX = Math.floor(this.canvas.width / this.gridSize / 2);
    const centerY = Math.floor(this.canvas.height / this.gridSize / 2);
    this.snake = [
      { x: centerX, y: centerY },
      { x: centerX - 1, y: centerY },
      { x: centerX - 2, y: centerY },
    ];
    this.direction = 'right';
    this.score = 0;
    this.spawnFood();
    this.bindControls();
  }
  
  start(): void {
    if (this.gameLoop) return;
    this.gameLoop = window.setInterval(() => this.update(), this.speed);
  }
  
  pause(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }
  
  update(): void {
    const head = { ...this.snake[0] };
    
    switch (this.direction) {
      case 'up': head.y--; break;
      case 'down': head.y++; break;
      case 'left': head.x--; break;
      case 'right': head.x++; break;
    }
    
    // Check collisions
    if (this.checkCollision(head)) {
      this.gameOver();
      return;
    }
    
    this.snake.unshift(head);
    
    // Check food
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.spawnFood();
      this.onScoreUpdate?.(this.score);
    } else {
      this.snake.pop();
    }
    
    this.draw();
  }
  
  checkCollision(head: { x: number; y: number }): boolean {
    const maxX = this.canvas.width / this.gridSize;
    const maxY = this.canvas.height / this.gridSize;
    
    // Wall collision
    if (head.x < 0 || head.x >= maxX || head.y < 0 || head.y >= maxY) {
      return true;
    }
    
    // Self collision
    return this.snake.some(segment => segment.x === head.x && segment.y === head.y);
  }
  
  spawnFood(): void {
    const maxX = this.canvas.width / this.gridSize;
    const maxY = this.canvas.height / this.gridSize;
    
    do {
      this.food = {
        x: Math.floor(Math.random() * maxX),
        y: Math.floor(Math.random() * maxY),
      };
    } while (this.snake.some(s => s.x === this.food.x && s.y === this.food.y));
  }
  
  draw(): void {
    // Clear
    this.ctx.fillStyle = '#1e1e1e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw snake
    this.ctx.fillStyle = '#4ade80'; // Green
    this.snake.forEach((segment, i) => {
      const brightness = 1 - (i / this.snake.length) * 0.5;
      this.ctx.fillStyle = `rgba(74, 222, 128, ${brightness})`;
      this.ctx.fillRect(
        segment.x * this.gridSize + 1,
        segment.y * this.gridSize + 1,
        this.gridSize - 2,
        this.gridSize - 2
      );
    });
    
    // Draw food
    this.ctx.fillStyle = '#ef4444'; // Red
    this.ctx.beginPath();
    this.ctx.arc(
      this.food.x * this.gridSize + this.gridSize / 2,
      this.food.y * this.gridSize + this.gridSize / 2,
      this.gridSize / 2 - 2,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
  }
  
  bindControls(): void {
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          if (this.direction !== 'down') this.direction = 'up';
          break;
        case 'ArrowDown':
        case 's':
          if (this.direction !== 'up') this.direction = 'down';
          break;
        case 'ArrowLeft':
        case 'a':
          if (this.direction !== 'right') this.direction = 'left';
          break;
        case 'ArrowRight':
        case 'd':
          if (this.direction !== 'left') this.direction = 'right';
          break;
      }
    });
  }
  
  gameOver(): void {
    this.pause();
    this.onGameOver?.(this.score);
  }
  
  // Callbacks
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}
```

### 4.2 2048 (Core Logic)

```typescript
// src/webview/scripts/games/2048.ts

class Game2048 {
  private grid: number[][];
  private size = 4;
  private score = 0;
  
  constructor(private canvas: HTMLCanvasElement) {
    this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
    this.init();
  }
  
  init(): void {
    this.addRandomTile();
    this.addRandomTile();
    this.bindControls();
    this.draw();
  }
  
  addRandomTile(): void {
    const empty: { x: number; y: number }[] = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.grid[y][x] === 0) empty.push({ x, y });
      }
    }
    if (empty.length === 0) return;
    
    const { x, y } = empty[Math.floor(Math.random() * empty.length)];
    this.grid[y][x] = Math.random() < 0.9 ? 2 : 4;
  }
  
  move(direction: 'up' | 'down' | 'left' | 'right'): boolean {
    // Implement sliding and merging logic
    // Returns true if any tiles moved
    let moved = false;
    // ... (full implementation in actual code)
    return moved;
  }
  
  draw(): void {
    const ctx = this.canvas.getContext('2d')!;
    const tileSize = this.canvas.width / this.size;
    
    const colors: Record<number, string> = {
      0: '#cdc1b4', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179',
      16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72',
      256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e',
    };
    
    ctx.fillStyle = '#bbada0';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const value = this.grid[y][x];
        ctx.fillStyle = colors[value] || '#3c3a32';
        ctx.fillRect(x * tileSize + 4, y * tileSize + 4, tileSize - 8, tileSize - 8);
        
        if (value > 0) {
          ctx.fillStyle = value <= 4 ? '#776e65' : '#f9f6f2';
          ctx.font = `bold ${tileSize / 3}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(value), x * tileSize + tileSize / 2, y * tileSize + tileSize / 2);
        }
      }
    }
  }
  
  bindControls(): void {
    document.addEventListener('keydown', (e) => {
      let moved = false;
      switch (e.key) {
        case 'ArrowUp': moved = this.move('up'); break;
        case 'ArrowDown': moved = this.move('down'); break;
        case 'ArrowLeft': moved = this.move('left'); break;
        case 'ArrowRight': moved = this.move('right'); break;
      }
      if (moved) {
        this.addRandomTile();
        this.draw();
        this.checkGameState();
      }
    });
  }
  
  checkGameState(): void {
    // Check for 2048 win or game over
  }
  
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number, won: boolean) => void;
}
```

### 4.3 Flappy Bird (Core Logic)

```typescript
// src/webview/scripts/games/flappy.ts

class FlappyBird {
  private bird = { x: 50, y: 200, velocity: 0 };
  private pipes: { x: number; gapY: number }[] = [];
  private score = 0;
  private gravity = 0.5;
  private jumpStrength = -8;
  private pipeGap = 150;
  private pipeWidth = 50;
  private gameRunning = false;
  
  constructor(private canvas: HTMLCanvasElement) {
    this.canvas.width = 400;
    this.canvas.height = 600;
    this.bindControls();
  }
  
  start(): void {
    this.bird = { x: 50, y: 200, velocity: 0 };
    this.pipes = [];
    this.score = 0;
    this.gameRunning = true;
    this.gameLoop();
  }
  
  gameLoop(): void {
    if (!this.gameRunning) return;
    this.update();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }
  
  update(): void {
    this.bird.velocity += this.gravity;
    this.bird.y += this.bird.velocity;
    
    // Spawn pipes
    if (this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < 250) {
      this.pipes.push({ x: 450, gapY: Math.random() * 300 + 100 });
    }
    
    // Move pipes
    this.pipes.forEach(pipe => pipe.x -= 3);
    this.pipes = this.pipes.filter(pipe => pipe.x > -this.pipeWidth);
    
    if (this.checkCollision()) this.gameOver();
    
    // Score
    this.pipes.forEach(pipe => {
      if (pipe.x + this.pipeWidth === this.bird.x) {
        this.score++;
        this.onScoreUpdate?.(this.score);
      }
    });
  }
  
  checkCollision(): boolean {
    if (this.bird.y < 0 || this.bird.y > this.canvas.height - 30) return true;
    
    for (const pipe of this.pipes) {
      if (this.bird.x + 30 > pipe.x && this.bird.x < pipe.x + this.pipeWidth) {
        if (this.bird.y < pipe.gapY - this.pipeGap / 2 ||
            this.bird.y + 30 > pipe.gapY + this.pipeGap / 2) {
          return true;
        }
      }
    }
    return false;
  }
  
  draw(): void {
    const ctx = this.canvas.getContext('2d')!;
    
    ctx.fillStyle = '#70c5ce';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    ctx.fillStyle = '#73bf2e';
    this.pipes.forEach(pipe => {
      ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.gapY - this.pipeGap / 2);
      ctx.fillRect(pipe.x, pipe.gapY + this.pipeGap / 2, this.pipeWidth, this.canvas.height);
    });
    
    ctx.fillStyle = '#f7dc6f';
    ctx.beginPath();
    ctx.arc(this.bird.x + 15, this.bird.y + 15, 15, 0, Math.PI * 2);
    ctx.fill();
  }
  
  jump(): void {
    if (this.gameRunning) this.bird.velocity = this.jumpStrength;
  }
  
  bindControls(): void {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); this.jump(); }
    });
    this.canvas.addEventListener('click', () => this.jump());
  }
  
  gameOver(): void {
    this.gameRunning = false;
    this.onGameOver?.(this.score);
  }
  
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
}
```

---

## 5. Build & Distribution

### 5.1 Build Scripts (package.json)

```json
{
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "npm run compile:extension && npm run compile:webview",
    "compile:extension": "esbuild ./src/extension.ts --bundle --outfile=dist/extension.js --external:vscode --format=cjs --platform=node",
    "compile:webview": "webpack --mode production",
    "watch": "concurrently \"npm run watch:extension\" \"npm run watch:webview\"",
    "watch:extension": "esbuild ./src/extension.ts --bundle --outfile=dist/extension.js --external:vscode --format=cjs --platform=node --watch",
    "watch:webview": "webpack --mode development --watch",
    "package": "vsce package",
    "publish": "vsce publish",
    "test": "node ./out/test/runTest.js"
  }
}
```

### 5.2 GitHub Actions CI/CD

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Compile
        run: npm run compile
        
      - name: Package Extension
        run: npx vsce package
        
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: '*.vsix'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Publish to VS Marketplace
        run: npx vsce publish
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
```

---

## 6. README.md (Marketing Copy)

```markdown
# 🌿 Touch Grass IDE

> The open-source brainrot IDE that YC should have funded.

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/pigeon.touch-grass-ide)](https://marketplace.visualstudio.com/items?itemName=pigeon.touch-grass-ide)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/pigeon.touch-grass-ide)](https://marketplace.visualstudio.com/items?itemName=pigeon.touch-grass-ide)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

YC funded an IDE that lets you gamble while you code. I made it open source in a weekend. **It's better.**

## What is this?

Touch Grass IDE detects when your AI coding tools (Claude Code, Cursor, Copilot) are generating code, then surfaces entertainment options to fill the wait time. When generation completes, it auto-minimizes so you can get back to work.

**Features:**
- 🎮 Built-in minigames (Snake, 2048, Tetris, Flappy Bird)
- 📱 Social media embeds (TikTok, YouTube Shorts, Twitter)
- ⚙️ Custom brainrot sources (add your own sites)
- 🏆 Achievement system (20+ achievements including secret "cursed" ones)
- 📊 Stats dashboard (productivity vs. degeneracy tracking)
- 🍅 Pomodoro mode (blocks brainrot during work sessions)
- 🔓 **Open source** (no waitlist, no invite codes, no BS)

## Why?

AI coding tools create awkward 1-5 minute wait times. You're going to check your phone anyway. Touch Grass keeps you in the editor so you're ready when generation completes.

Or maybe this is all a terrible idea and you should actually touch grass. We added an achievement for that too.

## Installation

1. Open VS Code
2. Go to Extensions (Cmd/Ctrl+Shift+X)
3. Search "Touch Grass IDE"
4. Click Install
5. Question your life choices

## Usage

The extension auto-activates when it detects AI generation. You can also:

- `Cmd/Ctrl+Shift+P` → "Touch Grass: Open Brainrot Panel"
- `Cmd/Ctrl+Shift+P` → "Touch Grass: View Stats"
- `Cmd/Ctrl+Shift+P` → "Touch Grass: Start Pomodoro"

## Configuration

```json
{
  "touchgrass.autoDetect": true,
  "touchgrass.brainrotIntensity": "casual",
  "touchgrass.customSources": [
    { "name": "Reddit", "url": "https://reddit.com", "icon": "🔴" }
  ]
}
```

## Achievements

20+ achievements across 5 rarity tiers. Some highlights:

| Achievement | Description | Rarity |
|-------------|-------------|--------|
| 👶 Baby's First Brainrot | Opened the panel for the first time | Common |
| 🧠 Terminal Brainrot | 10 hours total brainrot time | Legendary |
| 🌱 Touched Grass Today | Used AI tools all day without brainrot | Legendary |
| 💸 Why Didn't YC Fund This? | More brainrot than coding in a day | Cursed |

## Contributing

PRs welcome. Add a minigame. Add an achievement. Make it worse (better?).

## Credits

Built in a weekend by an 18-year-old who once scaled a platform to 900K users before AI tools existed.

Inspired by (but legally distinct from) Chad IDE.

## License

MIT — do whatever you want with it.

---

*This is satire. Please actually touch grass sometimes.*
```

---

## 7. Development Timeline

### Phase 1: Core Infrastructure (Day 1)
- [ ] Set up VSCode extension boilerplate
- [ ] Implement ActivityDetector with terminal watching
- [ ] Create basic BrainrotPanel webview
- [ ] Add status bar integration

### Phase 2: Games (Day 1-2)
- [ ] Implement Snake
- [ ] Implement 2048
- [ ] Implement Flappy Bird
- [ ] Add Tetris (optional)
- [ ] Game selection UI

### Phase 3: Social & Custom (Day 2)
- [ ] Social media embed tabs
- [ ] Custom source management
- [ ] Settings panel

### Phase 4: Stats & Achievements (Day 2-3)
- [ ] SessionTracker implementation
- [ ] AchievementEngine with all achievements
- [ ] Stats dashboard UI
- [ ] Achievement notifications

### Phase 5: Polish & Ship (Day 3)
- [ ] Pomodoro mode
- [ ] Degeneracy meter animations
- [ ] Sound effects (optional)
- [ ] README & marketing assets
- [ ] Publish to VS Code Marketplace
- [ ] Create GitHub release
- [ ] Write launch tweet

---

## 8. Launch Checklist

- [ ] Extension published to VS Code Marketplace
- [ ] GitHub repo public with MIT license
- [ ] README has compelling copy and badges
- [ ] Demo video/GIF created
- [ ] Twitter profile updated
- [ ] Launch tweet drafted
- [ ] Screenshots for Marketplace listing
- [ ] Keywords optimized ("brainrot", "ai coding", "productivity", "games")

---

*Spec version: 1.0*  
*Last updated: December 2025*  
*Author: Claude (for Pigeon)*
