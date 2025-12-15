import * as vscode from 'vscode';
import { StateManager } from './core/StateManager';
import { SessionTracker } from './core/SessionTracker';
import { AchievementEngine } from './core/AchievementEngine';
import { ActivityDetector } from './core/ActivityDetector';
import { CurrencyManager } from './core/CurrencyManager';
import { CodingActivityTracker } from './core/CodingActivityTracker';
import { BrainrotPanel } from './panels/BrainrotPanel';

export function activate(context: vscode.ExtensionContext) {
  console.log('Touch Grass IDE is now active!');

  // Initialize core systems
  const stateManager = StateManager.initialize();
  const sessionTracker = SessionTracker.initialize(context);
  const achievementEngine = AchievementEngine.initialize(context);
  const currencyManager = CurrencyManager.initialize(context);
  const codingActivityTracker = new CodingActivityTracker();
  const activityDetector = new ActivityDetector();

  // Register commands
  const openBrainrotCommand = vscode.commands.registerCommand(
    'touchgrass.openBrainrot',
    () => {
      BrainrotPanel.createOrShow(context.extensionUri, context);
      achievementEngine.check('first-brainrot');
    }
  );

  const toggleAutoModeCommand = vscode.commands.registerCommand(
    'touchgrass.toggleAutoMode',
    () => {
      const config = vscode.workspace.getConfiguration('touchgrass');
      const currentValue = config.get<boolean>('autoDetect', true);
      config.update('autoDetect', !currentValue, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(
        `Touch Grass: Auto-detection ${!currentValue ? 'enabled' : 'disabled'}`
      );
    }
  );

  const resetStatsCommand = vscode.commands.registerCommand(
    'touchgrass.resetStats',
    async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Reset all Touch Grass stats and achievements?',
        { modal: true },
        'Reset'
      );
      if (confirm === 'Reset') {
        sessionTracker.reset();
        achievementEngine.reset();
        currencyManager.reset();
        vscode.window.showInformationMessage('Touch Grass: All stats reset!');
      }
    }
  );

  // Wire up activity detection
  activityDetector.onGenerationStart(() => {
    const config = vscode.workspace.getConfiguration('touchgrass');
    codingActivityTracker.setAIGenerating(true);
    if (config.get<boolean>('autoDetect', true) && !stateManager.isBrainrotBlocked()) {
      BrainrotPanel.createOrShow(context.extensionUri, context);
      sessionTracker.startBrainrot();
    }
  });

  activityDetector.onGenerationEnd(() => {
    const config = vscode.workspace.getConfiguration('touchgrass');
    codingActivityTracker.setAIGenerating(false);
    if (config.get<boolean>('autoMinimize', true)) {
      BrainrotPanel.currentPanel?.minimize();
    }
    sessionTracker.endBrainrot();
  });

  // Track panel visibility for currency earning
  BrainrotPanel.onVisibilityChange((visible) => {
    codingActivityTracker.setPanelVisible(visible);
  });

  // Start activity detection
  activityDetector.activate();

  // Check time-based achievements periodically
  const achievementCheckInterval = setInterval(() => {
    achievementEngine.checkTimeBasedAchievements();
  }, 60000);

  // Register disposables
  context.subscriptions.push(
    openBrainrotCommand,
    toggleAutoModeCommand,
    resetStatsCommand,
    activityDetector,
    codingActivityTracker,
    { dispose: () => clearInterval(achievementCheckInterval) }
  );
}

export function deactivate() {
  console.log('Touch Grass IDE deactivated');
}
