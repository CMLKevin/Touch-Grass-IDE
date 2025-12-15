export class StateManager {
  private static instance: StateManager;
  private brainrotBlocked: boolean = false;

  private constructor() {}

  public static initialize(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      throw new Error('StateManager not initialized');
    }
    return StateManager.instance;
  }

  public setBrainrotBlocked(blocked: boolean): void {
    this.brainrotBlocked = blocked;
  }

  public isBrainrotBlocked(): boolean {
    return this.brainrotBlocked;
  }
}
