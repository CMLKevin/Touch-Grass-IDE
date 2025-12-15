/**
 * Webview CSS Styles
 * Extracted from BrainrotPanel for maintainability
 */

export function getStyles(): string {
  return `
/* ===== CSS CUSTOM PROPERTIES ===== */
:root {
  /* White System (Primary/Background) - Light Theme */
  --white-pure: #f5f4e7;
  --white-soft: #ecebd9;
  --white-warm: #f8f6e8;
  --gray-50: #e8e7d6;
  --gray-100: #dedcc8;
  --gray-200: #d4d2be;
  --gray-300: #b8b6a0;
  --gray-400: #8c8a78;
  --gray-500: #6b6959;
  --gray-600: #4a4940;
  --gray-900: #1a1914;

  /* Orange System (Secondary/Accent) */
  --orange-50: #fff7ed;
  --orange-100: #ffedd5;
  --orange-200: #fed7aa;
  --orange-primary: #F97316;
  --orange-hover: #EA580C;
  --orange-glow: rgba(249, 115, 22, 0.15);

  /* Semantic Colors */
  --success: #22C55E;
  --success-soft: #d9f5e4;
  --danger: #EF4444;
  --danger-soft: #fde2e2;
  --gold: #EAB308;

  /* Text Colors */
  --text-primary: #1a1914;
  --text-secondary: #4a4940;
  --text-muted: #8c8a78;

  /* Borders */
  --border-light: 1px solid rgba(0, 0, 0, 0.06);
  --border-medium: 1px solid rgba(0, 0, 0, 0.1);

  /* Shadows (Minimal) */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-focus: 0 0 0 3px rgba(249, 115, 22, 0.15);

  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-full: 9999px;

  /* Timing Functions */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.45, 0, 0.55, 1);

  /* Game Canvas Colors (for JS access) */
  --canvas-bg: #ecebd9;
  --canvas-grid: #d4d2be;
}

/* ===== DARK THEME ===== */
body.dark {
  --white-pure: #1a1a1a;
  --white-soft: #242424;
  --white-warm: #1f1f1f;
  --gray-50: #2a2a2a;
  --gray-100: #333333;
  --gray-200: #404040;
  --gray-300: #525252;
  --gray-400: #737373;
  --gray-500: #a3a3a3;
  --gray-600: #d4d4d4;
  --gray-900: #fafafa;

  --orange-50: #2a1f14;
  --orange-100: #3d2a14;
  --orange-200: #4d3214;

  --success-soft: #1a3324;
  --danger-soft: #3d1a1a;

  --text-primary: #fafafa;
  --text-secondary: #d4d4d4;
  --text-muted: #737373;

  --border-light: 1px solid rgba(255, 255, 255, 0.08);
  --border-medium: 1px solid rgba(255, 255, 255, 0.12);

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.4);

  --canvas-bg: #242424;
  --canvas-grid: #333333;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--white-pure);
  color: var(--text-secondary);
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ===== CARD BASE ===== */
.card {
  background: var(--white-pure);
  border: var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

/* ===== HEADER ===== */
.header {
  position: relative;
  text-align: center;
  padding: 14px 16px;
  background: var(--white-pure);
  border-bottom: var(--border-light);
}
.header h1 {
  font-size: 18px;
  font-weight: 600;
  color: var(--gray-900);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: -0.3px;
}

/* Theme Toggle Button */
.theme-toggle {
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--gray-50);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s var(--ease-out);
}
.theme-toggle:hover {
  background: var(--gray-100);
  color: var(--gray-900);
}
.theme-toggle:active {
  transform: translateY(-50%) scale(0.95);
}
.theme-toggle .icon-sun,
.theme-toggle .icon-moon {
  display: none;
}
body:not(.dark) .theme-toggle .icon-moon { display: block; }
body.dark .theme-toggle .icon-sun { display: block; }
.header h1 .grass-icon {
  display: inline-block;
}
.status {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.status-dot {
  width: 6px;
  height: 6px;
  background: var(--orange-primary);
  border-radius: 50%;
}

/* ===== TAB NAVIGATION ===== */
.tab-nav {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: var(--white-pure);
  border-bottom: var(--border-light);
}
.tab-btn {
  flex: 1;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s var(--ease-out);
}
.tab-btn:hover {
  background: var(--gray-50);
  color: var(--gray-900);
}
.tab-btn.active {
  color: var(--white-pure);
  background: var(--orange-primary);
}
.tab-btn:active {
  transform: scale(0.98);
}

.tab-panel {
  display: none;
  padding: 16px;
  opacity: 0;
  transition: opacity 0.15s var(--ease-out);
}
.tab-panel.active {
  display: block;
  opacity: 1;
}

/* ===== GAMES TAB ===== */
.game-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.game-card {
  background: var(--white-pure);
  border: var(--border-light);
  border-radius: var(--radius-lg);
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
}
.game-card:hover {
  transform: translateY(-4px);
  border-color: var(--orange-primary);
  box-shadow: var(--shadow-md);
}
.game-card:active {
  transform: translateY(-2px);
}
.game-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 10px;
}
.game-name {
  font-weight: 600;
  display: block;
  font-size: 15px;
  color: var(--gray-900);
  margin-bottom: 4px;
}
.game-highscore {
  font-size: 11px;
  color: var(--text-muted);
}
.game-container {
  display: none;
  text-align: center;
}
.game-container.active {
  display: block;
}
#game-canvas {
  background: var(--gray-50);
  border-radius: var(--radius-md);
  max-width: 100%;
  box-shadow: var(--shadow-sm);
}
.game-ui {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--gray-50);
  border-radius: var(--radius-md);
}
.game-score {
  font-size: 16px;
  font-weight: 600;
  color: var(--orange-primary);
}

/* ===== SETTINGS TAB ===== */
.settings-container { padding: 8px 0; }
.settings-section {
  background: var(--white-pure);
  border: var(--border-light);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 12px;
}
.settings-section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--orange-primary);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: var(--border-light);
  transition: background 0.15s var(--ease-out);
}
.setting-row:last-child { border-bottom: none; }
.setting-row:hover {
  background: var(--gray-50);
  margin: 0 -12px;
  padding-left: 12px;
  padding-right: 12px;
  border-radius: var(--radius-sm);
}
.setting-info { flex: 1; }
.setting-label { font-size: 14px; color: var(--gray-900); font-weight: 500; }
.setting-desc { font-size: 11px; color: var(--text-muted); margin-top: 3px; }
.setting-control { margin-left: 16px; }

/* Toggle switch */
.toggle {
  position: relative;
  width: 44px;
  height: 24px;
  background: var(--gray-200);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
  border: none;
}
.toggle:hover {
  background: var(--gray-300);
}
.toggle.active {
  background: var(--orange-primary);
}
.toggle::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  background: var(--white-pure);
  border-radius: 50%;
  top: 3px;
  left: 3px;
  transition: transform 0.2s var(--ease-out);
  box-shadow: var(--shadow-sm);
}
.toggle.active::after {
  transform: translateX(20px);
}

/* Select dropdown */
.setting-select {
  background: var(--white-pure);
  border: var(--border-medium);
  color: var(--gray-900);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
}
.setting-select:hover {
  border-color: var(--gray-300);
}
.setting-select:focus {
  outline: none;
  border-color: var(--orange-primary);
  box-shadow: var(--shadow-focus);
}

/* Slider */
.setting-slider {
  width: 100px;
  height: 4px;
  -webkit-appearance: none;
  background: var(--gray-200);
  border-radius: var(--radius-full);
  cursor: pointer;
}
.setting-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: var(--orange-primary);
  border: 2px solid var(--white-pure);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s var(--ease-out);
}
.setting-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}
.slider-value {
  font-size: 12px;
  color: var(--orange-primary);
  min-width: 35px;
  text-align: right;
  margin-left: 8px;
  font-weight: 600;
}
.slider-group { display: flex; align-items: center; }

/* Danger button */
.btn-danger {
  background: var(--white-pure);
  color: var(--danger);
  border: 1px solid var(--danger);
  transition: all 0.15s var(--ease-out);
}
.btn-danger:hover {
  background: var(--danger);
  color: var(--white-pure);
}
.settings-footer {
  text-align: center;
  padding: 20px 16px;
  color: var(--text-muted);
  font-size: 11px;
  border-top: var(--border-light);
  margin-top: 8px;
}
.settings-footer a {
  color: var(--orange-primary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s var(--ease-out);
}
.settings-footer a:hover {
  color: var(--orange-hover);
  text-decoration: underline;
}

/* ===== POMODORO TAB ===== */
.pomodoro-container {
  text-align: center;
  padding: 20px;
}
.pomodoro-timer-ring {
  width: 200px;
  height: 200px;
  margin: 0 auto 24px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--gray-50);
  border-radius: 50%;
  border: 3px solid var(--gray-100);
  box-shadow: var(--shadow-sm);
}
.pomodoro-timer-ring.active {
  border-color: var(--orange-primary);
}
.pomodoro-mode {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 4px;
  font-weight: 600;
}
.pomodoro-mode.work { color: var(--orange-primary); }
.pomodoro-mode.break { color: var(--success); }
.pomodoro-timer {
  font-size: 48px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'SF Mono', Monaco, monospace;
  color: var(--gray-900);
  letter-spacing: -2px;
}
.pomodoro-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin: 24px 0;
}
.pomodoro-stats {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 24px 0;
  padding: 16px;
  background: var(--gray-50);
  border-radius: var(--radius-lg);
}
.pomo-stat {
  text-align: center;
  padding: 12px 20px;
  background: var(--white-pure);
  border-radius: var(--radius-md);
  border: var(--border-light);
}
.pomo-stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--orange-primary);
}
.pomo-stat-label {
  display: block;
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.pomodoro-info {
  color: var(--text-muted);
  font-size: 12px;
  margin-top: 20px;
  padding: 12px 16px;
  background: var(--orange-50);
  border: 1px solid var(--orange-100);
  border-radius: var(--radius-md);
}
.pomodoro-info p { margin: 4px 0; }

/* ===== BUTTONS ===== */
.btn {
  background: var(--orange-primary);
  color: var(--white-pure);
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.15s var(--ease-out);
}
.btn:hover {
  background: var(--orange-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
.btn:active {
  transform: translateY(0);
}
.btn-secondary {
  background: var(--white-pure);
  color: var(--text-secondary);
  border: var(--border-medium);
}
.btn-secondary:hover {
  background: var(--gray-50);
  border-color: var(--gray-300);
  color: var(--gray-900);
}

/* Casino */
.casino-header {
  text-align: center;
  padding: 16px;
  background: var(--white-pure);
  border: var(--border-light);
  border-radius: var(--radius-lg);
  margin-bottom: 16px;
}
.balance-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 28px;
  font-weight: 700;
}
.balance-icon {
  font-size: 28px;
}
.balance-amount {
  color: var(--success);
  font-family: 'JetBrains Mono', 'Courier New', monospace;
}
.balance-label {
  color: var(--success);
  font-size: 12px;
  font-weight: 600;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  letter-spacing: 1px;
}
.casino-card {
  background: var(--white-pure);
  border: var(--border-light);
  border-radius: var(--radius-lg);
  transition: all 0.2s var(--ease-out);
}
.casino-card:hover {
  border-color: var(--gold);
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}
.casino-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin: 16px 0;
}
.casino-ui {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--gray-50);
  border-radius: var(--radius-md);
}
.bet-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bet-controls input {
  width: 90px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: var(--border-medium);
  background: var(--white-pure);
  color: var(--gray-900);
  text-align: center;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.15s var(--ease-out);
}
.bet-controls input:focus {
  outline: none;
  border-color: var(--gold);
  box-shadow: var(--shadow-focus);
}
.casino-info {
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
  margin-top: 16px;
  padding: 16px;
  background: var(--gray-50);
  border-radius: var(--radius-md);
}
.casino-info p { margin: 6px 0; }
.btn-bet {
  background: var(--gold);
  color: var(--gray-900);
  font-weight: 700;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  border: none;
  transition: all 0.15s var(--ease-out);
}
.btn-bet:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.btn-bet:active {
  transform: translateY(0);
}
.btn-bet:disabled {
  background: var(--gray-200);
  color: var(--gray-400);
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}
.casino-result {
  text-align: center;
  padding: 24px;
  font-size: 28px;
  font-weight: 700;
  border-radius: var(--radius-lg);
  background: var(--gray-50);
  margin-top: 16px;
}
.casino-result.win {
  color: var(--success);
}
.casino-result.lose {
  color: var(--danger);
}

/* Game Over */
.game-over-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.game-over-overlay.active {
  display: flex;
}
.game-over-content {
  background: var(--white-pure);
  border: var(--border-light);
  padding: 32px;
  border-radius: var(--radius-lg);
  text-align: center;
  box-shadow: var(--shadow-lg);
  max-width: 320px;
  width: 90%;
}
.game-over-content h2 {
  font-size: 24px;
  margin-bottom: 8px;
  color: var(--gray-900);
}
.final-score {
  font-size: 48px;
  font-weight: 700;
  color: var(--orange-primary);
  margin: 20px 0;
}
.final-score.new-record {
  color: var(--gold);
}
.game-over-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}
.game-over-buttons .btn {
  padding: 12px 24px;
  font-size: 14px;
}

/* ===== ANIMATIONS ===== */
/* Essential Keyframes - Minimized */
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes scorePop { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }

/* Win/Lose Effects */
.win-effect { color: var(--success); }
.lose-effect { color: var(--danger); }
.score-pop { animation: scorePop 0.2s var(--ease-out); }

/* Balance animations */
.balance-amount { transition: color 0.2s var(--ease-out); }
.balance-amount.increase { color: var(--success); }
.balance-amount.decrease { color: var(--danger); }

/* High score highlight */
.new-high-score { color: var(--gold) !important; }

/* Loading spinner */
.loading { animation: spin 1s linear infinite; }

/* ===== READING TAB ===== */
.reading-container {
  padding: 0;
}
.reading-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--white-pure);
  border-bottom: var(--border-light);
  position: sticky;
  top: 0;
  z-index: 10;
}
.reading-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-900);
  display: flex;
  align-items: center;
  gap: 8px;
}
.reading-source-tabs {
  display: flex;
  gap: 4px;
}
.source-btn {
  padding: 6px 12px;
  background: transparent;
  border: var(--border-light);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
}
.source-btn:hover {
  background: var(--gray-50);
  color: var(--gray-900);
}
.source-btn.active {
  background: var(--orange-primary);
  color: var(--white-pure);
  border-color: var(--orange-primary);
}
.article-list {
  padding: 8px;
  max-height: calc(100vh - 220px);
  overflow-y: auto;
}
.article-item {
  background: var(--white-pure);
  border: var(--border-light);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
  position: relative;
}
.article-item:hover {
  transform: translateX(2px);
  border-color: var(--orange-200);
  background: var(--orange-50);
}
.article-score {
  position: absolute;
  left: 14px;
  top: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--orange-primary);
  font-size: 11px;
  font-weight: 700;
  min-width: 32px;
}
.article-score .arrow {
  font-size: 10px;
  margin-bottom: 2px;
}
.article-content {
  margin-left: 40px;
}
.article-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-900);
  line-height: 1.4;
  margin-bottom: 6px;
}
.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 10px;
  color: var(--text-muted);
}
.article-meta span {
  display: flex;
  align-items: center;
  gap: 3px;
}
.article-domain {
  color: var(--text-secondary);
}
.reading-loading {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}
.reading-loading .spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--gray-200);
  border-top-color: var(--orange-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px;
}
.reading-error {
  text-align: center;
  padding: 40px 20px;
  color: var(--danger);
}
.reading-error .retry-btn {
  margin-top: 12px;
}
.reading-load-more {
  width: 100%;
  padding: 12px;
  margin-top: 4px;
  background: var(--white-pure);
  border: 1px dashed var(--gray-200);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s var(--ease-out);
}
.reading-load-more:hover {
  background: var(--orange-50);
  color: var(--orange-primary);
  border-style: solid;
  border-color: var(--orange-primary);
}
.article-item.no-score .article-content {
  margin-left: 0;
}
.article-item.no-score .article-score {
  display: none;
}

/* ===== ARTICLE DETAIL VIEW ===== */
.article-detail {
  display: none;
  flex-direction: column;
  height: 100%;
}
.article-detail.active {
  display: flex;
}
.article-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--white-pure);
  border-bottom: var(--border-light);
  position: sticky;
  top: 0;
  z-index: 10;
}
.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: var(--border-light);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
}
.back-btn:hover {
  background: var(--gray-50);
  color: var(--gray-900);
}
.open-external-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: transparent;
  border: var(--border-light);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
}
.open-external-btn:hover {
  border-color: var(--orange-primary);
  color: var(--orange-primary);
}
.article-detail-title {
  padding: 16px;
  border-bottom: var(--border-light);
}
.article-detail-title h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-900);
  line-height: 1.4;
  margin: 0 0 8px 0;
}
.article-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  color: var(--text-muted);
}
.article-detail-meta .score {
  color: var(--orange-primary);
  font-weight: 600;
}
.article-detail-meta .author {
  color: var(--text-secondary);
}

/* HN-specific: Article/Discussion tabs */
.hn-view-tabs {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  border-bottom: var(--border-light);
}
.hn-view-btn {
  flex: 1;
  padding: 10px 16px;
  background: transparent;
  border: var(--border-light);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s var(--ease-out);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.hn-view-btn:hover {
  background: var(--gray-50);
  color: var(--gray-900);
}
.hn-view-btn.active {
  background: var(--orange-primary);
  color: var(--white-pure);
  border-color: var(--orange-primary);
}
.hn-view-btn .count {
  background: rgba(255,255,255,0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
}

/* Article content area */
.article-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
.article-body.iframe-container {
  padding: 0;
}
.article-body iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}
.article-text-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
}
.article-text-content p {
  margin: 0 0 16px 0;
}
.article-text-content h1, .article-text-content h2, .article-text-content h3 {
  color: var(--gray-900);
  margin: 24px 0 12px 0;
}
.article-text-content h1 { font-size: 20px; }
.article-text-content h2 { font-size: 17px; }
.article-text-content h3 { font-size: 15px; }
.article-text-content a {
  color: var(--orange-primary);
  text-decoration: none;
}
.article-text-content a:hover {
  text-decoration: underline;
}
.article-text-content blockquote {
  border-left: 3px solid var(--orange-primary);
  margin: 16px 0;
  padding: 8px 16px;
  background: var(--gray-50);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--text-muted);
  font-style: italic;
}
.article-text-content ul, .article-text-content ol {
  margin: 12px 0;
  padding-left: 24px;
}
.article-text-content li {
  margin: 6px 0;
}
.article-text-content pre, .article-text-content code {
  background: var(--gray-50);
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
}
.article-text-content pre {
  padding: 12px;
  overflow-x: auto;
  margin: 12px 0;
}
.article-text-content code {
  padding: 2px 6px;
  font-size: 13px;
}
.article-text-content img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-md);
  margin: 12px 0;
}

/* HN Post text (Ask HN, Show HN, etc.) */
.hn-post-text {
  background: var(--gray-50);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 16px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}
.hn-post-text a {
  color: var(--orange-primary);
}

/* Comment thread styles */
.comment-thread {
  padding: 0;
}
.comment {
  padding: 14px 0;
  border-bottom: var(--border-light);
}
.comment:last-child {
  border-bottom: none;
}
.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.comment-author {
  color: var(--orange-primary);
  font-weight: 600;
  font-size: 12px;
}
.comment-time {
  color: var(--text-muted);
  font-size: 11px;
}
.comment-score {
  color: var(--text-muted);
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 2px;
}
.comment-body {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}
.comment-body p {
  margin: 0 0 8px 0;
}
.comment-body p:last-child {
  margin-bottom: 0;
}
.comment-body a {
  color: var(--orange-primary);
  word-break: break-all;
}
.comment-body code {
  background: var(--gray-50);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}
.comment-body pre {
  background: var(--gray-50);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  overflow-x: auto;
  margin: 8px 0;
}

/* Nested replies */
.comment-replies {
  margin-left: 16px;
  padding-left: 14px;
  border-left: 2px solid var(--gray-100);
}
.comment-replies .comment {
  padding: 10px 0;
}
.comment-replies .comment-replies {
  border-left-color: var(--orange-100);
}
.comment-replies .comment-replies .comment-replies {
  border-left-color: var(--orange-50);
}

/* More comments indicator */
.more-replies {
  padding: 8px 12px;
  color: var(--text-muted);
  font-size: 11px;
  font-style: italic;
}

/* Empty state */
.no-comments {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

/* Reader view loading state */
.reader-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-muted);
}
.reader-loading .spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--gray-200);
  border-top-color: var(--orange-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

/* Article open in browser prompt */
.open-in-browser {
  text-align: center;
  padding: 40px 20px;
}
.open-in-browser p {
  color: var(--text-muted);
  margin-bottom: 16px;
  font-size: 13px;
}
.open-in-browser .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
`;
}
