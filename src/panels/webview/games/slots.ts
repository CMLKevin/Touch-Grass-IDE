/**
 * Slots Casino Game - Modern Crypto Casino Style
 * Returns JavaScript code as a string for the webview
 */

export function getSlotsGameScript(): string {
  return `
// ===================== SLOTS - CRYPTO CASINO =====================
class SlotsGame {
  constructor(canvas, ctx, controls, betInput, onUpdate) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.controls = controls;
    this.betInput = betInput;
    this.onUpdate = onUpdate;

    // Crypto-themed symbols with rarity weights
    this.symbols = [
      { icon: '💎', name: 'DIAMOND', weight: 1, color: '#60a5fa' },
      { icon: '🚀', name: 'ROCKET', weight: 2, color: '#f472b6' },
      { icon: '🌙', name: 'MOON', weight: 3, color: '#fbbf24' },
      { icon: '⭐', name: 'STAR', weight: 4, color: '#facc15' },
      { icon: '7️⃣', name: 'SEVEN', weight: 3, color: '#ef4444' },
      { icon: '🍀', name: 'LUCK', weight: 5, color: '#4ade80' },
      { icon: '🔥', name: 'FIRE', weight: 4, color: '#f97316' },
      { icon: '💰', name: 'MONEY', weight: 3, color: '#22c55e' }
    ];

    // Payouts: [2-match, 3-match]
    this.payouts = {
      '💎': [5, 150],    // Legendary - rare but huge payout
      '🚀': [3, 75],     // Epic
      '🌙': [2, 50],     // Rare
      '7️⃣': [2, 40],     // Classic
      '💰': [2, 35],     // Money
      '⭐': [1.5, 25],   // Common+
      '🔥': [1.5, 20],   // Common+
      '🍀': [1, 10]      // Common
    };

    this.reels = 3;
    this.particles = new ParticleSystem(ctx);
    this.floatingTexts = [];

    // Build weighted symbol pool
    this.symbolPool = [];
    this.symbols.forEach(s => {
      for (let i = 0; i < s.weight; i++) {
        this.symbolPool.push(s.icon);
      }
    });
  }

  init() {
    this.currentBet = 10;
    this.spinning = false;
    this.autoSpin = false;
    this.autoSpinCount = 0;

    // Reel state
    this.reelPositions = [0, 0, 0];
    this.reelSpeeds = [0, 0, 0];
    this.reelTargets = [null, null, null];
    this.reelBounce = [0, 0, 0];
    this.finalSymbols = ['💎', '💎', '💎'];

    // Visual state
    this.winHighlight = 0;
    this.lastWinAmount = 0;
    this.lastTime = 0;
    this.glowPhase = 0;
    this.jackpotGlow = 0;
    this.screenShake = 0;
    this.winStreak = 0;
    this.nearMiss = false;
    this.anticipation = [false, false, false];

    // Jackpot (accumulates 1% of all bets)
    this.jackpot = parseInt(localStorage.getItem('slots-jackpot') || '1000');

    this.draw();
    this.updateControls();
    this.startIdleAnimation();
  }

  startIdleAnimation() {
    const idle = () => {
      if (!this.spinning) {
        this.glowPhase += 0.02;
        this.draw();
      }
      this.idleAnimId = requestAnimationFrame(idle);
    };
    idle();
  }

  stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.idleAnimId) cancelAnimationFrame(this.idleAnimId);
    if (this.autoSpinTimeout) clearTimeout(this.autoSpinTimeout);
  }

  getRandomSymbol() {
    return this.symbolPool[Math.floor(Math.random() * this.symbolPool.length)];
  }

  spin() {
    const bet = parseInt(this.betInput.value) || 10;
    if (bet > playerBalance) {
      this.showMessage('NOT ENOUGH $GRASS!', '#ef4444');
      SoundManager.play('lose');
      return;
    }

    placeBet(bet);
    SoundManager.play('click');

    this.currentBet = bet;
    this.spinning = true;
    this.winHighlight = 0;
    this.lastWinAmount = 0;
    this.nearMiss = false;
    this.anticipation = [false, false, false];

    // Add 1% to jackpot
    this.jackpot += Math.floor(bet * 0.01);
    localStorage.setItem('slots-jackpot', this.jackpot.toString());

    this.updateControls();

    // Initialize spin with staggered speeds and dramatic timing
    this.reelSpeeds = [30 + Math.random() * 5, 32 + Math.random() * 5, 34 + Math.random() * 5];
    this.reelTargets = [null, null, null];
    this.reelBounce = [0, 0, 0];

    // Staggered stop times for anticipation
    const baseTime = performance.now();
    this.stopTimes = [
      baseTime + 800 + Math.random() * 200,
      baseTime + 1300 + Math.random() * 300,
      baseTime + 2000 + Math.random() * 400  // Long anticipation on last reel
    ];

    // Generate final results with weighted randomness
    this.finalSymbols = Array(this.reels).fill(null).map(() => this.getRandomSymbol());

    // Check for near-miss (2 matching on first 2 reels)
    if (this.finalSymbols[0] === this.finalSymbols[1]) {
      this.nearMiss = true;
    }

    this.lastTime = performance.now();
    this.animate();
  }

  showMessage(text, color) {
    this.floatingTexts.push({
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      text: text,
      color: color,
      life: 1,
      scale: 1.2
    });
    this.continueEffects();
  }

  animate(currentTime = performance.now()) {
    const deltaTime = Math.min((currentTime - this.lastTime) / 16.67, 3);
    this.lastTime = currentTime;

    let stillSpinning = false;
    this.glowPhase += 0.03 * deltaTime;

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake *= 0.9;
    }

    for (let i = 0; i < this.reels; i++) {
      if (this.reelSpeeds[i] > 0 || this.reelBounce[i] !== 0) {
        stillSpinning = true;

        // Check if it's time to start stopping this reel
        if (currentTime >= this.stopTimes[i] && this.reelTargets[i] === null) {
          const finalIdx = this.symbols.findIndex(s => s.icon === this.finalSymbols[i]);
          this.reelTargets[i] = Math.floor(this.reelPositions[i] / 60) * 60 + finalIdx * 60 + 180;

          // Anticipation for near-miss on last reel
          if (i === 2 && this.nearMiss) {
            this.anticipation[i] = true;
          }

          SoundManager.play('drop');
        }

        // Apply deceleration if we have a target
        if (this.reelTargets[i] !== null) {
          const distance = this.reelTargets[i] - this.reelPositions[i];

          // Anticipation slowdown for dramatic effect
          if (this.anticipation[i] && distance > 100) {
            this.reelSpeeds[i] = Math.max(3, this.reelSpeeds[i] * 0.95);
          } else if (distance > 20) {
            this.reelSpeeds[i] = Math.max(4, distance * 0.12);
          } else if (distance > 0) {
            // Final approach with bounce
            this.reelPositions[i] = this.reelTargets[i];
            this.reelSpeeds[i] = 0;
            this.reelBounce[i] = -8; // Start bounce
            SoundManager.play('flip');
          }
        }

        // Bounce animation
        if (this.reelBounce[i] !== 0) {
          this.reelBounce[i] *= -0.5;
          if (Math.abs(this.reelBounce[i]) < 0.5) {
            this.reelBounce[i] = 0;
          }
        }

        // Update position
        this.reelPositions[i] += this.reelSpeeds[i] * deltaTime;
      }
    }

    // Update particles and floating texts
    this.particles.update();
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.y -= 1.5 * deltaTime;
      t.life -= 0.012 * deltaTime;
      if (t.scale < 1.5) t.scale += 0.01 * deltaTime;
      return t.life > 0;
    });

    // Win highlight animation
    if (this.winHighlight > 0) {
      this.winHighlight -= 0.015 * deltaTime;
    }

    // Jackpot glow animation
    if (this.jackpotGlow > 0) {
      this.jackpotGlow -= 0.02 * deltaTime;
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
    let isJackpot = false;

    // Check for matches
    if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
      isTriple = true;
      const sym = symbols[0];
      const payout = this.payouts[sym] ? this.payouts[sym][1] : 10;
      winAmount = Math.floor(this.currentBet * payout);

      // Diamond jackpot
      if (sym === '💎') {
        isJackpot = true;
        winAmount += this.jackpot;
        this.jackpot = 1000; // Reset jackpot
        localStorage.setItem('slots-jackpot', '1000');
        vscode.postMessage({ command: 'casinoWin', game: 'jackpot', amount: winAmount });
      } else if (sym === '7️⃣') {
        vscode.postMessage({ command: 'casinoWin', game: 'lucky-7', amount: winAmount });
      }
    } else if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {
      const matchSym = symbols[0] === symbols[1] ? symbols[0] : (symbols[1] === symbols[2] ? symbols[1] : symbols[0]);
      const payout = this.payouts[matchSym] ? this.payouts[matchSym][0] : 1;
      winAmount = Math.floor(this.currentBet * payout);
    }

    if (winAmount > 0) {
      this.lastWinAmount = winAmount;
      this.winHighlight = 1;
      this.winStreak++;
      this.onUpdate(winAmount, true);

      if (isJackpot) {
        SoundManager.play('jackpot');
        this.jackpotGlow = 1;
        this.screenShake = 20;

        // Massive celebration
        for (let burst = 0; burst < 5; burst++) {
          setTimeout(() => {
            const x = Math.random() * this.canvas.width;
            const y = 100 + Math.random() * 100;
            this.particles.burst(x, y, 40, ['#60a5fa', '#a78bfa', '#fff', '#fbbf24'], 8);
          }, burst * 200);
        }

        this.floatingTexts.push({
          x: this.canvas.width / 2, y: 60,
          text: '🎰 JACKPOT! 🎰',
          color: '#fbbf24', life: 2, scale: 2
        });
        this.floatingTexts.push({
          x: this.canvas.width / 2, y: 100,
          text: '+' + winAmount.toLocaleString() + ' $GRASS!',
          color: '#4ade80', life: 2, scale: 1.5
        });
      } else if (isTriple) {
        SoundManager.play('win');
        this.screenShake = 10;

        // Big celebration for triple
        const symData = this.symbols.find(s => s.icon === symbols[0]);
        for (let i = 0; i < 3; i++) {
          const x = 55 + i * 105;
          this.particles.burst(x, 155, 25, [symData?.color || '#fbbf24', '#fff'], 6);
        }

        this.floatingTexts.push({
          x: this.canvas.width / 2, y: 70,
          text: '🔥 TRIPLE ' + symbols[0] + ' 🔥',
          color: symData?.color || '#fbbf24', life: 1.5, scale: 1.3
        });
        this.floatingTexts.push({
          x: this.canvas.width / 2, y: 100,
          text: '+' + winAmount + ' $GRASS!',
          color: '#4ade80', life: 1.5, scale: 1.2
        });
      } else {
        SoundManager.play('win');
        this.particles.burst(this.canvas.width / 2, 155, 15, ['#fbbf24', '#fff'], 4);
        this.floatingTexts.push({
          x: this.canvas.width / 2, y: 80,
          text: '+' + winAmount + ' $GRASS',
          color: '#fbbf24', life: 1, scale: 1
        });
      }

      this.continueEffects();
    } else {
      SoundManager.play('lose');
      this.winStreak = 0;
      this.onUpdate(this.currentBet, false);
    }

    this.updateControls();

    // Auto-spin logic
    if (this.autoSpin && this.autoSpinCount > 0 && playerBalance >= this.currentBet) {
      this.autoSpinCount--;
      this.autoSpinTimeout = setTimeout(() => {
        if (this.autoSpin && this.autoSpinCount >= 0) {
          this.spin();
        }
      }, winAmount > 0 ? 1500 : 800);
    } else {
      this.autoSpin = false;
      this.autoSpinCount = 0;
    }
  }

  continueEffects() {
    const hasEffects = this.particles.particles.length > 0 ||
                       this.floatingTexts.length > 0 ||
                       this.winHighlight > 0 ||
                       this.jackpotGlow > 0 ||
                       this.screenShake > 0.1;
    if (hasEffects) {
      this.particles.update();
      this.floatingTexts = this.floatingTexts.filter(t => {
        t.y -= 1.5;
        t.life -= 0.012;
        return t.life > 0;
      });
      if (this.winHighlight > 0) this.winHighlight -= 0.015;
      if (this.jackpotGlow > 0) this.jackpotGlow -= 0.02;
      if (this.screenShake > 0) this.screenShake *= 0.9;
      this.glowPhase += 0.03;
      this.draw();
      requestAnimationFrame(() => this.continueEffects());
    }
  }

  updateControls() {
    this.controls.innerHTML = '';

    // Create control container with crypto casino style
    const controlsDiv = document.createElement('div');
    controlsDiv.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; align-items: center;';

    // Quick bet buttons
    const betBtns = document.createElement('div');
    betBtns.style.cssText = 'display: flex; gap: 4px;';

    const halfBtn = document.createElement('button');
    halfBtn.className = 'btn btn-secondary';
    halfBtn.textContent = '÷2';
    halfBtn.style.cssText = 'padding: 8px 12px; font-size: 12px; min-width: auto;';
    halfBtn.onclick = () => {
      const current = parseInt(this.betInput.value) || 10;
      this.betInput.value = Math.max(1, Math.floor(current / 2));
    };

    const doubleBtn = document.createElement('button');
    doubleBtn.className = 'btn btn-secondary';
    doubleBtn.textContent = 'x2';
    doubleBtn.style.cssText = 'padding: 8px 12px; font-size: 12px; min-width: auto;';
    doubleBtn.onclick = () => {
      const current = parseInt(this.betInput.value) || 10;
      this.betInput.value = Math.min(playerBalance, current * 2);
    };

    const maxBtn = document.createElement('button');
    maxBtn.className = 'btn btn-secondary';
    maxBtn.textContent = 'MAX';
    maxBtn.style.cssText = 'padding: 8px 12px; font-size: 12px; min-width: auto; color: #f97316;';
    maxBtn.onclick = () => {
      this.betInput.value = Math.max(1, playerBalance);
    };

    betBtns.appendChild(halfBtn);
    betBtns.appendChild(doubleBtn);
    betBtns.appendChild(maxBtn);

    // Main spin button
    const spinBtn = document.createElement('button');
    spinBtn.className = 'btn btn-bet';
    spinBtn.innerHTML = this.spinning ? '⏳ SPINNING...' : '🎰 SPIN';
    spinBtn.style.cssText = 'padding: 12px 32px; font-size: 16px; font-weight: 700; min-width: 140px;';
    spinBtn.disabled = this.spinning;
    spinBtn.onclick = () => this.spin();

    // Auto-spin button
    const autoBtn = document.createElement('button');
    autoBtn.className = 'btn ' + (this.autoSpin ? 'btn-danger' : 'btn-secondary');
    autoBtn.textContent = this.autoSpin ? 'STOP (' + this.autoSpinCount + ')' : 'AUTO x10';
    autoBtn.style.cssText = 'padding: 8px 16px; font-size: 12px;';
    autoBtn.onclick = () => {
      if (this.autoSpin) {
        this.autoSpin = false;
        this.autoSpinCount = 0;
        if (this.autoSpinTimeout) clearTimeout(this.autoSpinTimeout);
      } else {
        this.autoSpin = true;
        this.autoSpinCount = 10;
        if (!this.spinning) this.spin();
      }
      this.updateControls();
    };

    controlsDiv.appendChild(betBtns);
    controlsDiv.appendChild(spinBtn);
    controlsDiv.appendChild(autoBtn);

    this.controls.appendChild(controlsDiv);
  }

  draw() {
    const ctx = this.ctx;
    const isDark = document.body.classList.contains('dark');

    // Apply screen shake
    ctx.save();
    if (this.screenShake > 0.5) {
      ctx.translate(
        (Math.random() - 0.5) * this.screenShake,
        (Math.random() - 0.5) * this.screenShake
      );
    }

    // Background with gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    if (isDark) {
      bgGrad.addColorStop(0, '#0f0f1a');
      bgGrad.addColorStop(0.5, '#1a1a2e');
      bgGrad.addColorStop(1, '#16161f');
    } else {
      bgGrad.addColorStop(0, '#1a1a2e');
      bgGrad.addColorStop(0.5, '#2d2d44');
      bgGrad.addColorStop(1, '#1a1a2e');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Animated neon border glow
    const glowIntensity = 0.3 + Math.sin(this.glowPhase) * 0.2;
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 20 * glowIntensity;
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, this.canvas.width - 10, this.canvas.height - 10);
    ctx.shadowBlur = 0;

    // Jackpot display at top
    this.drawJackpot(ctx);

    // Animated lights around the machine
    this.drawLights(ctx);

    // Main slot machine frame
    this.drawMachine(ctx, isDark);

    // Draw reels
    this.drawReels(ctx, isDark);

    // Win line indicators
    this.drawWinLine(ctx);

    // Paytable
    this.drawPaytable(ctx);

    // Win streak indicator
    if (this.winStreak > 1) {
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('🔥 ' + this.winStreak + ' WIN STREAK', this.canvas.width - 15, this.canvas.height - 10);
      ctx.textAlign = 'left';
    }

    // Last win display
    if (this.lastWinAmount > 0 && !this.spinning) {
      const winGlow = Math.sin(this.glowPhase * 2) * 0.3 + 0.7;
      ctx.fillStyle = 'rgba(34, 197, 94, ' + winGlow + ')';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('WIN: ' + this.lastWinAmount.toLocaleString() + ' $GRASS', this.canvas.width / 2, this.canvas.height - 35);
      ctx.textAlign = 'left';
    }

    // Draw particles
    this.particles.draw();

    // Draw floating texts
    this.floatingTexts.forEach(t => {
      ctx.globalAlpha = t.life;
      ctx.fillStyle = t.color;
      ctx.font = 'bold ' + Math.floor(16 * (t.scale || 1)) + 'px sans-serif';
      ctx.textAlign = 'center';

      // Text shadow for visibility
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(t.text, t.x, t.y);
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    ctx.restore();
  }

  drawJackpot(ctx) {
    const jackpotY = 25;
    const glow = this.jackpotGlow > 0 ? this.jackpotGlow : (0.5 + Math.sin(this.glowPhase * 1.5) * 0.3);

    // Jackpot background
    const jackpotGrad = ctx.createLinearGradient(60, jackpotY - 15, 260, jackpotY + 15);
    jackpotGrad.addColorStop(0, 'rgba(251, 191, 36, ' + (glow * 0.3) + ')');
    jackpotGrad.addColorStop(0.5, 'rgba(251, 191, 36, ' + (glow * 0.5) + ')');
    jackpotGrad.addColorStop(1, 'rgba(251, 191, 36, ' + (glow * 0.3) + ')');

    ctx.fillStyle = jackpotGrad;
    ctx.beginPath();
    ctx.roundRect(60, jackpotY - 15, 200, 30, 15);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Jackpot text
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💎 JACKPOT 💎', this.canvas.width / 2, jackpotY - 2);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(this.jackpot.toLocaleString() + ' $GRASS', this.canvas.width / 2, jackpotY + 12);
    ctx.textAlign = 'left';
  }

  drawLights(ctx) {
    const lightY = 50;
    const numLights = 12;
    const spacing = (this.canvas.width - 40) / (numLights - 1);

    for (let i = 0; i < numLights; i++) {
      const x = 20 + i * spacing;
      const phase = this.glowPhase + i * 0.5;
      const brightness = 0.5 + Math.sin(phase) * 0.5;
      const hue = (i * 30 + this.glowPhase * 20) % 360;

      // Glow
      ctx.beginPath();
      ctx.arc(x, lightY, 8, 0, Math.PI * 2);
      const glowGrad = ctx.createRadialGradient(x, lightY, 0, x, lightY, 8);
      glowGrad.addColorStop(0, 'hsla(' + hue + ', 100%, 60%, ' + brightness + ')');
      glowGrad.addColorStop(1, 'hsla(' + hue + ', 100%, 60%, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // Light bulb
      ctx.beginPath();
      ctx.arc(x, lightY, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'hsl(' + hue + ', 100%, ' + (40 + brightness * 30) + '%)';
      ctx.fill();
    }
  }

  drawMachine(ctx, isDark) {
    const frameX = 15, frameY = 70, frameW = this.canvas.width - 30, frameH = 150;

    // Outer glow when winning
    if (this.winHighlight > 0) {
      ctx.shadowColor = '#22C55E';
      ctx.shadowBlur = 30 * this.winHighlight;
    }

    // Main frame with metallic gradient
    const frameGrad = ctx.createLinearGradient(frameX, frameY, frameX, frameY + frameH);
    frameGrad.addColorStop(0, isDark ? '#2a2a3a' : '#3a3a4a');
    frameGrad.addColorStop(0.5, isDark ? '#1f1f2f' : '#2a2a3a');
    frameGrad.addColorStop(1, isDark ? '#2a2a3a' : '#3a3a4a');

    ctx.fillStyle = frameGrad;
    ctx.beginPath();
    ctx.roundRect(frameX, frameY, frameW, frameH, 12);
    ctx.fill();

    // Neon border
    ctx.strokeStyle = this.winHighlight > 0 ? '#22C55E' : '#f97316';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner chrome trim
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(frameX + 4, frameY + 4, frameW - 8, frameH - 8, 10);
    ctx.stroke();
  }

  drawReels(ctx, isDark) {
    const frameX = 15, frameY = 70, frameW = this.canvas.width - 30, frameH = 150;
    const reelWidth = (frameW - 50) / 3;
    const reelHeight = frameH - 30;
    const reelY = frameY + 15;

    for (let i = 0; i < 3; i++) {
      const reelX = frameX + 15 + i * (reelWidth + 10);
      const bounce = this.reelBounce[i] || 0;

      // Reel background with slight gradient
      const reelGrad = ctx.createLinearGradient(reelX, reelY, reelX, reelY + reelHeight);
      reelGrad.addColorStop(0, isDark ? '#0a0a0f' : '#1a1a2e');
      reelGrad.addColorStop(0.5, isDark ? '#0f0f15' : '#252538');
      reelGrad.addColorStop(1, isDark ? '#0a0a0f' : '#1a1a2e');

      ctx.fillStyle = reelGrad;
      ctx.beginPath();
      ctx.roundRect(reelX, reelY, reelWidth, reelHeight, 6);
      ctx.fill();

      // Reel border
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw symbols (3 visible, scrolling)
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(reelX, reelY, reelWidth, reelHeight, 6);
      ctx.clip();

      const symbolHeight = 60;
      const offset = this.reelPositions[i] % symbolHeight;
      const baseIndex = Math.floor(this.reelPositions[i] / symbolHeight);

      // Draw 3 symbols
      for (let j = -1; j <= 1; j++) {
        const symIndex = (baseIndex + j + 100 * this.symbols.length) % this.symbols.length;
        const symData = this.spinning ? this.symbols[symIndex] :
          (j === 0 ? this.symbols.find(s => s.icon === this.finalSymbols[i]) : this.symbols[(symIndex + j + this.symbols.length) % this.symbols.length]);
        const sym = symData?.icon || '⭐';
        const y = reelY + reelHeight / 2 + j * symbolHeight - offset + symbolHeight / 2 + bounce;

        // Blur effect when spinning fast
        if (this.reelSpeeds[i] > 15) {
          ctx.globalAlpha = 0.3;
        } else if (this.reelSpeeds[i] > 5) {
          ctx.globalAlpha = 0.6;
        }

        // Symbol glow for center row when not spinning
        if (j === 0 && !this.spinning && this.winHighlight > 0) {
          ctx.shadowColor = symData?.color || '#fbbf24';
          ctx.shadowBlur = 15 * this.winHighlight;
        }

        ctx.font = '36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sym, reelX + reelWidth / 2, y);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // Highlight center row (payline)
      const highlightColor = this.winHighlight > 0 ?
        'rgba(34, 197, 94, ' + (0.3 + this.winHighlight * 0.5) + ')' :
        'rgba(249, 115, 22, 0.2)';
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = this.winHighlight > 0 ? 3 : 2;
      ctx.beginPath();
      ctx.roundRect(reelX - 3, reelY + reelHeight / 2 - 28, reelWidth + 6, 56, 4);
      ctx.stroke();

      // Anticipation indicator
      if (this.anticipation[i] && this.reelSpeeds[i] > 0) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.fillRect(reelX, reelY, reelWidth, reelHeight);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡', reelX + reelWidth / 2, reelY + 15);
      }
    }
  }

  drawWinLine(ctx) {
    const frameX = 15, frameY = 70, frameW = this.canvas.width - 30, frameH = 150;
    const lineY = frameY + frameH / 2;

    // Win line arrows
    const arrowColor = this.winHighlight > 0 ? '#22C55E' : '#f97316';
    const arrowGlow = this.winHighlight > 0 ? this.winHighlight : (0.5 + Math.sin(this.glowPhase * 2) * 0.3);

    ctx.fillStyle = arrowColor;
    ctx.globalAlpha = 0.5 + arrowGlow * 0.5;

    // Left arrow
    ctx.beginPath();
    ctx.moveTo(frameX - 8, lineY);
    ctx.lineTo(frameX + 5, lineY - 12);
    ctx.lineTo(frameX + 5, lineY + 12);
    ctx.fill();

    // Right arrow
    ctx.beginPath();
    ctx.moveTo(frameX + frameW + 8, lineY);
    ctx.lineTo(frameX + frameW - 5, lineY - 12);
    ctx.lineTo(frameX + frameW - 5, lineY + 12);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  drawPaytable(ctx) {
    const y = this.canvas.height - 60;

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💎x3 = JACKPOT!  |  🚀x3 = 75x  |  🌙x3 = 50x  |  2 MATCH = 1-5x', this.canvas.width / 2, y);
    ctx.textAlign = 'left';
  }
}
`;
}
