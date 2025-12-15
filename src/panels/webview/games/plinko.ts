/**
 * Plinko Casino Game
 * Returns JavaScript code as a string for the webview
 */

export function getPlinkoGameScript(): string {
  return `
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
    if (bet > playerBalance) { alert('Not enough $GRASS! NGMI'); return; }
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
          text: '+' + winAmount + ' $GRASS',
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
    dropBtn.addEventListener('click', () => this.drop());
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
    riskSelect.addEventListener('change', (e) => { this.risk = e.target.value; this.draw(); });
    this.controls.appendChild(riskLabel);
    this.controls.appendChild(riskSelect);
  }
  draw() {
    // Background with subtle gradient (theme-aware)
    const isDark = document.body.classList.contains('dark');
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    bgGrad.addColorStop(0, isDark ? '#242424' : '#ecebd9');
    bgGrad.addColorStop(1, isDark ? '#1a1a1a' : '#dedcc8');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw pin board area
    this.ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)';
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

        // Pin with metallic gradient (theme-aware)
        const pinGrad = this.ctx.createRadialGradient(px - 1, rowY - 1, 0, px, rowY, 5);
        pinGrad.addColorStop(0, litPin ? '#ffd700' : (isDark ? '#737373' : '#D4D4D4'));
        pinGrad.addColorStop(0.5, litPin ? '#fbbf24' : (isDark ? '#525252' : '#A3A3A3'));
        pinGrad.addColorStop(1, litPin ? '#b8860b' : (isDark ? '#333333' : '#737373'));
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

      // Multiplier text (theme-aware)
      this.ctx.fillStyle = isDark ? '#fafafa' : '#000';
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
`;
}
