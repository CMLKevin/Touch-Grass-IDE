/**
 * Particle System and Floating Text for webview games
 * Returns JavaScript code as a string for the webview
 */

export function getParticleSystemScript(): string {
  return `
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
`;
}
