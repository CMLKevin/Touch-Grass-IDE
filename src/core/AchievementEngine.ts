import * as vscode from 'vscode';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'cursed';
  secret?: boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  // Common Achievements
  {
    id: 'first-brainrot',
    name: "Baby's First Brainrot",
    description: 'Opened the brainrot panel for the first time',
    icon: '👶',
    rarity: 'common',
  },
  {
    id: 'first-game',
    name: 'Gamer Moment',
    description: 'Played your first minigame',
    icon: '🎮',
    rarity: 'common',
  },
  {
    id: 'brainrot-1min',
    name: 'Just a Quick Break',
    description: 'Spent 1 minute in brainrot during a single session',
    icon: '⏱️',
    rarity: 'common',
  },
  {
    id: 'first-social',
    name: 'Doom Scroller',
    description: 'Opened social media in the extension',
    icon: '📱',
    rarity: 'common',
  },
  {
    id: 'first-pomodoro',
    name: 'Tomato Timer',
    description: 'Completed your first Pomodoro session',
    icon: '🍅',
    rarity: 'common',
  },
  // Uncommon Achievements
  {
    id: 'brainrot-5min',
    name: 'AI is Still Cooking',
    description: 'Spent 5 minutes in brainrot during a single session',
    icon: '🍳',
    rarity: 'uncommon',
  },
  {
    id: 'snake-100',
    name: 'Snek Master',
    description: 'Score 100+ in Snake',
    icon: '🐍',
    rarity: 'uncommon',
  },
  {
    id: 'flappy-10',
    name: 'Bird Brain',
    description: 'Score 10+ in Flappy Bird',
    icon: '🐦',
    rarity: 'uncommon',
  },
  {
    id: 'games-10',
    name: 'Serial Gamer',
    description: 'Play 10 games total',
    icon: '🕹️',
    rarity: 'uncommon',
  },
  {
    id: 'pomodoro-5',
    name: 'Productive Procrastinator',
    description: 'Complete 5 Pomodoro sessions',
    icon: '⏰',
    rarity: 'uncommon',
  },
  // Rare Achievements
  {
    id: 'brainrot-1hr-total',
    name: 'Professional Procrastinator',
    description: 'Accumulated 1 hour of total brainrot time',
    icon: '💀',
    rarity: 'rare',
  },
  {
    id: 'snake-500',
    name: 'Anaconda',
    description: 'Score 500+ in Snake',
    icon: '🐍',
    rarity: 'rare',
  },
  {
    id: 'flappy-50',
    name: 'Flap God',
    description: 'Score 50+ in Flappy Bird',
    icon: '🦅',
    rarity: 'rare',
  },
  {
    id: 'all-games',
    name: 'Variety Gamer',
    description: 'Play all 4 games at least once',
    icon: '🎲',
    rarity: 'rare',
  },
  {
    id: 'games-100',
    name: 'No Life',
    description: 'Play 100 games total',
    icon: '🎪',
    rarity: 'rare',
  },
  {
    id: 'pomodoro-25',
    name: 'Time Lord',
    description: 'Complete 25 Pomodoro sessions',
    icon: '⌛',
    rarity: 'rare',
  },
  // Legendary Achievements
  {
    id: 'brainrot-24hr',
    name: 'Touched Grass? Never.',
    description: 'Accumulated 24 hours of total brainrot time',
    icon: '🌿',
    rarity: 'legendary',
  },
  {
    id: 'snake-1000',
    name: 'Ouroboros',
    description: 'Score 1000+ in Snake',
    icon: '♾️',
    rarity: 'legendary',
  },
  {
    id: 'flappy-100',
    name: 'Icarus Who?',
    description: 'Score 100+ in Flappy Bird',
    icon: '☀️',
    rarity: 'legendary',
  },
  // Cursed/Secret Achievements
  {
    id: 'midnight-coder',
    name: 'Sleep is for the Weak',
    description: 'Used Touch Grass IDE between 2am and 5am',
    icon: '🌙',
    rarity: 'cursed',
    secret: true,
  },
  {
    id: 'monday-morning',
    name: 'Case of the Mondays',
    description: 'Used Touch Grass IDE before 9am on Monday',
    icon: '😴',
    rarity: 'cursed',
    secret: true,
  },
  {
    id: 'friday-afternoon',
    name: 'TGIF',
    description: 'Used Touch Grass IDE after 4pm on Friday',
    icon: '🎉',
    rarity: 'cursed',
    secret: true,
  },
  {
    id: 'speed-death',
    name: 'Skill Issue',
    description: 'Die in Snake within 3 seconds of starting',
    icon: '💀',
    rarity: 'cursed',
    secret: true,
  },
  {
    id: 'rage-quit',
    name: 'Rage Quit',
    description: 'Play 5 games in under 2 minutes',
    icon: '😤',
    rarity: 'cursed',
    secret: true,
  },
  // Casino Achievements
  {
    id: 'first-gamble',
    name: 'Feeling Lucky',
    description: 'Place your first bet in the casino',
    icon: '🎲',
    rarity: 'common',
  },
  {
    id: 'high-roller',
    name: 'High Roller',
    description: 'Bet 1000+ GC at once',
    icon: '💎',
    rarity: 'rare',
  },
  {
    id: 'jackpot',
    name: 'JACKPOT!',
    description: 'Win 100x or more on a single bet',
    icon: '🎰',
    rarity: 'legendary',
  },
  {
    id: 'house-always-wins',
    name: 'House Always Wins',
    description: 'Lose 1000 GC total in the casino',
    icon: '🏠',
    rarity: 'uncommon',
  },
  {
    id: 'lucky-7',
    name: 'Lucky 777',
    description: 'Get triple 7s on the slots',
    icon: '7️⃣',
    rarity: 'rare',
  },
  {
    id: 'plinko-edge',
    name: 'Edge Lord',
    description: 'Hit an edge multiplier (10x+) on Plinko',
    icon: '🎱',
    rarity: 'uncommon',
  },
  {
    id: 'whale',
    name: 'Whale',
    description: 'Accumulate 10,000 GC balance',
    icon: '🐋',
    rarity: 'legendary',
  },
  {
    id: 'broke',
    name: 'Broke',
    description: 'Reach 0 GC balance',
    icon: '💸',
    rarity: 'cursed',
    secret: true,
  },
];

