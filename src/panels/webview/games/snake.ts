/**
 * Snake Game
 * Returns JavaScript code as a string for the webview
 */

export function getSnakeGameScript(): string {
  return `
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
    // Background with subtle grid (theme-aware)
    const isDark = document.body.classList.contains('dark');
    ctx.fillStyle = isDark ? '#242424' : '#ecebd9';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.strokeStyle = isDark ? '#333333' : '#d4d2be';
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
    gradient.addColorStop(0, 'rgba(249, 115, 22, 0.8)');
    gradient.addColorStop(0.6, 'rgba(249, 115, 22, 0.3)');
    gradient.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(fx, fy, baseRadius * pulse * 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Core
    ctx.fillStyle = '#F97316';
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
`;
}
