/**
 * Flappy Bird Game
 * Returns JavaScript code as a string for the webview
 */

export function getFlappyGameScript(): string {
  return `
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
    // Sky gradient (theme-aware - twilight for dark mode)
    const isDark = document.body.classList.contains('dark');
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    if (isDark) {
      skyGrad.addColorStop(0, '#1a1a2e');
      skyGrad.addColorStop(0.5, '#2d2d44');
      skyGrad.addColorStop(1, '#3d3d5c');
    } else {
      skyGrad.addColorStop(0, '#4ec0ca');
      skyGrad.addColorStop(0.7, '#70c5ce');
      skyGrad.addColorStop(1, '#87ceeb');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // Clouds (parallax) - dimmer in dark mode
    ctx.fillStyle = isDark ? 'rgba(100,100,120,0.4)' : 'rgba(255,255,255,0.8)';
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
    // Ground (theme-aware)
    ctx.fillStyle = isDark ? '#2a2a3a' : '#ded895';
    ctx.fillRect(0, this.canvas.height - 30, this.canvas.width, 30);
    // Ground pattern
    ctx.fillStyle = isDark ? '#3a3a4a' : '#c4b67c';
    for (let x = -this.groundOffset; x < this.canvas.width; x += 24) {
      ctx.fillRect(x, this.canvas.height - 30, 12, 4);
    }
    ctx.fillStyle = isDark ? '#1a1a2a' : '#8b7355';
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
    // Pipe body gradient (softer green)
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#4ADE80');
    grad.addColorStop(0.3, '#6EE7A0');
    grad.addColorStop(0.7, '#6EE7A0');
    grad.addColorStop(1, '#3ECF70');
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
`;
}