export class AchievementEngine {
  private static instance: AchievementEngine;
  private unlockedAchievements: Set<string>;
  private context: vscode.ExtensionContext;
  private _onAchievementUnlocked = new vscode.EventEmitter<Achievement>();

  public onAchievementUnlocked = this._onAchievementUnlocked.event;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    const saved = context.globalState.get<string[]>('touchgrass.achievements') || [];
    this.unlockedAchievements = new Set(saved);
  }

  public static initialize(context: vscode.ExtensionContext): AchievementEngine {
    if (!AchievementEngine.instance) {
      AchievementEngine.instance = new AchievementEngine(context);
    }
    return AchievementEngine.instance;
  }

  public static getInstance(): AchievementEngine {
    if (!AchievementEngine.instance) {
      throw new Error('AchievementEngine not initialized');
    }
    return AchievementEngine.instance;
  }

  public check(achievementId: string): boolean {
    if (this.unlockedAchievements.has(achievementId)) {
      return false;
    }
    return this.unlock(achievementId);
  }

  public unlock(achievementId: string): boolean {
    if (this.unlockedAchievements.has(achievementId)) {
      return false;
    }

    const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!achievement) return false;

    this.unlockedAchievements.add(achievementId);
    this.save();

    this._onAchievementUnlocked.fire(achievement);

    const config = vscode.workspace.getConfiguration('touchgrass');
    if (config.get<boolean>('enableAchievements', true)) {
      this.showAchievementNotification(achievement);
    }

    return true;
  }

  private showAchievementNotification(achievement: Achievement): void {
    const rarityEmoji: Record<string, string> = {
      common: '⬜',
      uncommon: '🟩',
      rare: '🟦',
      legendary: '🟨',
      cursed: '🟥',
    };

    vscode.window.showInformationMessage(
      `${rarityEmoji[achievement.rarity]} Achievement Unlocked: ${achievement.icon} ${achievement.name}`
    );
  }

  public checkGameAchievements(game: string, score: number): void {
    switch (game) {
      case 'snake':
        if (score >= 100) this.check('snake-100');
        if (score >= 500) this.check('snake-500');
        if (score >= 1000) this.check('snake-1000');
        break;
      case 'flappy':
        if (score >= 10) this.check('flappy-10');
        if (score >= 50) this.check('flappy-50');
        if (score >= 100) this.check('flappy-100');
        break;
    }
  }

  public checkGamesPlayedAchievements(gamesPlayed: number, gamesPlayedByType: Record<string, number>): void {
    if (gamesPlayed >= 10) this.check('games-10');
    if (gamesPlayed >= 100) this.check('games-100');

    // Check if all games have been played
    const allGames = ['snake', 'flappy', 'plinko', 'slots'];
    if (allGames.every((g) => (gamesPlayedByType[g] || 0) > 0)) {
      this.check('all-games');
    }
  }

  public checkPomodoroAchievements(sessionsCompleted: number): void {
    if (sessionsCompleted >= 1) this.check('first-pomodoro');
    if (sessionsCompleted >= 5) this.check('pomodoro-5');
    if (sessionsCompleted >= 25) this.check('pomodoro-25');
  }

  public checkBrainrotTimeAchievements(totalSeconds: number): void {
    if (totalSeconds >= 3600) this.check('brainrot-1hr-total');
    if (totalSeconds >= 86400) this.check('brainrot-24hr');
  }

  public checkTimeBasedAchievements(): void {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Midnight coding (2am-5am)
    if (hour >= 2 && hour < 5) {
      this.check('midnight-coder');
    }

    // Monday morning before 9am
    if (day === 1 && hour < 9) {
      this.check('monday-morning');
    }

    // Friday afternoon after 4pm
    if (day === 5 && hour >= 16) {
      this.check('friday-afternoon');
    }
  }

  public checkSpeedDeath(gameTime: number): void {
    if (gameTime <= 3000) {
      this.check('speed-death');
    }
  }

  public checkRageQuit(recentGameTimes: number[]): void {
    // Check if 5 games were played in under 2 minutes total
    if (recentGameTimes.length >= 5) {
      const lastFive = recentGameTimes.slice(-5);
      const totalTime = lastFive.reduce((a, b) => a + b, 0);
      if (totalTime < 120000) {
        this.check('rage-quit');
      }
    }
  }

  public checkCasinoAchievements(): void {
    try {
      // Import dynamically to avoid circular dependency
      const { CurrencyManager } = require('./CurrencyManager');
      const currency = CurrencyManager.getInstance();

      // Check house-always-wins (lost 1000+ GC total)
      if (currency.getLifetimeLost() >= 1000) {
        this.check('house-always-wins');
      }
    } catch {
      // CurrencyManager not initialized
    }
  }

  public getUnlockedAchievements(): (Achievement & { unlocked: boolean })[] {
    return ACHIEVEMENTS.filter((a) => this.unlockedAchievements.has(a.id) || !a.secret).map(
      (a) => ({
        ...a,
        unlocked: this.unlockedAchievements.has(a.id),
      })
    );
  }

  public getProgress(): { unlocked: number; total: number } {
    return {
      unlocked: this.unlockedAchievements.size,
      total: ACHIEVEMENTS.length,
    };
  }

  private save(): void {
    this.context.globalState.update(
      'touchgrass.achievements',
      Array.from(this.unlockedAchievements)
    );
  }

  public reset(): void {
    this.unlockedAchievements.clear();
    this.save();
  }
}
