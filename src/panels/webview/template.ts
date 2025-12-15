/**
 * Webview HTML Template
 * Extracted from BrainrotPanel for maintainability
 */

import { getStyles } from './styles';
import { getMainScript } from './main';

export interface WebviewConfig {
  intensity: string;
  autoDetect: boolean;
  autoMinimize: boolean;
  idleTimeout: number;
  casinoEnabled: boolean;
  earningRate: number;
  enableAchievements: boolean;
  cspSource: string;
  nonce: string;
}

export function getHtmlTemplate(config: WebviewConfig): string {
  const {
    intensity,
    autoDetect,
    autoMinimize,
    idleTimeout,
    casinoEnabled,
    earningRate,
    enableAchievements,
    cspSource,
    nonce,
  } = config;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} https: data:; frame-src https:;">
  <title>Touch Grass IDE</title>
  <style>${getStyles()}</style>
</head>
<body class="intensity-${intensity}">
  <div class="header">
    <h1>🌿 Touch Grass IDE</h1>
    <div class="status">AI is cooking...</div>
    <button class="theme-toggle" id="theme-toggle" title="Toggle theme">
      <span class="icon-sun">☀️</span>
      <span class="icon-moon">🌙</span>
    </button>
  </div>

  <nav class="tab-nav">
    <button class="tab-btn active" data-tab="pomodoro">🍅 Pomodoro</button>
    <button class="tab-btn" data-tab="reading">📰 Reading</button>
    <button class="tab-btn" data-tab="games">🎮 Games</button>
    <button class="tab-btn" data-tab="settings">⚙️ Settings</button>
  </nav>

  <!-- Games Tab -->
  <section id="games-tab" class="tab-panel">
    <div class="casino-header">
      <div class="balance-display">
        <span class="balance-icon">🌿</span>
        <span class="balance-amount" id="casino-balance">0</span>
        <span class="balance-label">$GRASS</span>
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
        <span class="game-highscore">Let it cook</span>
      </div>
      <div class="game-card casino-card" data-game="slots">
        <span class="game-icon">🎰</span>
        <span class="game-name">Slots</span>
        <span class="game-highscore">Feeling lucky?</span>
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
          <span>$GRASS</span>
        </div>
        <button class="btn btn-secondary" id="back-btn">← Back</button>
      </div>
    </div>
    <div class="casino-info">
      <p>🌿 Stack <strong>$GRASS</strong> during Pomodoro work sessions</p>
      <p>🍅 WAGMI - start a timer to begin your sigma grind</p>
    </div>
  </section>

  <!-- Pomodoro Tab -->
  <section id="pomodoro-tab" class="tab-panel active">
    <div class="pomodoro-container">
      <div class="pomodoro-mode" id="pomodoro-mode">Grind Mode</div>
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
          <span class="pomo-stat-label">Grind Time</span>
        </div>
        <div class="pomo-stat">
          <span class="pomo-stat-value" id="pomo-break-time">0m</span>
          <span class="pomo-stat-label">Grass Time</span>
        </div>
      </div>
      <div class="pomodoro-info">
        <p>🍅 <strong>Pomodoro Technique</strong></p>
        <p>25 min work → 5 min break</p>
        <p>Every 4 sessions: 15 min long break</p>
      </div>
    </div>
  </section>

  <!-- Reading Tab -->
  <section id="reading-tab" class="tab-panel">
    <!-- List View -->
    <div id="reading-list-view" class="reading-container">
      <div class="reading-header">
        <div class="reading-title">
          <span>📰</span>
          <span id="reading-source-title">Hacker News</span>
        </div>
        <div class="reading-source-tabs">
          <button class="source-btn active" data-source="hn">HN</button>
          <button class="source-btn" data-source="lw">LW</button>
          <button class="source-btn" data-source="acx">ACX</button>
        </div>
      </div>
      <div id="reading-content" class="article-list">
        <div class="reading-loading">
          <div class="spinner"></div>
          <p>Select a source to load articles</p>
        </div>
      </div>
    </div>

    <!-- Detail View (hidden by default) -->
    <div id="reading-detail-view" class="article-detail">
      <div class="article-detail-header">
        <button class="back-btn" id="reading-back-btn">
          <span>←</span>
          <span>Back</span>
        </button>
        <button class="open-external-btn" id="reading-open-external">
          <span>↗</span>
          <span>Open</span>
        </button>
      </div>
      <div class="article-detail-title">
        <h2 id="detail-title">Article Title</h2>
        <div class="article-detail-meta" id="detail-meta">
          <!-- Dynamic meta info -->
        </div>
      </div>
      <!-- HN-only: Article/Discussion tabs -->
      <div class="hn-view-tabs" id="hn-view-tabs" style="display: none;">
        <button class="hn-view-btn active" data-view="article">
          <span>📄</span>
          <span>Article</span>
        </button>
        <button class="hn-view-btn" data-view="discussion">
          <span>💬</span>
          <span>Discussion</span>
          <span class="count" id="hn-comment-count">0</span>
        </button>
      </div>
      <div class="article-body" id="detail-body">
        <!-- Dynamic content -->
      </div>
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
            <div class="setting-label">Mining rate</div>
            <div class="setting-desc">$GRASS mined per second during Pomodoro</div>
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
            <div class="setting-desc">How cooked are you?</div>
          </div>
          <div class="setting-control">
            <select class="setting-select" id="setting-intensity">
              <option value="touching-grass" ${intensity === 'touching-grass' ? 'selected' : ''}>Touching Grass</option>
              <option value="casual" ${intensity === 'casual' ? 'selected' : ''}>Lowkey Cooked</option>
              <option value="degenerate" ${intensity === 'degenerate' ? 'selected' : ''}>Fully Cooked</option>
              <option value="terminal" ${intensity === 'terminal' ? 'selected' : ''}>Ohio Level</option>
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
      <h2>Skill Issue</h2>
      <div class="final-score" id="final-score">0</div>
      <div class="game-over-buttons">
        <button class="btn" id="play-again-btn">Run It Back</button>
        <button class="btn btn-secondary" id="back-to-menu-btn">Back to Menu</button>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">${getMainScript()}</script>
</body>
</html>`;
}
