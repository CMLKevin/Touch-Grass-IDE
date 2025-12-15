import * as vscode from 'vscode';

interface CurrencyStats {
  balance: number;
  lifetimeEarned: number;
  lifetimeWagered: number;
  lifetimeWon: number;
  lifetimeLost: number;
  blackjackWins: number;
}

export class CurrencyManager {
  private static instance: CurrencyManager;
  private context: vscode.ExtensionContext;
  private stats: CurrencyStats;
  private _onBalanceChange = new vscode.EventEmitter<number>();
  public onBalanceChange = this._onBalanceChange.event;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.stats = this.loadStats();
  }

  public static initialize(context: vscode.ExtensionContext): CurrencyManager {
    if (!CurrencyManager.instance) {
      CurrencyManager.instance = new CurrencyManager(context);
    }
    return CurrencyManager.instance;
  }

  public static getInstance(): CurrencyManager {
    if (!CurrencyManager.instance) {
      throw new Error('CurrencyManager not initialized');
    }
    return CurrencyManager.instance;
  }

  private loadStats(): CurrencyStats {
    const saved = this.context.globalState.get<CurrencyStats>('touchgrass.currency');
    if (saved) return saved;
    return this.getDefaultStats();
  }

  private getDefaultStats(): CurrencyStats {
    return {
      balance: 100, // Starting balance
      lifetimeEarned: 0,
      lifetimeWagered: 0,
      lifetimeWon: 0,
      lifetimeLost: 0,
      blackjackWins: 0,
    };
  }

  public getBalance(): number {
    return this.stats.balance;
  }

  public getStats(): CurrencyStats {
    return { ...this.stats };
  }

  public addCoins(amount: number, source: 'coding' | 'casino' = 'coding'): void {
    this.stats.balance += amount;
    if (source === 'coding') {
      this.stats.lifetimeEarned += amount;
    } else {
      this.stats.lifetimeWon += amount;
    }
    this._onBalanceChange.fire(this.stats.balance);
    this.save();
  }

  public spendCoins(amount: number): boolean {
    if (amount > this.stats.balance) {
      return false;
    }
    this.stats.balance -= amount;
    this.stats.lifetimeWagered += amount;
    this._onBalanceChange.fire(this.stats.balance);
    this.save();
    return true;
  }

  public recordLoss(amount: number): void {
    this.stats.lifetimeLost += amount;
    this.save();
  }

  public recordBlackjackWin(): void {
    this.stats.blackjackWins++;
    this.save();
  }

  public getBlackjackWins(): number {
    return this.stats.blackjackWins;
  }

  public getLifetimeLost(): number {
    return this.stats.lifetimeLost;
  }

  private save(): void {
    this.context.globalState.update('touchgrass.currency', this.stats);
  }

  public reset(): void {
    this.stats = this.getDefaultStats();
    this._onBalanceChange.fire(this.stats.balance);
    this.save();
  }
}
