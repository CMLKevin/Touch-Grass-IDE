import * as vscode from 'vscode';
import { AchievementEngine } from './AchievementEngine';

interface SessionStats {
  today: {
    brainrotTimeMs: number;
    gamesPlayed: number;
    achievementsUnlocked: number;
    aiGenerationsDetected: number;
  };
  allTime: {
    totalBrainrotTimeMs: number;
    totalGamesPlayed: number;
    totalAchievements: number;
    gameHighScores: Record<string, number>;
    gamesPlayedByType: Record<string, number>;
    longestBrainrotSession: number;
    daysActive: number;
    recentGameTimes: number[];
  };
  computed: {
    degeneracyLevel: string;
  };
}

export class SessionTracker {
  private static instance: SessionTracker;
  private stats: SessionStats;
  private context: vscode.ExtensionContext;
  private brainrotStartTime: number | null = null;
  private currentSessionDuration: number = 0;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.stats = this.loadStats();
    this.checkNewDay();

    // Save stats periodically
    setInterval(() => this.saveStats(), 30000);
  }

  public static initialize(context: vscode.ExtensionContext): SessionTracker {
    if (!SessionTracker.instance) {
      SessionTracker.instance = new SessionTracker(context);
    }
    return SessionTracker.instance;
  }

  public static getInstance(): SessionTracker {
    if (!SessionTracker.instance) {
      throw new Error('SessionTracker not initialized');
    }
    return SessionTracker.instance;
  }

  private loadStats(): SessionStats {
    const saved = this.context.globalState.get<SessionStats>('touchgrass.stats');
    if (saved) return saved;
    return this.getDefaultStats();
  }

  private getDefaultStats(): SessionStats {
    return {
      today: {
        brainrotTimeMs: 0,
        gamesPlayed: 0,
        achievementsUnlocked: 0,
        aiGenerationsDetected: 0,
      },
      allTime: {
        totalBrainrotTimeMs: 0,
        totalGamesPlayed: 0,
        totalAchievements: 0,
        gameHighScores: {},
        gamesPlayedByType: {},
        longestBrainrotSession: 0,
        daysActive: 1,
        recentGameTimes: [],
      },
      computed: {
        degeneracyLevel: 'touching-grass',
      },
    };
  }

  private checkNewDay(): void {
    const lastActive = this.context.globalState.get<string>('touchgrass.lastActiveDate');
    const today = new Date().toDateString();

    if (lastActive !== today) {
      this.stats.today = this.getDefaultStats().today;
      this.stats.allTime.daysActive++;
      this.context.globalState.update('touchgrass.lastActiveDate', today);
    }
  }

  public startBrainrot(): void {
    this.brainrotStartTime = Date.now();
    this.currentSessionDuration = 0;
    this.stats.today.aiGenerationsDetected++;
  }

  public endBrainrot(): void {
    if (this.brainrotStartTime) {
      const duration = Date.now() - this.brainrotStartTime;
      this.addBrainrotTime(duration);
      this.brainrotStartTime = null;
      this.currentSessionDuration = 0;
    }
  }

  public addBrainrotTime(durationMs: number): void {
    this.stats.today.brainrotTimeMs += durationMs;
    this.stats.allTime.totalBrainrotTimeMs += durationMs;
    this.currentSessionDuration += durationMs;

    if (durationMs > this.stats.allTime.longestBrainrotSession) {
      this.stats.allTime.longestBrainrotSession = durationMs;
    }

    this.updateDegeneracyLevel();
    this.checkBrainrotAchievements();
    this.saveStats();
  }

  private gameStartTime: number = 0;

  public recordGamePlayed(game?: string): void {
    this.stats.today.gamesPlayed++;
    this.stats.allTime.totalGamesPlayed++;
    this.gameStartTime = Date.now();

    if (game) {
      // Ensure gamesPlayedByType exists
      if (!this.stats.allTime.gamesPlayedByType) {
        this.stats.allTime.gamesPlayedByType = {};
      }
      this.stats.allTime.gamesPlayedByType[game] =
        (this.stats.allTime.gamesPlayedByType[game] || 0) + 1;

      try {
        AchievementEngine.getInstance().checkGamesPlayedAchievements(
          this.stats.allTime.totalGamesPlayed,
          this.stats.allTime.gamesPlayedByType
        );
      } catch {
        // Achievement engine not initialized yet
      }
    }
    this.saveStats();
  }

  public recordGameScore(game: string, score: number): void {
    const gameTime = Date.now() - this.gameStartTime;

    // Track recent game times for rage quit achievement
    if (!this.stats.allTime.recentGameTimes) {
      this.stats.allTime.recentGameTimes = [];
    }
    this.stats.allTime.recentGameTimes.push(gameTime);
    // Keep only last 10 game times
    if (this.stats.allTime.recentGameTimes.length > 10) {
      this.stats.allTime.recentGameTimes.shift();
    }

    const currentHigh = this.stats.allTime.gameHighScores[game] || 0;
    if (score > currentHigh) {
      this.stats.allTime.gameHighScores[game] = score;
    }

    try {
      const achievements = AchievementEngine.getInstance();
      achievements.checkGameAchievements(game, score);

      // Check speed death for snake
      if (game === 'snake' && gameTime <= 3000) {
        achievements.checkSpeedDeath(gameTime);
      }

      // Check rage quit
      achievements.checkRageQuit(this.stats.allTime.recentGameTimes);
    } catch {
      // Achievement engine not initialized yet
    }

    this.saveStats();
  }

  public getHighScore(game: string): number {
    return this.stats.allTime.gameHighScores[game] || 0;
  }

  private updateDegeneracyLevel(): void {
    const totalBrainrotHours = this.stats.allTime.totalBrainrotTimeMs / (1000 * 60 * 60);

    if (totalBrainrotHours < 0.5) {
      this.stats.computed.degeneracyLevel = 'touching-grass';
    } else if (totalBrainrotHours < 2) {
      this.stats.computed.degeneracyLevel = 'casual';
    } else if (totalBrainrotHours < 5) {
      this.stats.computed.degeneracyLevel = 'degenerate';
    } else {
      this.stats.computed.degeneracyLevel = 'terminal';
    }
  }

  private checkBrainrotAchievements(): void {
    try {
      const achievements = AchievementEngine.getInstance();
      const sessionDuration = this.currentSessionDuration;

      if (sessionDuration >= 60000) achievements.check('brainrot-1min');
      if (sessionDuration >= 300000) achievements.check('brainrot-5min');

      const totalBrainrot = this.stats.allTime.totalBrainrotTimeMs;
      if (totalBrainrot >= 3600000) achievements.check('brainrot-1hr-total');
    } catch {
      // Achievement engine not initialized yet
    }
  }

  public getCurrentSessionDuration(): number {
    if (this.brainrotStartTime) {
      return Date.now() - this.brainrotStartTime;
    }
    return 0;
  }

  public getStats(): SessionStats {
    return { ...this.stats };
  }

  public getDegeneracyPercent(): number {
    const totalHours = this.stats.allTime.totalBrainrotTimeMs / (1000 * 60 * 60);
    return Math.min(100, (totalHours / 10) * 100); // 10 hours = 100%
  }

  private saveStats(): void {
    this.context.globalState.update('touchgrass.stats', this.stats);
  }

  public reset(): void {
    this.stats = this.getDefaultStats();
    this.brainrotStartTime = null;
    this.currentSessionDuration = 0;
    this.saveStats();
  }
}
