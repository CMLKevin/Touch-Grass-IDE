/**
 * Main Webview Script
 * Combines all game and utility scripts
 */

import { getSoundManagerScript } from './utils/sound';
import { getParticleSystemScript } from './utils/particles';
import { getSnakeGameScript } from './games/snake';
import { getFlappyGameScript } from './games/flappy';
import { getPlinkoGameScript } from './games/plinko';
import { getSlotsGameScript } from './games/slots';
import { getReadingScript } from './reading';

export function getMainScript(): string {
  return `
const vscode = acquireVsCodeApi();
let currentGame = null;
let gameInstance = null;

${getSoundManagerScript()}

${getParticleSystemScript()}

// Elements
const gameSelection = document.getElementById('game-selection');
const gameContainer = document.getElementById('game-container');
const canvas = document.getElementById('game-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
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

pomoToggleBtn?.addEventListener('click', () => {
  vscode.postMessage({ command: pomodoroActive ? 'pomodoroPause' : 'pomodoroStart' });
});
pomoResetBtn?.addEventListener('click', () => {
  vscode.postMessage({ command: 'pomodoroReset' });
});
pomoSkipBtn?.addEventListener('click', () => {
  vscode.postMessage({ command: 'pomodoroSkip' });
});

// Theme toggle
const themeToggleBtn = document.getElementById('theme-toggle');
const THEME_KEY = 'touch-grass-theme';

function setTheme(isDark) {
  if (isDark) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
  // Save preference via vscode state
  vscode.setState({ ...vscode.getState(), theme: isDark ? 'dark' : 'light' });
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark');
  setTheme(!isDark);
}

// Restore theme from saved state
const savedState = vscode.getState();
if (savedState?.theme === 'dark') {
  setTheme(true);
}

themeToggleBtn?.addEventListener('click', toggleTheme);

// Tab switching with smooth transitions
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const currentTab = document.querySelector('.tab-panel.active');
    const nextTab = document.getElementById(btn.dataset.tab + '-tab');

    if (!nextTab || currentTab === nextTab) return;

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

      // Initialize Reading tab on first open
      if (btn.dataset.tab === 'reading' && !readingState.initialized) {
        readingState.initialized = true;
        fetchReadingData('hn');
      }
    }, 150);
  });
});

// Animated balance counter
let displayedBalance = 0;
let balanceAnimationId = null;
function animateBalance(targetBalance) {
  if (balanceAnimationId) cancelAnimationFrame(balanceAnimationId);
  if (!casinoBalanceEl) return;

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
    if (!casinoBalanceEl) return;
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
        if (casinoBalanceEl) {
          casinoBalanceEl.style.color = '#fbbf24';
          casinoBalanceEl.style.textShadow = 'none';
        }
      }, 300);
    }
  }
  balanceAnimationId = requestAnimationFrame(step);
}

// Messages from extension
window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.command === 'highScoresUpdate') {
    const snakeEl = document.getElementById('snake-high');
    const el2048 = document.getElementById('2048-high');
    const flappyEl = document.getElementById('flappy-high');
    const tetrisEl = document.getElementById('tetris-high');
    if (snakeEl) snakeEl.textContent = msg.highScores.snake || 0;
    if (el2048) el2048.textContent = msg.highScores['2048'] || 0;
    if (flappyEl) flappyEl.textContent = msg.highScores.flappy || 0;
    if (tetrisEl) tetrisEl.textContent = msg.highScores.tetris || 0;
  } else if (msg.command === 'pomodoroUpdate') {
    if (pomoTimerEl) pomoTimerEl.textContent = msg.formattedTime;
    pomodoroActive = msg.state.isActive;
    if (pomoToggleBtn) pomoToggleBtn.textContent = msg.state.isActive ? 'Pause' : 'Start';
    const modeText = msg.state.mode === 'work' ? 'Grind Mode' : (msg.state.mode === 'longBreak' ? 'Touch Grass' : 'Quick Break');
    if (pomoModeEl) {
      pomoModeEl.textContent = modeText;
      pomoModeEl.className = 'pomodoro-mode ' + (msg.state.mode === 'work' ? 'work' : 'break');
    }
    if (pomoSessionsEl) pomoSessionsEl.textContent = msg.stats.sessions;
    if (pomoWorkTimeEl) pomoWorkTimeEl.textContent = msg.stats.workTime;
    if (pomoBreakTimeEl) pomoBreakTimeEl.textContent = msg.stats.breakTime;
  } else if (msg.command === 'balanceUpdate') {
    playerBalance = msg.balance;
    animateBalance(msg.balance);
  } else if (msg.command === 'betResult') {
    if (msg.success) {
      playerBalance = msg.balance;
      animateBalance(msg.balance);
    }
  } else if (msg.command === 'hackerNewsData') {
    readingState.loading = false;
    if (msg.page === 0) {
      readingState.hnStories = msg.stories;
    } else {
      readingState.hnStories = [...readingState.hnStories, ...msg.stories];
    }
    readingState.hnHasMore = msg.hasMore;
    if (readingState.currentSource === 'hn') {
      renderHackerNews();
    }
  } else if (msg.command === 'hackerNewsError') {
    readingState.loading = false;
    if (readingState.currentSource === 'hn') {
      renderReadingError(msg.error);
    }
  } else if (msg.command === 'lessWrongData') {
    readingState.lwItems = msg.items;
    readingState.loading = false;
    if (readingState.currentSource === 'lw') {
      renderRssItems(readingState.lwItems, 'lw');
    }
  } else if (msg.command === 'lessWrongError') {
    readingState.loading = false;
    if (readingState.currentSource === 'lw') {
      renderReadingError(msg.error);
    }
  } else if (msg.command === 'acxData') {
    readingState.acxItems = msg.items;
    readingState.loading = false;
    if (readingState.currentSource === 'acx') {
      renderRssItems(readingState.acxItems, 'acx');
    }
  } else if (msg.command === 'acxError') {
    readingState.loading = false;
    if (readingState.currentSource === 'acx') {
      renderReadingError(msg.error);
    }
  } else if (msg.command === 'hnPostData') {
    readingState.detailLoading = false;
    readingState.currentPost = msg.post;
    readingState.currentComments = msg.comments;
    renderHNDetailView();
  } else if (msg.command === 'hnPostError') {
    readingState.detailLoading = false;
    renderDetailError(msg.error);
  } else if (msg.command === 'lwPostData') {
    readingState.detailLoading = false;
    readingState.currentPost = msg.post;
    renderLWDetailView();
  } else if (msg.command === 'lwPostError') {
    readingState.detailLoading = false;
    renderDetailError(msg.error);
  } else if (msg.command === 'acxPostData') {
    readingState.detailLoading = false;
    readingState.currentPost = msg.post;
    renderACXDetailView();
  } else if (msg.command === 'acxPostError') {
    readingState.detailLoading = false;
    renderDetailError(msg.error);
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

backBtn?.addEventListener('click', () => { stopGame(); showMenu(); });
playAgainBtn?.addEventListener('click', () => { if (gameOverOverlay) gameOverOverlay.classList.remove('active'); startGame(currentGame); });
backToMenuBtn?.addEventListener('click', () => { if (gameOverOverlay) gameOverOverlay.classList.remove('active'); showMenu(); });

function showMenu() {
  if (gameSelection) gameSelection.style.display = 'grid';
  if (gameContainer) gameContainer.classList.remove('active');
  if (betControlsEl) betControlsEl.style.display = 'none';
  if (gameControls) gameControls.innerHTML = '';
  currentGame = null;
}

function startGame(game) {
  currentGame = game;
  if (gameSelection) gameSelection.style.display = 'none';
  if (gameContainer) gameContainer.classList.add('active');
  if (currentScoreEl) currentScoreEl.textContent = '0';
  if (gameControls) gameControls.innerHTML = '';
  vscode.postMessage({ command: 'gamePlayed', game: game });

  const isCasinoGame = casinoGames.includes(game);
  if (betControlsEl) betControlsEl.style.display = isCasinoGame ? 'flex' : 'none';

  // Resize canvas based on game
  if (canvas) {
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
  }

  if (!canvas || !ctx) return;

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

function updateScore(score) { if (currentScoreEl) currentScoreEl.textContent = score; }
function gameOver(finalScore) {
  if (finalScoreEl) finalScoreEl.textContent = finalScore;
  if (gameOverOverlay) gameOverOverlay.classList.add('active');
  vscode.postMessage({ command: 'gameScore', game: currentGame, score: finalScore });
  vscode.postMessage({ command: 'requestHighScores' });
}

// Settings handlers
document.querySelectorAll('.toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    const id = toggle.id;
    const value = toggle.classList.contains('active');
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
  vscode.postMessage({ command: 'updateSetting', key: 'brainrotIntensity', value: e.target.value });
});

// Reset button
document.getElementById('setting-reset')?.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
    SoundManager.play('crash');
    vscode.postMessage({ command: 'resetStats' });
  }
});

${getReadingScript()}

${getSnakeGameScript()}

${getFlappyGameScript()}

${getPlinkoGameScript()}

${getSlotsGameScript()}
`;
}
