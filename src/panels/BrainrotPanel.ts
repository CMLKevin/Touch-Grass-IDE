import * as vscode from 'vscode';
import { SessionTracker } from '../core/SessionTracker';
import { AchievementEngine } from '../core/AchievementEngine';
import { PomodoroManager, PomodoroState } from '../core/PomodoroManager';
import { CurrencyManager } from '../core/CurrencyManager';

export class BrainrotPanel {
  public static currentPanel: BrainrotPanel | undefined;
  private static _onVisibilityChange = new vscode.EventEmitter<boolean>();
  public static onVisibilityChange = BrainrotPanel._onVisibilityChange.event;
  private static _onPomodoroWorkModeChange = new vscode.EventEmitter<boolean>();
  public static onPomodoroWorkModeChange = BrainrotPanel._onPomodoroWorkModeChange.event;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _context: vscode.ExtensionContext;
  private _disposables: vscode.Disposable[] = [];
  private _pomodoroManager: PomodoroManager | null = null;

  public static createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ): BrainrotPanel {
    const column = vscode.ViewColumn.Beside;

    if (BrainrotPanel.currentPanel) {
      BrainrotPanel.currentPanel._panel.reveal(column);
      return BrainrotPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'touchgrassBrainrot',
      '🌿 Touch Grass',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist', 'webview')],
      }
    );

    BrainrotPanel.currentPanel = new BrainrotPanel(panel, extensionUri, context);
    return BrainrotPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._context = context;

    // Initialize Pomodoro manager
    this._pomodoroManager = new PomodoroManager(context);
    this._pomodoroManager.onStateChange((state) => {
      this._sendPomodoroState(state);
      // Fire event for currency earning - true when in active work mode
      BrainrotPanel._onPomodoroWorkModeChange.fire(state.isActive && state.mode === 'work');
    });

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Track visibility changes for currency earning
    this._panel.onDidChangeViewState(
      (e) => {
        BrainrotPanel._onVisibilityChange.fire(e.webviewPanel.visible);
        if (e.webviewPanel.visible) {
          this._sendBalance();
        }
      },
      null,
      this._disposables
    );

    // Fire initial visibility
    BrainrotPanel._onVisibilityChange.fire(true);

    this._panel.webview.onDidReceiveMessage(
      (message) => this._handleMessage(message),
      null,
      this._disposables
    );
  }

  public minimize(): void {
    if (this._panel.visible) {
      // VSCode doesn't have native minimize
    }
  }

  public show(): void {
    this._panel.reveal(vscode.ViewColumn.Beside);
  }

  private _handleMessage(message: { command: string; [key: string]: unknown }): void {
    switch (message.command) {
      case 'gamePlayed':
        try {
          SessionTracker.getInstance().recordGamePlayed(message.game as string);
          AchievementEngine.getInstance().check('first-game');
        } catch {
          // Not initialized
        }
        break;
      case 'gameScore':
        try {
          SessionTracker.getInstance().recordGameScore(
            message.game as string,
            message.score as number
          );
        } catch {
          // Not initialized
        }
        break;
      case 'requestHighScores':
        this._sendHighScores();
        break;
      case 'requestPomodoroState':
        if (this._pomodoroManager) {
          this._sendPomodoroState(this._pomodoroManager.getState());
        }
        break;
      case 'pomodoroStart':
        this._pomodoroManager?.start();
        break;
      case 'pomodoroPause':
        this._pomodoroManager?.pause();
        break;
      case 'pomodoroReset':
        this._pomodoroManager?.reset();
        break;
      case 'pomodoroSkip':
        this._pomodoroManager?.skip();
        break;
      case 'pomodoroStartWork':
        this._pomodoroManager?.startWork();
        break;
      case 'pomodoroStartBreak':
        this._pomodoroManager?.startBreak();
        break;
      case 'openExternal':
        if (message.url && typeof message.url === 'string') {
          vscode.env.openExternal(vscode.Uri.parse(message.url));
        }
        break;
      case 'getBalance':
        this._sendBalance();
        break;
      case 'casinoBet':
        this._handleCasinoBet(message.amount as number);
        break;
      case 'casinoWin':
        this._handleCasinoWin(message.game as string, message.amount as number);
        break;
      case 'casinoLoss':
        this._handleCasinoLoss(message.amount as number);
        break;
      case 'casinoBlackjackWin':
        try {
          CurrencyManager.getInstance().recordBlackjackWin();
          AchievementEngine.getInstance().checkCasinoAchievements();
        } catch {
          // Not initialized
        }
        break;
      case 'updateSetting':
        this._updateSetting(message.key as string, message.value);
        break;
      case 'resetStats':
        vscode.commands.executeCommand('touchgrass.resetStats');
        break;
      case 'fetchHackerNews':
        this._fetchHackerNews(message.page as number);
        break;
      case 'fetchLessWrong':
        this._fetchRssFeed('lesswrong');
        break;
      case 'fetchACX':
        this._fetchRssFeed('acx');
        break;
      case 'fetchHNPost':
        this._fetchHNPost(message.id as number);
        break;
      case 'fetchLWPost':
        this._fetchLWPost(message.postId as string);
        break;
      case 'fetchACXPost':
        this._fetchACXPost(message.url as string);
        break;
    }
  }

  private _updateSetting(key: string, value: unknown): void {
    const config = vscode.workspace.getConfiguration('touchgrass');
    config.update(key, value, vscode.ConfigurationTarget.Global);
  }

  private _sendBalance(): void {
    try {
      const balance = CurrencyManager.getInstance().getBalance();
      this._panel.webview.postMessage({
        command: 'balanceUpdate',
        balance,
      });
    } catch {
      // Not initialized
    }
  }

  private _handleCasinoBet(amount: number): void {
    try {
      const currency = CurrencyManager.getInstance();
      const success = currency.spendCoins(amount);
      this._panel.webview.postMessage({
        command: 'betResult',
        success,
        balance: currency.getBalance(),
      });
      if (success) {
        AchievementEngine.getInstance().check('first-gamble');
        if (amount >= 1000) {
          AchievementEngine.getInstance().check('high-roller');
        }
      }
    } catch {
      // Not initialized
    }
  }

  private _handleCasinoWin(game: string, amount: number): void {
    try {
      const currency = CurrencyManager.getInstance();
      currency.addCoins(amount, 'casino');
      this._sendBalance();

      // Check achievements
      const achievements = AchievementEngine.getInstance();
      if (currency.getBalance() >= 10000) {
        achievements.check('whale');
      }
      achievements.checkCasinoAchievements();
    } catch {
      // Not initialized
    }
  }

  private _handleCasinoLoss(amount: number): void {
    try {
      const currency = CurrencyManager.getInstance();
      currency.recordLoss(amount);
      this._sendBalance();

      // Check achievements
      const achievements = AchievementEngine.getInstance();
      if (currency.getBalance() === 0) {
        achievements.check('broke');
        achievements.check('fanum-tax');
      }
      achievements.checkCasinoAchievements();
    } catch {
      // Not initialized
    }
  }

  private _sendHighScores(): void {
    try {
      const tracker = SessionTracker.getInstance();
      this._panel.webview.postMessage({
        command: 'highScoresUpdate',
        highScores: {
          snake: tracker.getHighScore('snake'),
          '2048': tracker.getHighScore('2048'),
          flappy: tracker.getHighScore('flappy'),
          tetris: tracker.getHighScore('tetris'),
        },
      });
    } catch {
      // Not initialized
    }
  }

  private _sendPomodoroState(state: PomodoroState): void {
    const formattedTime = this._pomodoroManager?.getFormattedTime() || '25:00';
    const stats = this._pomodoroManager?.getStats() || { sessions: 0, workTime: '0m', breakTime: '0m' };
    this._panel.webview.postMessage({
      command: 'pomodoroUpdate',
      state,
      formattedTime,
      stats,
    });
  }

  private async _fetchHackerNews(page: number = 0): Promise<void> {
    try {
      const topStoriesUrl = 'https://hacker-news.firebaseio.com/v0/topstories.json';
      const storyIds = await this._httpsGet(topStoriesUrl) as number[];

      const startIndex = page * 15;
      const selectedIds = storyIds.slice(startIndex, startIndex + 15);

      type HNStory = { id: number; title: string; url?: string; score: number; by: string; time: number; descendants?: number };
      const stories = await Promise.all(
        selectedIds.map(id =>
          this._httpsGet(`https://hacker-news.firebaseio.com/v0/item/${id}.json`) as Promise<HNStory>
        )
      );

      // Filter out null/deleted stories and safely extract domain
      const validStories = stories.filter(s => s && s.id).map(s => {
        let domain = 'news.ycombinator.com';
        if (s.url) {
          try {
            domain = new URL(s.url).hostname.replace('www.', '');
          } catch {
            domain = 'unknown';
          }
        }
        return {
          id: s.id,
          title: s.title || 'Untitled',
          url: s.url,
          score: s.score || 0,
          by: s.by || 'unknown',
          time: s.time,
          descendants: s.descendants || 0,
          domain
        };
      });

      this._panel.webview.postMessage({
        command: 'hackerNewsData',
        stories: validStories,
        hasMore: storyIds.length > startIndex + 15,
        page
      });
    } catch (error) {
      this._panel.webview.postMessage({
        command: 'hackerNewsError',
        error: 'Failed to load Hacker News'
      });
    }
  }

  private async _fetchRssFeed(source: 'lesswrong' | 'acx'): Promise<void> {
    try {
      const urls = {
        lesswrong: 'https://www.lesswrong.com/feed.xml',
        acx: 'https://www.astralcodexten.com/feed'
      };

      const xml = await this._httpsGet(urls[source], true) as string;
      const items = this._parseRss(xml);

      this._panel.webview.postMessage({
        command: source === 'lesswrong' ? 'lessWrongData' : 'acxData',
        items: items.slice(0, 15)
      });
    } catch (error) {
      this._panel.webview.postMessage({
        command: source === 'lesswrong' ? 'lessWrongError' : 'acxError',
        error: `Failed to load ${source === 'lesswrong' ? 'LessWrong' : 'ACX'}`
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _httpsGet(url: string, asText: boolean = false): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const https = require('https');
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      https.get(url, (res: any) => {
        let data = '';
        res.on('data', (chunk: string) => data += chunk);
        res.on('end', () => {
          try {
            resolve(asText ? data : JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      }).on('error', reject);
    });
  }

  private _parseRss(xml: string): Array<{title: string; link: string; pubDate: string; description?: string}> {
    const items: Array<{title: string; link: string; pubDate: string; description?: string}> = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const title = this._extractXmlTag(itemXml, 'title');
      const link = this._extractXmlTag(itemXml, 'link');
      const pubDate = this._extractXmlTag(itemXml, 'pubDate');
      const description = this._extractXmlTag(itemXml, 'description');

      if (title && link) {
        items.push({ title, link, pubDate, description });
      }
    }
    return items;
  }

  private _extractXmlTag(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    return match ? (match[1] || match[2] || '').trim() : '';
  }

  // Fetch HN post with comments
  private async _fetchHNPost(id: number): Promise<void> {
    try {
      type HNItem = {
        id: number;
        type: string;
        title?: string;
        text?: string;
        url?: string;
        score?: number;
        by?: string;
        time: number;
        descendants?: number;
        kids?: number[];
        deleted?: boolean;
        dead?: boolean;
      };

      const story = await this._httpsGet(`https://hacker-news.firebaseio.com/v0/item/${id}.json`) as HNItem;

      if (!story) {
        throw new Error('Story not found');
      }

      // Fetch comments recursively (limit depth to 3 levels, max 50 comments)
      const fetchComments = async (ids: number[], depth: number, maxTotal: number): Promise<HNItem[]> => {
        if (!ids || ids.length === 0 || depth > 3 || maxTotal <= 0) return [];

        const toFetch = ids.slice(0, Math.min(ids.length, maxTotal));
        const comments = await Promise.all(
          toFetch.map(cid => this._httpsGet(`https://hacker-news.firebaseio.com/v0/item/${cid}.json`) as Promise<HNItem>)
        );

        const validComments = comments.filter(c => c && !c.deleted && !c.dead);
        let remaining = maxTotal - validComments.length;

        // Fetch nested replies
        for (const comment of validComments) {
          if (comment.kids && comment.kids.length > 0 && remaining > 0) {
            const replies = await fetchComments(comment.kids, depth + 1, Math.min(5, remaining));
            (comment as HNItem & { replies: HNItem[] }).replies = replies;
            remaining -= replies.length;
          }
        }

        return validComments;
      };

      const comments = story.kids ? await fetchComments(story.kids, 1, 50) : [];

      let domain = 'news.ycombinator.com';
      if (story.url) {
        try {
          domain = new URL(story.url).hostname.replace('www.', '');
        } catch {
          domain = 'unknown';
        }
      }

      this._panel.webview.postMessage({
        command: 'hnPostData',
        post: {
          id: story.id,
          title: story.title,
          url: story.url,
          text: story.text,
          score: story.score,
          by: story.by,
          time: story.time,
          descendants: story.descendants || 0,
          domain
        },
        comments
      });
    } catch (error) {
      this._panel.webview.postMessage({
        command: 'hnPostError',
        error: 'Failed to load post'
      });
    }
  }

  // Fetch LessWrong post via GraphQL
  private async _fetchLWPost(postId: string): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const https = require('https');

      const query = {
        query: `
          query PostById($id: String) {
            post(input: {selector: {_id: $id}}) {
              result {
                _id
                title
                slug
                htmlBody
                postedAt
                baseScore
                voteCount
                commentCount
                user {
                  displayName
                  username
                }
              }
            }
          }
        `,
        variables: { id: postId }
      };

      const postData = JSON.stringify(query);

      const result = await new Promise<string>((resolve, reject) => {
        const req = https.request({
          hostname: 'www.lesswrong.com',
          path: '/graphql',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }, (res: any) => {
          let data = '';
          res.on('data', (chunk: string) => data += chunk);
          res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
      });

      const parsed = JSON.parse(result);
      const post = parsed?.data?.post?.result;

      if (!post) {
        throw new Error('Post not found');
      }

      this._panel.webview.postMessage({
        command: 'lwPostData',
        post: {
          id: post._id,
          title: post.title,
          slug: post.slug,
          content: post.htmlBody,
          author: post.user?.displayName || post.user?.username || 'Unknown',
          date: post.postedAt,
          karma: post.baseScore,
          voteCount: post.voteCount,
          commentCount: post.commentCount
        }
      });
    } catch (error) {
      this._panel.webview.postMessage({
        command: 'lwPostError',
        error: 'Failed to load article'
      });
    }
  }

  // Fetch ACX/Substack article content
  private async _fetchACXPost(url: string): Promise<void> {
    try {
      const html = await this._httpsGet(url, true) as string;

      // Extract article content from Substack HTML
      // Look for the article body
      let title = '';
      let author = 'Scott Alexander';
      let date = '';
      let content = '';

      // Extract title
      const titleMatch = html.match(/<h1[^>]*class="[^"]*post-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
                         html.match(/<meta property="og:title" content="([^"]+)"/i);
      if (titleMatch) {
        title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
      }

      // Extract date
      const dateMatch = html.match(/<time[^>]*datetime="([^"]+)"/) ||
                        html.match(/<meta property="article:published_time" content="([^"]+)"/);
      if (dateMatch) {
        date = dateMatch[1];
      }

      // Extract article body - Substack uses specific class names
      const bodyMatch = html.match(/<div[^>]*class="[^"]*body markup[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*(?:<div[^>]*class="[^"]*post-footer|<footer)/i) ||
                        html.match(/<div[^>]*class="[^"]*available-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*subscription/i) ||
                        html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);

      if (bodyMatch) {
        content = bodyMatch[1];
        // Clean up the content - remove scripts, styles, and excessive whitespace
        content = content
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<button[\s\S]*?<\/button>/gi, '')
          .replace(/class="[^"]*"/g, '')
          .replace(/style="[^"]*"/g, '')
          .replace(/data-[a-z-]+="[^"]*"/g, '')
          .trim();
      }

      if (!content) {
        // Fallback: try to get any substantial content
        const fallbackMatch = html.match(/<div[^>]*>([\s\S]{500,}?)<\/div>/);
        content = fallbackMatch ? fallbackMatch[1] : '<p>Unable to extract article content. Please open in browser.</p>';
      }

      this._panel.webview.postMessage({
        command: 'acxPostData',
        post: {
          url,
          title: title || 'Untitled',
          author,
          date,
          content
        }
      });
    } catch (error) {
      this._panel.webview.postMessage({
        command: 'acxPostError',
        error: 'Failed to load article'
      });
    }
  }

  private _update(): void {
    this._panel.webview.html = this._getHtmlContent();
  }

  private _getHtmlContent(): string {
    const config = vscode.workspace.getConfiguration('touchgrass');
    const intensity = config.get<string>('brainrotIntensity', 'casual');
    const autoDetect = config.get<boolean>('autoDetect', true);
    const autoMinimize = config.get<boolean>('autoMinimize', true);
    const idleTimeout = config.get<number>('idleTimeout', 30);
    const casinoEnabled = config.get<boolean>('casinoEnabled', true);
    const earningRate = config.get<number>('earningRate', 1);
    const enableAchievements = config.get<boolean>('enableAchievements', true);

    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${this._panel.webview.cspSource} https: data:; frame-src https:;">
      <title>Touch Grass IDE</title>
      <style>
        /* ===== CSS CUSTOM PROPERTIES ===== */
        :root {
          /* Primary Orange Palette */
          --orange-primary: #FF6B35;
          --orange-hover: #FF8C42;
          --orange-soft: #FF9F6C;
          --orange-glow: rgba(255, 107, 53, 0.4);

          /* Whites & Creams */
          --white-pure: #FFFFFF;
          --white-cream: #FFF8F0;
          --white-soft: rgba(255, 255, 255, 0.9);

          /* Background Palette */
          --bg-deep: #1A1A2E;
          --bg-card: #16213E;
          --bg-elevated: #1F2947;

          /* Glass Effects */
          --glass-bg: rgba(255, 255, 255, 0.08);
          --glass-bg-solid: rgba(255, 255, 255, 0.12);
          --glass-border: rgba(255, 255, 255, 0.15);
          --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

          /* Accent Colors */
          --success: #4ADE80;
          --danger: #FF4757;
          --gold: #FFD93D;
          --purple: #A855F7;

          /* Text Colors */
          --text-primary: #FFFFFF;
          --text-secondary: rgba(255, 255, 255, 0.7);
          --text-muted: rgba(255, 255, 255, 0.5);

          /* Timing Functions */
          --bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
          --smooth: cubic-bezier(0.4, 0, 0.2, 1);
          --snappy: cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, var(--bg-deep) 0%, #0F0F1A 100%);
          color: var(--text-primary);
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* ===== GLASSMORPHISM BASE ===== */
        .glass-card {
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          box-shadow: var(--glass-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        /* ===== HEADER ===== */
        .header {
          text-align: center;
          padding: 16px 16px 12px;
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--glass-border);
          position: relative;
        }
        .header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--orange-primary), transparent);
          opacity: 0.6;
        }
        .header h1 {
          font-size: 20px;
          color: var(--orange-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .header h1 .grass-icon {
          display: inline-block;
          animation: wiggle 2s ease-in-out infinite;
        }
        .status {
          font-size: 12px;
          color: var(--orange-soft);
          margin-top: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          background: var(--orange-primary);
          border-radius: 50%;
          animation: pulse-glow 1.5s ease-in-out infinite;
        }

        /* ===== TAB NAVIGATION ===== */
        .tab-nav {
          display: flex;
          gap: 4px;
          padding: 8px 12px;
          background: var(--glass-bg);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-bottom: 1px solid var(--glass-border);
          position: relative;
        }
        .tab-btn {
          flex: 1;
          padding: 10px 8px;
          background: transparent;
          border: none;
          border-radius: 12px;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.3s var(--bounce);
          position: relative;
          overflow: hidden;
        }
        .tab-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--orange-primary);
          opacity: 0;
          border-radius: 12px;
          transition: opacity 0.3s ease;
        }
        .tab-btn span {
          position: relative;
          z-index: 1;
        }
        .tab-btn:hover {
          color: var(--white-pure);
          transform: translateY(-2px);
        }
        .tab-btn:hover::before {
          opacity: 0.15;
        }
        .tab-btn.active {
          color: var(--white-pure);
          background: var(--orange-primary);
          box-shadow: 0 4px 15px var(--orange-glow);
        }
        .tab-btn.active:hover {
          transform: translateY(-2px) scale(1.02);
        }
        .tab-btn:active {
          transform: translateY(0) scale(0.98);
        }

        .tab-panel {
          display: none;
          padding: 16px;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .tab-panel.active {
          display: block;
          opacity: 1;
          transform: translateY(0);
          animation: slideUpBounce 0.4s var(--bounce);
        }

        /* ===== GAMES TAB ===== */
        .game-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .game-card {
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 20px 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s var(--bounce);
          position: relative;
          overflow: hidden;
        }
        .game-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, var(--orange-primary), var(--orange-hover));
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 0;
        }
        .game-card:hover {
          transform: translateY(-8px) scale(1.02);
          border-color: var(--orange-primary);
          box-shadow: 0 12px 30px var(--orange-glow);
        }
        .game-card:hover::before {
          opacity: 0.1;
        }
        .game-card:hover .game-icon {
          animation: bounce 0.5s var(--bounce);
        }
        .game-card:active {
          transform: translateY(-4px) scale(0.98);
        }
        .game-icon {
          font-size: 36px;
          display: block;
          margin-bottom: 8px;
          position: relative;
          z-index: 1;
          transition: transform 0.3s var(--bounce);
        }
        .game-name {
          font-weight: 600;
          display: block;
          font-size: 15px;
          color: var(--white-pure);
          position: relative;
          z-index: 1;
          margin-bottom: 4px;
        }
        .game-highscore {
          font-size: 11px;
          color: var(--text-muted);
          position: relative;
          z-index: 1;
        }
        .game-container {
          display: none;
          text-align: center;
        }
        .game-container.active {
          display: block;
          animation: scaleIn 0.3s var(--bounce);
        }
        #game-canvas {
          background: var(--bg-card);
          border-radius: 12px;
          max-width: 100%;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .game-ui {
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: var(--glass-bg);
          border-radius: 12px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .game-score {
          font-size: 18px;
          font-weight: 700;
          color: var(--orange-primary);
        }

        /* ===== SETTINGS TAB ===== */
        .settings-container { padding: 8px 0; }
        .settings-section {
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .settings-section-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--orange-primary);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid var(--glass-border);
          transition: background 0.2s ease;
        }
        .setting-row:last-child { border-bottom: none; }
        .setting-row:hover {
          background: rgba(255, 255, 255, 0.03);
          margin: 0 -8px;
          padding-left: 8px;
          padding-right: 8px;
          border-radius: 8px;
        }
        .setting-info { flex: 1; }
        .setting-label { font-size: 14px; color: var(--white-pure); font-weight: 500; }
        .setting-desc { font-size: 11px; color: var(--text-muted); margin-top: 3px; }
        .setting-control { margin-left: 16px; }

        /* Toggle switch - Orange themed with bounce */
        .toggle {
          position: relative;
          width: 48px;
          height: 26px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 13px;
          cursor: pointer;
          transition: all 0.3s var(--bounce);
          border: 1px solid var(--glass-border);
        }
        .toggle:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .toggle.active {
          background: var(--orange-primary);
          border-color: var(--orange-primary);
          box-shadow: 0 0 15px var(--orange-glow);
        }
        .toggle::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          background: var(--white-pure);
          border-radius: 50%;
          top: 2px;
          left: 3px;
          transition: transform 0.3s var(--bounce);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .toggle.active::after {
          transform: translateX(22px);
        }

        /* Select dropdown */
        .setting-select {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          color: var(--white-pure);
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .setting-select:hover {
          border-color: var(--orange-primary);
        }
        .setting-select:focus {
          outline: none;
          border-color: var(--orange-primary);
          box-shadow: 0 0 0 2px var(--orange-glow);
        }

        /* Slider - Orange themed */
        .setting-slider {
          width: 100px;
          height: 6px;
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
          cursor: pointer;
        }
        .setting-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          background: var(--orange-primary);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 6px var(--orange-glow);
          transition: transform 0.2s var(--bounce);
        }
        .setting-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .slider-value {
          font-size: 12px;
          color: var(--orange-primary);
          min-width: 35px;
          text-align: right;
          margin-left: 8px;
          font-weight: 600;
        }
        .slider-group { display: flex; align-items: center; }

        /* Danger button */
        .btn-danger {
          background: var(--danger);
          color: var(--white-pure);
          border: none;
          transition: all 0.3s var(--bounce);
        }
        .btn-danger:hover {
          background: #FF5A68;
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(255, 71, 87, 0.4);
        }
        .settings-footer {
          text-align: center;
          padding: 20px 16px;
          color: var(--text-muted);
          font-size: 11px;
          border-top: 1px solid var(--glass-border);
          margin-top: 8px;
        }
        .settings-footer a {
          color: var(--orange-primary);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s ease;
        }
        .settings-footer a:hover {
          color: var(--orange-hover);
          text-decoration: underline;
        }

        /* ===== POMODORO TAB ===== */
        .pomodoro-container {
          text-align: center;
          padding: 20px;
        }
        .pomodoro-timer-ring {
          width: 200px;
          height: 200px;
          margin: 0 auto 20px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--glass-bg);
          border-radius: 50%;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 2px solid var(--glass-border);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 60px rgba(255, 107, 53, 0.1);
        }
        .pomodoro-timer-ring::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 3px solid transparent;
          border-top-color: var(--orange-primary);
          animation: spin 3s linear infinite;
          opacity: 0.5;
        }
        .pomodoro-mode {
          font-size: 11px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .pomodoro-mode.work { color: var(--orange-primary); }
        .pomodoro-mode.break { color: var(--success); }
        .pomodoro-timer {
          font-size: 52px;
          font-weight: 800;
          font-family: 'SF Mono', Monaco, monospace;
          color: var(--white-pure);
          letter-spacing: -2px;
        }
        .pomodoro-controls {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin: 24px 0;
        }
        .pomodoro-stats {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin: 24px 0;
          padding: 16px;
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
        }
        .pomo-stat {
          text-align: center;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          transition: transform 0.3s var(--bounce);
        }
        .pomo-stat:hover {
          transform: translateY(-4px);
        }
        .pomo-stat-value {
          display: block;
          font-size: 24px;
          font-weight: 800;
          color: var(--orange-primary);
        }
        .pomo-stat-label {
          display: block;
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .pomodoro-info {
          color: var(--text-muted);
          font-size: 12px;
          margin-top: 20px;
          padding: 12px;
          background: var(--glass-bg);
          border-radius: 12px;
        }
        .pomodoro-info p { margin: 4px 0; }

        /* ===== BUTTONS ===== */
        .btn {
          background: var(--orange-primary);
          color: var(--white-pure);
          border: none;
          padding: 10px 20px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.3s var(--bounce);
          position: relative;
          overflow: hidden;
        }
        .btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.4s ease, height 0.4s ease;
        }
        .btn:hover {
          background: var(--orange-hover);
          transform: translateY(-3px);
          box-shadow: 0 8px 20px var(--orange-glow);
        }
        .btn:hover::before {
          width: 200px;
          height: 200px;
        }
        .btn:active {
          transform: translateY(-1px) scale(0.98);
        }
        .btn-secondary {
          background: var(--glass-bg);
          color: var(--text-secondary);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .btn-secondary:hover {
          background: var(--glass-bg-solid);
          color: var(--white-pure);
          border-color: var(--orange-primary);
          box-shadow: 0 4px 15px rgba(255, 107, 53, 0.2);
        }

        /* Casino */
        .casino-header {
          text-align: center;
          padding: 16px;
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          margin-bottom: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        .balance-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 28px;
          font-weight: bold;
        }
        .balance-icon {
          font-size: 32px;
        }
        .balance-amount {
          color: var(--success);
          text-shadow: 0 0 20px rgba(74, 222, 128, 0.5);
          font-family: 'Courier New', monospace;
        }
        .balance-label {
          color: var(--success);
          font-size: 12px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          letter-spacing: 1px;
          opacity: 0.9;
        }
        .casino-card {
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          transition: all 0.3s var(--bounce);
        }
        .casino-card:hover {
          border-color: var(--gold);
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 12px 30px rgba(255, 217, 61, 0.3);
        }
        .casino-controls {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
          margin: 16px 0;
        }
        .casino-ui {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding: 12px;
          background: var(--glass-bg);
          border-radius: 12px;
          border: 1px solid var(--glass-border);
        }
        .bet-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .bet-controls input {
          width: 90px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.05);
          color: var(--white-pure);
          text-align: center;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
        }
        .bet-controls input:focus {
          outline: none;
          border-color: var(--gold);
          box-shadow: 0 0 15px rgba(255, 217, 61, 0.3);
        }
        .casino-info {
          text-align: center;
          color: var(--white-cream);
          font-size: 12px;
          margin-top: 16px;
          padding: 16px;
          background: var(--glass-bg);
          backdrop-filter: blur(8px);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          opacity: 0.8;
        }
        .casino-info p { margin: 6px 0; }
        .btn-bet {
          background: linear-gradient(135deg, var(--gold) 0%, #f59e0b 100%);
          color: var(--bg-deep);
          font-weight: 700;
          padding: 12px 24px;
          border-radius: 12px;
          border: none;
          transition: all 0.3s var(--bounce);
          box-shadow: 0 4px 15px rgba(255, 217, 61, 0.3);
        }
        .btn-bet:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 8px 25px rgba(255, 217, 61, 0.5);
        }
        .btn-bet:active {
          transform: translateY(-1px) scale(0.98);
        }
        .btn-bet:disabled {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.3);
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }
        .casino-result {
          text-align: center;
          padding: 24px;
          font-size: 28px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--glass-bg);
          margin-top: 16px;
        }
        .casino-result.win {
          color: var(--success);
          text-shadow: 0 0 20px rgba(74, 222, 128, 0.5);
          animation: winPulse 0.5s ease;
        }
        .casino-result.lose {
          color: var(--danger);
          animation: shake 0.4s ease;
        }

        /* Game Over */
        .game-over-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(26, 26, 46, 0.9);
          display: none;
          justify-content: center;
          align-items: center;
          z-index: 100;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .game-over-overlay.active {
          display: flex;
          animation: fadeIn 0.3s ease;
        }
        .game-over-content {
          background: var(--glass-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--glass-border);
          padding: 40px;
          border-radius: 24px;
          text-align: center;
          animation: slideUpBounce 0.5s var(--bounce);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          max-width: 320px;
          width: 90%;
        }
        .game-over-content h2 {
          font-size: 28px;
          margin-bottom: 8px;
          color: var(--white-pure);
        }
        .final-score {
          font-size: 56px;
          font-weight: bold;
          color: var(--orange-primary);
          margin: 20px 0;
          text-shadow: 0 0 30px var(--orange-glow);
          animation: counterBump 0.5s ease;
        }
        .final-score.new-record {
          color: var(--gold);
          animation: winPulse 0.6s ease infinite;
          text-shadow: 0 0 40px rgba(255, 217, 61, 0.6);
        }
        .game-over-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          margin-top: 24px;
        }
        .game-over-buttons .btn {
          padding: 14px 28px;
          font-size: 15px;
          border-radius: 14px;
        }

        /* ===== ANIMATIONS & TRANSITIONS ===== */
        /* Keyframe Animations */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes winPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes scorePop { 0% { transform: scale(1); } 50% { transform: scale(1.4); color: var(--orange-primary); } 100% { transform: scale(1); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 5px var(--orange-glow); } 50% { box-shadow: 0 0 20px rgba(255, 107, 53, 0.6); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes coinDrop { 0% { transform: translateY(-50px) rotate(0deg); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(0) rotate(720deg); opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes flash { 0%, 50%, 100% { opacity: 1; } 25%, 75% { opacity: 0.3; } }

        /* New playful animations */
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px var(--orange-glow); }
          50% { box-shadow: 0 0 40px rgba(255, 107, 53, 0.8); }
        }
        @keyframes slideUpBounce {
          0% { transform: translateY(30px); opacity: 0; }
          60% { transform: translateY(-8px); opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-100px) rotate(720deg); opacity: 0; }
        }
        @keyframes ripple {
          0% { transform: scale(0); opacity: 0.6; }
          100% { transform: scale(4); opacity: 0; }
        }
        @keyframes counterBump {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes shine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes iconBounce {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.2); }
          50% { transform: scale(0.9); }
          75% { transform: scale(1.1); }
        }

        /* Enhanced Transitions */
        .tab-btn, .game-card, .btn, .casino-card {
          transition: all 0.3s var(--bounce);
        }
        .tab-btn:hover {
          background: rgba(255, 107, 53, 0.2);
          transform: translateY(-2px);
        }
        .tab-btn:active { transform: translateY(0) scale(0.95); }
        .tab-btn.active:hover { transform: translateY(-2px); }
        .game-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 12px 35px var(--orange-glow);
          border-color: var(--orange-primary);
        }
        .game-card:active { transform: translateY(-4px) scale(0.98); }
        .game-card:hover .game-icon {
          animation: iconBounce 0.5s ease;
        }
        .btn:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 8px 20px var(--orange-glow);
        }
        .btn:active { transform: translateY(-1px) scale(0.95); }

        /* Tab panel transitions */
        .tab-panel {
          animation: slideUpBounce 0.4s var(--bounce);
        }

        /* Win/Lose Effects */
        .win-effect { animation: winPulse 0.4s ease 3; }
        .lose-effect { animation: shake 0.4s ease; }
        .score-pop { animation: scorePop 0.3s ease; }

        /* Balance animations */
        .balance-amount { transition: all 0.3s ease; }
        .balance-amount.increase {
          color: var(--success);
          animation: scorePop 0.3s ease;
          text-shadow: 0 0 15px rgba(74, 222, 128, 0.5);
        }
        .balance-amount.decrease {
          color: var(--danger);
          animation: shake 0.3s ease;
        }

        /* Game card glow on hover */
        .game-card::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 18px;
          background: linear-gradient(45deg, var(--orange-primary), var(--orange-hover), var(--orange-primary));
          background-size: 200% 200%;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: -1;
          animation: shine 3s linear infinite;
        }
        .game-card { position: relative; overflow: visible; }
        .game-card:hover::before { opacity: 0.6; }
        .casino-card::before {
          background: linear-gradient(45deg, var(--gold), #f59e0b, var(--gold));
          background-size: 200% 200%;
        }

        /* High score highlight */
        .new-high-score {
          animation: winPulse 0.5s ease infinite;
          color: var(--gold) !important;
          text-shadow: 0 0 20px rgba(255, 217, 61, 0.5);
        }

        /* Loading spinner */
        .loading { animation: spin 1s linear infinite; }

        /* Interactive hover glow effect */
        .hover-glow {
          transition: all 0.3s var(--bounce);
        }
        .hover-glow:hover {
          box-shadow: 0 0 30px var(--orange-glow);
        }

        /* ===== READING TAB ===== */
        .reading-container {
          padding: 0;
        }
        .reading-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--glass-bg);
          border-bottom: 1px solid var(--glass-border);
          position: sticky;
          top: 0;
          z-index: 10;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .reading-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--orange-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .reading-source-tabs {
          display: flex;
          gap: 4px;
        }
        .source-btn {
          padding: 6px 12px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s var(--bounce);
        }
        .source-btn:hover {
          background: var(--glass-bg-solid);
          color: var(--white-pure);
          transform: translateY(-1px);
        }
        .source-btn.active {
          background: var(--orange-primary);
          color: var(--white-pure);
          border-color: var(--orange-primary);
          box-shadow: 0 2px 8px var(--orange-glow);
        }
        .article-list {
          padding: 8px;
          max-height: calc(100vh - 220px);
          overflow-y: auto;
        }
        .article-item {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s var(--bounce);
          position: relative;
        }
        .article-item:hover {
          transform: translateX(4px);
          border-color: var(--orange-primary);
          background: var(--glass-bg-solid);
        }
        .article-item:active {
          transform: translateX(2px) scale(0.99);
        }
        .article-score {
          position: absolute;
          left: 14px;
          top: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: var(--orange-primary);
          font-size: 11px;
          font-weight: 700;
          min-width: 32px;
        }
        .article-score .arrow {
          font-size: 10px;
          margin-bottom: 2px;
        }
        .article-content {
          margin-left: 40px;
        }
        .article-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--white-pure);
          line-height: 1.4;
          margin-bottom: 6px;
        }
        .article-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          font-size: 10px;
          color: var(--text-muted);
        }
        .article-meta span {
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .article-domain {
          color: var(--text-secondary);
        }
        .reading-loading {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-muted);
        }
        .reading-loading .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--glass-border);
          border-top-color: var(--orange-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px;
        }
        .reading-error {
          text-align: center;
          padding: 40px 20px;
          color: var(--danger);
        }
        .reading-error .retry-btn {
          margin-top: 12px;
        }
        .reading-load-more {
          width: 100%;
          padding: 12px;
          margin-top: 4px;
          background: var(--glass-bg);
          border: 1px dashed var(--glass-border);
          border-radius: 12px;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }
        .reading-load-more:hover {
          background: var(--glass-bg-solid);
          color: var(--white-pure);
          border-style: solid;
          border-color: var(--orange-primary);
        }
        .article-item.no-score .article-content {
          margin-left: 0;
        }
        .article-item.no-score .article-score {
          display: none;
        }

        /* ===== ARTICLE DETAIL VIEW ===== */
        .article-detail {
          display: none;
          flex-direction: column;
          height: 100%;
        }
        .article-detail.active {
          display: flex;
        }
        .article-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          background: var(--glass-bg);
          border-bottom: 1px solid var(--glass-border);
          position: sticky;
          top: 0;
          z-index: 10;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s var(--bounce);
        }
        .back-btn:hover {
          background: var(--glass-bg-solid);
          color: var(--white-pure);
          transform: translateX(-2px);
        }
        .open-external-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background: transparent;
          border: 1px solid var(--glass-border);
          border-radius: 6px;
          color: var(--text-muted);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .open-external-btn:hover {
          border-color: var(--orange-primary);
          color: var(--orange-primary);
        }
        .article-detail-title {
          padding: 16px;
          border-bottom: 1px solid var(--glass-border);
        }
        .article-detail-title h2 {
          font-size: 16px;
          font-weight: 600;
          color: var(--white-pure);
          line-height: 1.4;
          margin: 0 0 8px 0;
        }
        .article-detail-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 11px;
          color: var(--text-muted);
        }
        .article-detail-meta .score {
          color: var(--orange-primary);
          font-weight: 600;
        }
        .article-detail-meta .author {
          color: var(--text-secondary);
        }

        /* HN-specific: Article/Discussion tabs */
        .hn-view-tabs {
          display: flex;
          gap: 4px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--glass-border);
        }
        .hn-view-btn {
          flex: 1;
          padding: 10px 16px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s var(--bounce);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .hn-view-btn:hover {
          background: var(--glass-bg-solid);
          color: var(--white-pure);
        }
        .hn-view-btn.active {
          background: var(--orange-primary);
          color: var(--white-pure);
          border-color: var(--orange-primary);
        }
        .hn-view-btn .count {
          background: rgba(255,255,255,0.2);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
        }

        /* Article content area */
        .article-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }
        .article-body.iframe-container {
          padding: 0;
        }
        .article-body iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: #fff;
        }
        .article-text-content {
          font-size: 14px;
          line-height: 1.7;
          color: var(--text-primary);
        }
        .article-text-content p {
          margin: 0 0 16px 0;
        }
        .article-text-content h1, .article-text-content h2, .article-text-content h3 {
          color: var(--white-pure);
          margin: 24px 0 12px 0;
        }
        .article-text-content h1 { font-size: 20px; }
        .article-text-content h2 { font-size: 17px; }
        .article-text-content h3 { font-size: 15px; }
        .article-text-content a {
          color: var(--orange-primary);
          text-decoration: none;
        }
        .article-text-content a:hover {
          text-decoration: underline;
        }
        .article-text-content blockquote {
          border-left: 3px solid var(--orange-primary);
          margin: 16px 0;
          padding: 8px 16px;
          background: var(--glass-bg);
          border-radius: 0 8px 8px 0;
          color: var(--text-secondary);
          font-style: italic;
        }
        .article-text-content ul, .article-text-content ol {
          margin: 12px 0;
          padding-left: 24px;
        }
        .article-text-content li {
          margin: 6px 0;
        }
        .article-text-content pre, .article-text-content code {
          background: var(--glass-bg-solid);
          border-radius: 4px;
          font-family: monospace;
        }
        .article-text-content pre {
          padding: 12px;
          overflow-x: auto;
          margin: 12px 0;
        }
        .article-text-content code {
          padding: 2px 6px;
          font-size: 13px;
        }
        .article-text-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 12px 0;
        }

        /* HN Post text (Ask HN, Show HN, etc.) */
        .hn-post-text {
          background: var(--glass-bg);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-primary);
        }
        .hn-post-text a {
          color: var(--orange-primary);
        }

        /* Comment thread styles */
        .comment-thread {
          padding: 0;
        }
        .comment {
          padding: 12px 0;
          border-bottom: 1px solid var(--glass-border);
        }
        .comment:last-child {
          border-bottom: none;
        }
        .comment-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .comment-author {
          color: var(--orange-primary);
          font-weight: 600;
          font-size: 12px;
        }
        .comment-time {
          color: var(--text-muted);
          font-size: 11px;
        }
        .comment-score {
          color: var(--text-secondary);
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .comment-body {
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-primary);
        }
        .comment-body p {
          margin: 0 0 8px 0;
        }
        .comment-body p:last-child {
          margin-bottom: 0;
        }
        .comment-body a {
          color: var(--orange-primary);
          word-break: break-all;
        }
        .comment-body code {
          background: var(--glass-bg-solid);
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 12px;
        }
        .comment-body pre {
          background: var(--glass-bg-solid);
          padding: 8px 12px;
          border-radius: 6px;
          overflow-x: auto;
          margin: 8px 0;
        }

        /* Nested replies */
        .comment-replies {
          margin-left: 16px;
          padding-left: 12px;
          border-left: 2px solid var(--glass-border);
        }
        .comment-replies .comment {
          padding: 10px 0;
        }
        .comment-replies .comment-replies {
          border-left-color: rgba(255,165,0,0.3);
        }
        .comment-replies .comment-replies .comment-replies {
          border-left-color: rgba(255,165,0,0.15);
        }

        /* More comments indicator */
        .more-replies {
          padding: 8px 12px;
          color: var(--text-muted);
          font-size: 11px;
          font-style: italic;
        }

        /* Empty state */
        .no-comments {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-muted);
        }

        /* Reader view loading state */
        .reader-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: var(--text-muted);
        }
        .reader-loading .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--glass-border);
          border-top-color: var(--orange-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        /* Article open in browser prompt */
        .open-in-browser {
          text-align: center;
          padding: 40px 20px;
        }
        .open-in-browser p {
          color: var(--text-muted);
          margin-bottom: 16px;
          font-size: 13px;
        }
        .open-in-browser .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
      </style>
    </head>
    <body class="intensity-${intensity}">
      <div class="header">
        <h1>🌿 Touch Grass IDE</h1>
        <div class="status">AI is cooking...</div>
      </div>

      <nav class="tab-nav">
        <button class="tab-btn active" data-tab="pomodoro">🍅 Pomodoro</button>
        <button class="tab-btn" data-tab="reading">📰 Reading</button>
        <button class="tab-btn" data-tab="games">🎮 Games</button>
        <button class="tab-btn" data-tab="settings">⚙️ Settings</button>
      </nav>

      <!-- Games Tab -->
      <section id="games-tab" class="tab-panel">
        <div class="casino-header">
          <div class="balance-display">
            <span class="balance-icon">🌿</span>
            <span class="balance-amount" id="casino-balance">0</span>
            <span class="balance-label">$GRASS</span>
          </div>
        </div>
        <div id="game-selection" class="game-grid">
          <div class="game-card" data-game="snake">
            <span class="game-icon">🐍</span>
            <span class="game-name">Snake</span>
            <span class="game-highscore">High: <span id="snake-high">0</span></span>
          </div>
          <div class="game-card" data-game="flappy">
            <span class="game-icon">🐦</span>
            <span class="game-name">Flappy</span>
            <span class="game-highscore">High: <span id="flappy-high">0</span></span>
          </div>
          <div class="game-card casino-card" data-game="plinko">
            <span class="game-icon">🎱</span>
            <span class="game-name">Plinko</span>
            <span class="game-highscore">Let it cook</span>
          </div>
          <div class="game-card casino-card" data-game="slots">
            <span class="game-icon">🎰</span>
            <span class="game-name">Slots</span>
            <span class="game-highscore">Feeling lucky?</span>
          </div>
        </div>
        <div id="game-container" class="game-container">
          <canvas id="game-canvas" width="320" height="400"></canvas>
          <div class="game-controls" id="game-controls"></div>
          <div class="game-ui">
            <span class="game-score">Score: <span id="current-score">0</span></span>
            <div class="bet-controls" id="bet-controls" style="display: none;">
              <label>Bet: </label>
              <input type="number" id="bet-amount" value="10" min="1" step="10">
              <span>$GRASS</span>
            </div>
            <button class="btn btn-secondary" id="back-btn">← Back</button>
          </div>
        </div>
        <div class="casino-info">
          <p>🌿 Stack <strong>$GRASS</strong> during Pomodoro work sessions</p>
          <p>🍅 WAGMI - start a timer to begin your sigma grind</p>
        </div>
      </section>

      <!-- Pomodoro Tab -->
      <section id="pomodoro-tab" class="tab-panel active">
        <div class="pomodoro-container">
          <div class="pomodoro-mode" id="pomodoro-mode">Grind Mode</div>
          <div class="pomodoro-timer" id="pomodoro-timer">25:00</div>
          <div class="pomodoro-controls">
            <button class="btn btn-secondary" id="pomo-reset-btn">Reset</button>
            <button class="btn" id="pomo-toggle-btn">Start</button>
            <button class="btn btn-secondary" id="pomo-skip-btn">Skip</button>
          </div>
          <div class="pomodoro-stats">
            <div class="pomo-stat">
              <span class="pomo-stat-value" id="pomo-sessions">0</span>
              <span class="pomo-stat-label">Sessions</span>
            </div>
            <div class="pomo-stat">
              <span class="pomo-stat-value" id="pomo-work-time">0m</span>
              <span class="pomo-stat-label">Grind Time</span>
            </div>
            <div class="pomo-stat">
              <span class="pomo-stat-value" id="pomo-break-time">0m</span>
              <span class="pomo-stat-label">Grass Time</span>
            </div>
          </div>
          <div class="pomodoro-info">
            <p>🍅 <strong>Pomodoro Technique</strong></p>
            <p>25 min work → 5 min break</p>
            <p>Every 4 sessions: 15 min long break</p>
          </div>
        </div>
      </section>

      <!-- Reading Tab -->
      <section id="reading-tab" class="tab-panel">
        <!-- List View -->
        <div id="reading-list-view" class="reading-container">
          <div class="reading-header">
            <div class="reading-title">
              <span>📰</span>
              <span id="reading-source-title">Hacker News</span>
            </div>
            <div class="reading-source-tabs">
              <button class="source-btn active" data-source="hn">HN</button>
              <button class="source-btn" data-source="lw">LW</button>
              <button class="source-btn" data-source="acx">ACX</button>
            </div>
          </div>
          <div id="reading-content" class="article-list">
            <div class="reading-loading">
              <div class="spinner"></div>
              <p>Select a source to load articles</p>
            </div>
          </div>
        </div>

        <!-- Detail View (hidden by default) -->
        <div id="reading-detail-view" class="article-detail">
          <div class="article-detail-header">
            <button class="back-btn" id="reading-back-btn">
              <span>←</span>
              <span>Back</span>
            </button>
            <button class="open-external-btn" id="reading-open-external">
              <span>↗</span>
              <span>Open</span>
            </button>
          </div>
          <div class="article-detail-title">
            <h2 id="detail-title">Article Title</h2>
            <div class="article-detail-meta" id="detail-meta">
              <!-- Dynamic meta info -->
            </div>
          </div>
          <!-- HN-only: Article/Discussion tabs -->
          <div class="hn-view-tabs" id="hn-view-tabs" style="display: none;">
            <button class="hn-view-btn active" data-view="article">
              <span>📄</span>
              <span>Article</span>
            </button>
            <button class="hn-view-btn" data-view="discussion">
              <span>💬</span>
              <span>Discussion</span>
              <span class="count" id="hn-comment-count">0</span>
            </button>
          </div>
          <div class="article-body" id="detail-body">
            <!-- Dynamic content -->
          </div>
        </div>
      </section>

      <!-- Settings Tab -->
      <section id="settings-tab" class="tab-panel">
        <div class="settings-container">
          <!-- Behavior Section -->
          <div class="settings-section">
            <div class="settings-section-title">Behavior</div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Auto-detect AI generation</div>
                <div class="setting-desc">Show panel when AI starts generating</div>
              </div>
              <div class="setting-control">
                <div class="toggle ${autoDetect ? 'active' : ''}" id="setting-autodetect"></div>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Auto-minimize</div>
                <div class="setting-desc">Hide panel when AI finishes</div>
              </div>
              <div class="setting-control">
                <div class="toggle ${autoMinimize ? 'active' : ''}" id="setting-autominimize"></div>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Idle timeout</div>
                <div class="setting-desc">Seconds before considered idle</div>
              </div>
              <div class="setting-control">
                <div class="slider-group">
                  <input type="range" class="setting-slider" id="setting-idle" min="10" max="120" value="${idleTimeout}">
                  <span class="slider-value" id="idle-value">${idleTimeout}s</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Audio Section -->
          <div class="settings-section">
            <div class="settings-section-title">Audio</div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Sound effects</div>
                <div class="setting-desc">Play sounds in games</div>
              </div>
              <div class="setting-control">
                <div class="toggle active" id="setting-sound"></div>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Volume</div>
                <div class="setting-desc">Sound effects volume</div>
              </div>
              <div class="setting-control">
                <div class="slider-group">
                  <input type="range" class="setting-slider" id="setting-volume" min="0" max="100" value="30">
                  <span class="slider-value" id="volume-value">30%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Economy Section -->
          <div class="settings-section">
            <div class="settings-section-title">Economy</div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Casino games</div>
                <div class="setting-desc">Enable Plinko & Slots with betting</div>
              </div>
              <div class="setting-control">
                <div class="toggle ${casinoEnabled ? 'active' : ''}" id="setting-casino"></div>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Mining rate</div>
                <div class="setting-desc">$GRASS mined per second during Pomodoro</div>
              </div>
              <div class="setting-control">
                <div class="slider-group">
                  <input type="range" class="setting-slider" id="setting-earning" min="1" max="10" value="${earningRate}">
                  <span class="slider-value" id="earning-value">${earningRate}/s</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Notifications Section -->
          <div class="settings-section">
            <div class="settings-section-title">Notifications</div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Achievement popups</div>
                <div class="setting-desc">Show notifications when unlocking achievements</div>
              </div>
              <div class="setting-control">
                <div class="toggle ${enableAchievements ? 'active' : ''}" id="setting-achievements"></div>
              </div>
            </div>
          </div>

          <!-- Appearance Section -->
          <div class="settings-section">
            <div class="settings-section-title">Appearance</div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Brainrot intensity</div>
                <div class="setting-desc">How cooked are you?</div>
              </div>
              <div class="setting-control">
                <select class="setting-select" id="setting-intensity">
                  <option value="touching-grass" ${intensity === 'touching-grass' ? 'selected' : ''}>Touching Grass</option>
                  <option value="casual" ${intensity === 'casual' ? 'selected' : ''}>Lowkey Cooked</option>
                  <option value="degenerate" ${intensity === 'degenerate' ? 'selected' : ''}>Fully Cooked</option>
                  <option value="terminal" ${intensity === 'terminal' ? 'selected' : ''}>Ohio Level</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Data Section -->
          <div class="settings-section">
            <div class="settings-section-title">Data</div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Reset all data</div>
                <div class="setting-desc">Clear stats, achievements, and balance</div>
              </div>
              <div class="setting-control">
                <button class="btn btn-danger" id="setting-reset">Reset</button>
              </div>
            </div>
          </div>

          <div class="settings-footer">
            Touch Grass IDE v1.2.0<br>
            <a href="https://github.com/anthropics/touch-grass-ide">GitHub</a> · Made with 🌿
          </div>
        </div>
      </section>


      <div id="game-over-overlay" class="game-over-overlay">
        <div class="game-over-content">
          <h2>Skill Issue</h2>
          <div class="final-score" id="final-score">0</div>
          <div class="game-over-buttons">
            <button class="btn" id="play-again-btn">Run It Back</button>
            <button class="btn btn-secondary" id="back-to-menu-btn">Back to Menu</button>
          </div>
        </div>
      </div>

      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        let currentGame = null;
        let gameInstance = null;

        // ===================== SOUND MANAGER =====================
        const SoundManager = {
          ctx: null,
          enabled: true,
          volume: 0.3,
          init() {
            if (!this.ctx) {
              try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
              } catch (e) {
                this.enabled = false;
              }
            }
          },
          play(type) {
            if (!this.enabled) return;
            if (!this.ctx) this.init();
            if (!this.ctx || this.ctx.state === 'suspended') {
              this.ctx?.resume();
              return;
            }
            try {
              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              osc.connect(gain);
              gain.connect(this.ctx.destination);
              const sounds = {
                eat: [440, 0.1, 'square', 1.5],
                crash: [150, 0.2, 'sawtooth', 0.5],
                merge: [520, 0.15, 'sine', 1.2],
                clear: [660, 0.25, 'triangle', 1.3],
                jump: [380, 0.08, 'square', 1.4],
                flip: [300, 0.1, 'sine', 1.0],
                spin: [200, 0.05, 'square', 1.0],
                win: [523, 0.3, 'sine', 1.5],
                bigwin: [659, 0.4, 'sine', 1.8],
                lose: [180, 0.25, 'sawtooth', 0.6],
                drop: [250, 0.08, 'triangle', 1.2],
                click: [600, 0.04, 'square', 1.0],
                move: [350, 0.05, 'sine', 1.0],
                lock: [220, 0.1, 'triangle', 0.8],
                levelup: [440, 0.3, 'sine', 1.4]
              };
              const [freq, dur, wave, pitchMult] = sounds[type] || [440, 0.1, 'sine', 1.0];
              osc.type = wave;
              osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(freq * pitchMult, this.ctx.currentTime + dur * 0.5);
              gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
              osc.start();
              osc.stop(this.ctx.currentTime + dur);
            } catch (e) { /* Audio error - ignore */ }
          },
          playSequence(notes, interval = 100) {
            notes.forEach((note, i) => {
              setTimeout(() => this.play(note), i * interval);
            });
          }
        };

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

        // Elements
        const gameSelection = document.getElementById('game-selection');
        const gameContainer = document.getElementById('game-container');
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas ? canvas.getContext('2d') : null;
        const currentScoreEl = document.getElementById('current-score');
        const backBtn = document.getElementById('back-btn');
        const gameOverOverlay = document.getElementById('game-over-overlay');
        const finalScoreEl = document.getElementById('final-score');
        const playAgainBtn = document.getElementById('play-again-btn');
        const backToMenuBtn = document.getElementById('back-to-menu-btn');
        // Init
        vscode.postMessage({ command: 'requestHighScores' });
        vscode.postMessage({ command: 'requestPomodoroState' });
        vscode.postMessage({ command: 'getBalance' });

        // Casino/betting elements
        const gameControls = document.getElementById('game-controls');
        const betControlsEl = document.getElementById('bet-controls');
        const betAmountInput = document.getElementById('bet-amount');
        const casinoBalanceEl = document.getElementById('casino-balance');
        let playerBalance = 0;
        const casinoGames = ['plinko', 'slots'];

        // Pomodoro elements
        const pomoTimerEl = document.getElementById('pomodoro-timer');
        const pomoModeEl = document.getElementById('pomodoro-mode');
        const pomoToggleBtn = document.getElementById('pomo-toggle-btn');
        const pomoResetBtn = document.getElementById('pomo-reset-btn');
        const pomoSkipBtn = document.getElementById('pomo-skip-btn');
        const pomoSessionsEl = document.getElementById('pomo-sessions');
        const pomoWorkTimeEl = document.getElementById('pomo-work-time');
        const pomoBreakTimeEl = document.getElementById('pomo-break-time');
        let pomodoroActive = false;

        pomoToggleBtn?.addEventListener('click', () => {
          vscode.postMessage({ command: pomodoroActive ? 'pomodoroPause' : 'pomodoroStart' });
        });
        pomoResetBtn?.addEventListener('click', () => {
          vscode.postMessage({ command: 'pomodoroReset' });
        });
        pomoSkipBtn?.addEventListener('click', () => {
          vscode.postMessage({ command: 'pomodoroSkip' });
        });

        // Tab switching with smooth transitions
        document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const currentTab = document.querySelector('.tab-panel.active');
            const nextTab = document.getElementById(btn.dataset.tab + '-tab');

            if (!nextTab || currentTab === nextTab) return;

            // Fade out current tab
            if (currentTab) {
              currentTab.style.opacity = '0';
              currentTab.style.transform = 'translateY(10px)';
            }

            setTimeout(() => {
              document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
              document.querySelectorAll('.tab-panel').forEach(p => {
                p.classList.remove('active');
                p.style.opacity = '0';
                p.style.transform = 'translateY(10px)';
              });
              btn.classList.add('active');
              nextTab.classList.add('active');

              // Fade in new tab
              requestAnimationFrame(() => {
                nextTab.style.opacity = '1';
                nextTab.style.transform = 'translateY(0)';
              });

              // Initialize Reading tab on first open
              if (btn.dataset.tab === 'reading' && !readingState.initialized) {
                readingState.initialized = true;
                fetchReadingData('hn');
              }
            }, 150);
          });
        });

        // Animated balance counter
        let displayedBalance = 0;
        let balanceAnimationId = null;
        function animateBalance(targetBalance) {
          if (balanceAnimationId) cancelAnimationFrame(balanceAnimationId);
          if (!casinoBalanceEl) return;

          const startBalance = displayedBalance;
          const diff = targetBalance - startBalance;
          const duration = Math.min(500, Math.abs(diff) * 10);
          const startTime = performance.now();

          // Flash color based on change
          if (diff > 0) {
            casinoBalanceEl.style.color = '#4ade80';
            casinoBalanceEl.style.textShadow = '0 0 10px rgba(74, 222, 128, 0.5)';
          } else if (diff < 0) {
            casinoBalanceEl.style.color = '#ef4444';
            casinoBalanceEl.style.textShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
          }

          function step(currentTime) {
            if (!casinoBalanceEl) return;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic

            displayedBalance = Math.round(startBalance + diff * eased);
            casinoBalanceEl.textContent = displayedBalance.toLocaleString();

            if (progress < 1) {
              balanceAnimationId = requestAnimationFrame(step);
            } else {
              displayedBalance = targetBalance;
              casinoBalanceEl.textContent = targetBalance.toLocaleString();
              // Reset color
              setTimeout(() => {
                if (casinoBalanceEl) {
                  casinoBalanceEl.style.color = '#fbbf24';
                  casinoBalanceEl.style.textShadow = 'none';
                }
              }, 300);
            }
          }
          balanceAnimationId = requestAnimationFrame(step);
        }

        // Messages from extension
        window.addEventListener('message', event => {
          const msg = event.data;
          if (msg.command === 'highScoresUpdate') {
            const snakeEl = document.getElementById('snake-high');
            const el2048 = document.getElementById('2048-high');
            const flappyEl = document.getElementById('flappy-high');
            const tetrisEl = document.getElementById('tetris-high');
            if (snakeEl) snakeEl.textContent = msg.highScores.snake || 0;
            if (el2048) el2048.textContent = msg.highScores['2048'] || 0;
            if (flappyEl) flappyEl.textContent = msg.highScores.flappy || 0;
            if (tetrisEl) tetrisEl.textContent = msg.highScores.tetris || 0;
          } else if (msg.command === 'pomodoroUpdate') {
            if (pomoTimerEl) pomoTimerEl.textContent = msg.formattedTime;
            pomodoroActive = msg.state.isActive;
            if (pomoToggleBtn) pomoToggleBtn.textContent = msg.state.isActive ? 'Pause' : 'Start';
            const modeText = msg.state.mode === 'work' ? 'Grind Mode' : (msg.state.mode === 'longBreak' ? 'Touch Grass' : 'Quick Break');
            if (pomoModeEl) {
              pomoModeEl.textContent = modeText;
              pomoModeEl.className = 'pomodoro-mode ' + (msg.state.mode === 'work' ? 'work' : 'break');
            }
            if (pomoSessionsEl) pomoSessionsEl.textContent = msg.stats.sessions;
            if (pomoWorkTimeEl) pomoWorkTimeEl.textContent = msg.stats.workTime;
            if (pomoBreakTimeEl) pomoBreakTimeEl.textContent = msg.stats.breakTime;
          } else if (msg.command === 'balanceUpdate') {
            playerBalance = msg.balance;
            animateBalance(msg.balance);
          } else if (msg.command === 'betResult') {
            if (msg.success) {
              playerBalance = msg.balance;
              animateBalance(msg.balance);
            }
          } else if (msg.command === 'hackerNewsData') {
            readingState.loading = false;
            if (msg.page === 0) {
              readingState.hnStories = msg.stories;
            } else {
              readingState.hnStories = [...readingState.hnStories, ...msg.stories];
            }
            readingState.hnHasMore = msg.hasMore;
            if (readingState.currentSource === 'hn') {
              renderHackerNews();
            }
          } else if (msg.command === 'hackerNewsError') {
            readingState.loading = false;
            if (readingState.currentSource === 'hn') {
              renderReadingError(msg.error);
            }
          } else if (msg.command === 'lessWrongData') {
            readingState.lwItems = msg.items;
            readingState.loading = false;
            if (readingState.currentSource === 'lw') {
              renderRssItems(readingState.lwItems, 'lw');
            }
          } else if (msg.command === 'lessWrongError') {
            readingState.loading = false;
            if (readingState.currentSource === 'lw') {
              renderReadingError(msg.error);
            }
          } else if (msg.command === 'acxData') {
            readingState.acxItems = msg.items;
            readingState.loading = false;
            if (readingState.currentSource === 'acx') {
              renderRssItems(readingState.acxItems, 'acx');
            }
          } else if (msg.command === 'acxError') {
            readingState.loading = false;
            if (readingState.currentSource === 'acx') {
              renderReadingError(msg.error);
            }
          } else if (msg.command === 'hnPostData') {
            readingState.detailLoading = false;
            readingState.currentPost = msg.post;
            readingState.currentComments = msg.comments;
            renderHNDetailView();
          } else if (msg.command === 'hnPostError') {
            readingState.detailLoading = false;
            renderDetailError(msg.error);
          } else if (msg.command === 'lwPostData') {
            readingState.detailLoading = false;
            readingState.currentPost = msg.post;
            renderLWDetailView();
          } else if (msg.command === 'lwPostError') {
            readingState.detailLoading = false;
            renderDetailError(msg.error);
          } else if (msg.command === 'acxPostData') {
            readingState.detailLoading = false;
            readingState.currentPost = msg.post;
            renderACXDetailView();
          } else if (msg.command === 'acxPostError') {
            readingState.detailLoading = false;
            renderDetailError(msg.error);
          }
        });

        function updateBalance(change, isWin) {
          if (isWin) {
            vscode.postMessage({ command: 'casinoWin', game: currentGame, amount: change });
          } else {
            vscode.postMessage({ command: 'casinoLoss', amount: Math.abs(change) });
          }
        }

        function placeBet(amount) {
          vscode.postMessage({ command: 'casinoBet', amount: amount });
        }

        // Game cards (unified for all games)
        document.querySelectorAll('.game-card').forEach(card => {
          card.addEventListener('click', () => startGame(card.dataset.game));
        });

        backBtn?.addEventListener('click', () => { stopGame(); showMenu(); });
        playAgainBtn?.addEventListener('click', () => { if (gameOverOverlay) gameOverOverlay.classList.remove('active'); startGame(currentGame); });
        backToMenuBtn?.addEventListener('click', () => { if (gameOverOverlay) gameOverOverlay.classList.remove('active'); showMenu(); });

        function showMenu() {
          if (gameSelection) gameSelection.style.display = 'grid';
          if (gameContainer) gameContainer.classList.remove('active');
          if (betControlsEl) betControlsEl.style.display = 'none';
          if (gameControls) gameControls.innerHTML = '';
          currentGame = null;
        }

        function startGame(game) {
          currentGame = game;
          if (gameSelection) gameSelection.style.display = 'none';
          if (gameContainer) gameContainer.classList.add('active');
          if (currentScoreEl) currentScoreEl.textContent = '0';
          if (gameControls) gameControls.innerHTML = '';
          vscode.postMessage({ command: 'gamePlayed', game: game });

          const isCasinoGame = casinoGames.includes(game);
          if (betControlsEl) betControlsEl.style.display = isCasinoGame ? 'flex' : 'none';

          // Resize canvas based on game
          if (canvas) {
            if (game === 'flappy') {
              canvas.width = 320;
              canvas.height = 480;
            } else if (isCasinoGame) {
              canvas.width = 320;
              canvas.height = 400;
            } else {
              canvas.width = 320;
              canvas.height = 320;
            }
          }

          if (!canvas || !ctx) return;

          if (game === 'snake') {
            gameInstance = new SnakeGame(canvas, ctx, updateScore, gameOver);
            gameInstance.start();
          } else if (game === 'flappy') {
            gameInstance = new FlappyGame(canvas, ctx, updateScore, gameOver);
            gameInstance.start();
          } else if (game === 'plinko') {
            gameInstance = new PlinkoGame(canvas, ctx, gameControls, betAmountInput, updateBalance);
            gameInstance.init();
          } else if (game === 'slots') {
            gameInstance = new SlotsGame(canvas, ctx, gameControls, betAmountInput, updateBalance);
            gameInstance.init();
          }
        }

        function stopGame() {
          if (gameInstance && gameInstance.stop) gameInstance.stop();
          gameInstance = null;
        }

        function updateScore(score) { if (currentScoreEl) currentScoreEl.textContent = score; }
        function gameOver(finalScore) {
          if (finalScoreEl) finalScoreEl.textContent = finalScore;
          if (gameOverOverlay) gameOverOverlay.classList.add('active');
          vscode.postMessage({ command: 'gameScore', game: currentGame, score: finalScore });
          vscode.postMessage({ command: 'requestHighScores' });
        }

        // Settings handlers
        document.querySelectorAll('.toggle').forEach(toggle => {
          toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            const id = toggle.id;
            const value = toggle.classList.contains('active');
            if (id === 'setting-autodetect') {
              vscode.postMessage({ command: 'updateSetting', key: 'autoDetect', value });
            } else if (id === 'setting-autominimize') {
              vscode.postMessage({ command: 'updateSetting', key: 'autoMinimize', value });
            } else if (id === 'setting-casino') {
              vscode.postMessage({ command: 'updateSetting', key: 'casinoEnabled', value });
            } else if (id === 'setting-achievements') {
              vscode.postMessage({ command: 'updateSetting', key: 'enableAchievements', value });
            } else if (id === 'setting-sound') {
              SoundManager.enabled = value;
            }
          });
        });

        // Slider handlers
        document.getElementById('setting-idle')?.addEventListener('input', (e) => {
          const value = e.target.value;
          document.getElementById('idle-value').textContent = value + 's';
        });
        document.getElementById('setting-idle')?.addEventListener('change', (e) => {
          vscode.postMessage({ command: 'updateSetting', key: 'idleTimeout', value: parseInt(e.target.value) });
        });

        document.getElementById('setting-volume')?.addEventListener('input', (e) => {
          const value = e.target.value;
          document.getElementById('volume-value').textContent = value + '%';
          SoundManager.volume = value / 100;
        });

        document.getElementById('setting-earning')?.addEventListener('input', (e) => {
          const value = e.target.value;
          document.getElementById('earning-value').textContent = value + '/s';
        });
        document.getElementById('setting-earning')?.addEventListener('change', (e) => {
          vscode.postMessage({ command: 'updateSetting', key: 'earningRate', value: parseInt(e.target.value) });
        });

        // Intensity select
        document.getElementById('setting-intensity')?.addEventListener('change', (e) => {
          vscode.postMessage({ command: 'updateSetting', key: 'brainrotIntensity', value: e.target.value });
        });

        // Reset button
        document.getElementById('setting-reset')?.addEventListener('click', () => {
          if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
            SoundManager.play('crash');
            vscode.postMessage({ command: 'resetStats' });
          }
        });

        // ===================== READING TAB =====================
        const readingState = {
          currentSource: 'hn',
          hnPage: 0,
          hnStories: [],
          hnHasMore: true,
          lwItems: [],
          acxItems: [],
          loading: false,
          initialized: false,
          // Detail view state
          viewingDetail: false,
          detailLoading: false,
          currentPost: null,
          currentComments: [],
          hnDetailView: 'article', // 'article' or 'discussion'
          currentExternalUrl: ''
        };

        // Detail view elements (with null safety)
        function getEl(id) { return document.getElementById(id); }

        const sourceTitles = {
          hn: 'Hacker News',
          lw: 'LessWrong',
          acx: 'Astral Codex Ten'
        };

        // Source tab switching
        document.querySelectorAll('.source-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            readingState.currentSource = btn.dataset.source;
            const titleEl = document.getElementById('reading-source-title');
            if (titleEl) titleEl.textContent = sourceTitles[readingState.currentSource];
            renderReadingContent();
          });
        });

        function renderReadingContent() {
          const content = document.getElementById('reading-content');
          const source = readingState.currentSource;

          if (source === 'hn' && readingState.hnStories.length > 0) {
            renderHackerNews();
          } else if (source === 'lw' && readingState.lwItems.length > 0) {
            renderRssItems(readingState.lwItems, 'lw');
          } else if (source === 'acx' && readingState.acxItems.length > 0) {
            renderRssItems(readingState.acxItems, 'acx');
          } else if (content) {
            content.innerHTML = '<div class="reading-loading"><div class="spinner"></div><p>Loading articles...</p></div>';
            fetchReadingData(source);
          }
        }

        function fetchReadingData(source) {
          readingState.loading = true;
          if (source === 'hn') {
            vscode.postMessage({ command: 'fetchHackerNews', page: readingState.hnPage });
          } else if (source === 'lw') {
            vscode.postMessage({ command: 'fetchLessWrong' });
          } else if (source === 'acx') {
            vscode.postMessage({ command: 'fetchACX' });
          }
        }

        function renderHackerNews() {
          const content = document.getElementById('reading-content');
          if (!content) return;
          let html = '';

          readingState.hnStories.forEach(story => {
            const timeAgo = formatTimeAgo(story.time * 1000);
            const url = story.url || ('https://news.ycombinator.com/item?id=' + story.id);
            html += '<div class="article-item" data-url="' + escapeAttr(url) + '" data-hn-id="' + story.id + '">' +
              '<div class="article-score"><span class="arrow">▲</span><span>' + story.score + '</span></div>' +
              '<div class="article-content">' +
                '<div class="article-title">' + escapeHtml(story.title) + '</div>' +
                '<div class="article-meta">' +
                  '<span class="article-domain">' + story.domain + '</span>' +
                  '<span>· ' + story.descendants + ' comments</span>' +
                  '<span>· ' + timeAgo + '</span>' +
                '</div>' +
              '</div>' +
            '</div>';
          });

          if (readingState.hnHasMore) {
            html += '<button class="reading-load-more" id="hn-load-more">Load More...</button>';
          }

          content.innerHTML = html;
          attachArticleHandlers();

          const loadMoreBtn = document.getElementById('hn-load-more');
          if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              loadMoreBtn.textContent = 'Loading...';
              loadMoreBtn.disabled = true;
              readingState.hnPage++;
              vscode.postMessage({ command: 'fetchHackerNews', page: readingState.hnPage });
            });
          }
        }

        function renderRssItems(items, source) {
          const content = document.getElementById('reading-content');
          if (!content) return;
          let html = '';

          items.forEach(item => {
            const timeAgo = item.pubDate ? formatTimeAgo(new Date(item.pubDate).getTime()) : '';
            // Extract LW post ID from URL if available
            const lwPostId = source === 'lw' ? extractLWPostId(item.link) : null;
            const dataAttrs = 'data-url="' + escapeAttr(item.link || '') + '"' +
              (lwPostId ? ' data-lw-id="' + escapeAttr(lwPostId) + '"' : '');

            html += '<div class="article-item no-score" ' + dataAttrs + '>' +
              '<div class="article-content">' +
                '<div class="article-title">' + escapeHtml(item.title || 'Untitled') + '</div>' +
                '<div class="article-meta">' +
                  (timeAgo ? '<span>' + timeAgo + '</span>' : '') +
                '</div>' +
              '</div>' +
            '</div>';
          });

          content.innerHTML = html || '<div class="reading-error"><p>No articles found</p></div>';
          attachArticleHandlers();
        }

        function attachArticleHandlers() {
          document.querySelectorAll('.article-item').forEach(item => {
            item.addEventListener('click', () => {
              const url = item.dataset.url;
              const hnId = item.dataset.hnId;
              const lwId = item.dataset.lwId;

              if (readingState.currentSource === 'hn' && hnId) {
                openHNPost(parseInt(hnId), url);
              } else if (readingState.currentSource === 'lw' && lwId) {
                openLWPost(lwId, url);
              } else if (readingState.currentSource === 'acx') {
                openACXPost(url);
              } else if (readingState.currentSource === 'lw') {
                // Extract post ID from LW URL
                const postId = extractLWPostId(url);
                if (postId) {
                  openLWPost(postId, url);
                } else {
                  vscode.postMessage({ command: 'openExternal', url });
                }
              } else {
                vscode.postMessage({ command: 'openExternal', url });
              }
            });
          });
        }

        function extractLWPostId(url) {
          const match = url.match(/lesswrong\\.com\\/posts\\/([^\\/]+)/);
          return match ? match[1] : null;
        }

        function showDetailView() {
          const listView = getEl('reading-list-view');
          const detailView = getEl('reading-detail-view');
          if (listView) listView.style.display = 'none';
          if (detailView) detailView.classList.add('active');
          readingState.viewingDetail = true;
        }

        function hideDetailView() {
          const listView = getEl('reading-list-view');
          const detailView = getEl('reading-detail-view');
          const hnTabs = getEl('hn-view-tabs');
          if (detailView) detailView.classList.remove('active');
          if (listView) listView.style.display = 'block';
          readingState.viewingDetail = false;
          readingState.currentPost = null;
          readingState.currentComments = [];
          if (hnTabs) hnTabs.style.display = 'none';
        }

        function showDetailLoading() {
          showDetailView();
          const titleEl = getEl('detail-title');
          const metaEl = getEl('detail-meta');
          const bodyEl = getEl('detail-body');
          if (titleEl) titleEl.textContent = 'Loading...';
          if (metaEl) metaEl.innerHTML = '';
          if (bodyEl) bodyEl.innerHTML = '<div class="reader-loading"><div class="spinner"></div><p>Loading content...</p></div>';
        }

        function openHNPost(id, url) {
          showDetailLoading();
          readingState.currentExternalUrl = 'https://news.ycombinator.com/item?id=' + id;
          readingState.detailLoading = true;
          readingState.hnDetailView = 'discussion'; // Default to discussion for HN
          vscode.postMessage({ command: 'fetchHNPost', id });
        }

        function openLWPost(postId, url) {
          showDetailLoading();
          readingState.currentExternalUrl = url;
          readingState.detailLoading = true;
          vscode.postMessage({ command: 'fetchLWPost', postId });
        }

        function openACXPost(url) {
          showDetailLoading();
          readingState.currentExternalUrl = url;
          readingState.detailLoading = true;
          vscode.postMessage({ command: 'fetchACXPost', url });
        }

        function renderHNDetailView() {
          const post = readingState.currentPost;
          if (!post) return;

          const titleEl = getEl('detail-title');
          const metaEl = getEl('detail-meta');
          const hnTabs = getEl('hn-view-tabs');
          const commentCount = getEl('hn-comment-count');

          if (titleEl) titleEl.textContent = post.title;
          if (metaEl) metaEl.innerHTML =
            '<span class="score">▲ ' + post.score + '</span>' +
            '<span class="author">by ' + escapeHtml(post.by) + '</span>' +
            '<span>' + formatTimeAgo(post.time * 1000) + '</span>' +
            '<span class="article-domain">' + post.domain + '</span>';

          // Show HN-specific tabs
          if (hnTabs) hnTabs.style.display = 'flex';
          if (commentCount) commentCount.textContent = post.descendants || 0;

          // Update tab state
          document.querySelectorAll('.hn-view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === readingState.hnDetailView);
          });

          renderHNDetailContent();
        }

        function renderHNDetailContent() {
          const post = readingState.currentPost;
          if (!post) return;

          const bodyEl = getEl('detail-body');
          if (!bodyEl) return;

          if (readingState.hnDetailView === 'article') {
            // Show article view
            if (post.text) {
              // It's an Ask HN / Show HN / text post
              bodyEl.innerHTML =
                '<div class="hn-post-text">' + post.text + '</div>' +
                '<div class="open-in-browser">' +
                  '<p>This is a text post on Hacker News</p>' +
                  '<button class="btn" id="view-on-hn-btn">↗ View on HN</button>' +
                '</div>';
              document.getElementById('view-on-hn-btn')?.addEventListener('click', () => {
                vscode.postMessage({ command: 'openExternal', url: readingState.currentExternalUrl });
              });
            } else if (post.url) {
              // External article - show open prompt
              bodyEl.innerHTML =
                '<div class="open-in-browser">' +
                  '<p>This article is hosted externally</p>' +
                  '<button class="btn" id="open-article-btn">📄 Open Article</button>' +
                  '<p style="margin-top: 16px; font-size: 11px; color: var(--text-muted);">' + escapeHtml(post.url) + '</p>' +
                '</div>';
              document.getElementById('open-article-btn')?.addEventListener('click', () => {
                vscode.postMessage({ command: 'openExternal', url: post.url });
              });
            }
          } else {
            // Show discussion/comments
            if (readingState.currentComments.length === 0) {
              bodyEl.innerHTML = '<div class="no-comments">No comments yet</div>';
            } else {
              bodyEl.innerHTML = '<div class="comment-thread">' + renderComments(readingState.currentComments) + '</div>';
            }
          }
        }

        function renderComments(comments, depth = 0) {
          if (!comments || comments.length === 0) return '';

          let html = '';
          comments.forEach(comment => {
            if (!comment || !comment.text) return;

            const timeAgo = formatTimeAgo(comment.time * 1000);
            html += '<div class="comment">' +
              '<div class="comment-header">' +
                '<span class="comment-author">' + escapeHtml(comment.by || 'unknown') + '</span>' +
                '<span class="comment-time">' + timeAgo + '</span>' +
              '</div>' +
              '<div class="comment-body">' + comment.text + '</div>';

            // Render nested replies
            if (comment.replies && comment.replies.length > 0) {
              html += '<div class="comment-replies">' + renderComments(comment.replies, depth + 1) + '</div>';
            } else if (comment.kids && comment.kids.length > 0 && depth < 2) {
              html += '<div class="more-replies">' + comment.kids.length + ' more replies...</div>';
            }

            html += '</div>';
          });

          return html;
        }

        function renderLWDetailView() {
          const post = readingState.currentPost;
          if (!post) return;

          const titleEl = getEl('detail-title');
          const metaEl = getEl('detail-meta');
          const bodyEl = getEl('detail-body');
          const hnTabs = getEl('hn-view-tabs');

          // Hide HN tabs for LW
          if (hnTabs) hnTabs.style.display = 'none';

          if (titleEl) titleEl.textContent = post.title;

          const date = post.date ? new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
          if (metaEl) metaEl.innerHTML =
            '<span class="author">by ' + escapeHtml(post.author) + '</span>' +
            (date ? '<span>' + date + '</span>' : '') +
            '<span class="score">▲ ' + (post.karma || 0) + ' karma</span>';

          if (bodyEl) {
            if (post.content) {
              bodyEl.innerHTML = '<div class="article-text-content">' + post.content + '</div>';
            } else {
              bodyEl.innerHTML =
                '<div class="open-in-browser">' +
                  '<p>Unable to load article content</p>' +
                  '<button class="btn" id="lw-open-browser-btn">↗ Open in Browser</button>' +
                '</div>';
              document.getElementById('lw-open-browser-btn')?.addEventListener('click', () => {
                vscode.postMessage({ command: 'openExternal', url: readingState.currentExternalUrl });
              });
            }
          }
        }

        function renderACXDetailView() {
          const post = readingState.currentPost;
          if (!post) return;

          const titleEl = getEl('detail-title');
          const metaEl = getEl('detail-meta');
          const bodyEl = getEl('detail-body');
          const hnTabs = getEl('hn-view-tabs');

          // Hide HN tabs for ACX
          if (hnTabs) hnTabs.style.display = 'none';

          if (titleEl) titleEl.textContent = post.title;

          const date = post.date ? new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
          if (metaEl) metaEl.innerHTML =
            '<span class="author">by ' + escapeHtml(post.author) + '</span>' +
            (date ? '<span>' + date + '</span>' : '');

          if (bodyEl) {
            if (post.content && post.content.length > 100) {
              bodyEl.innerHTML = '<div class="article-text-content">' + post.content + '</div>';
            } else {
              bodyEl.innerHTML =
                '<div class="open-in-browser">' +
                  '<p>Unable to load article content</p>' +
                  '<button class="btn" id="acx-open-browser-btn">↗ Open in Browser</button>' +
                '</div>';
              document.getElementById('acx-open-browser-btn')?.addEventListener('click', () => {
                vscode.postMessage({ command: 'openExternal', url: readingState.currentExternalUrl });
              });
            }
          }
        }

        function renderDetailError(message) {
          const titleEl = getEl('detail-title');
          const metaEl = getEl('detail-meta');
          const bodyEl = getEl('detail-body');

          if (titleEl) titleEl.textContent = 'Error';
          if (metaEl) metaEl.innerHTML = '';
          if (bodyEl) {
            bodyEl.innerHTML =
              '<div class="reading-error">' +
                '<p>' + message + '</p>' +
                '<button class="btn btn-secondary" id="detail-retry-btn">Retry</button>' +
              '</div>';
            document.getElementById('detail-retry-btn')?.addEventListener('click', () => {
              hideDetailView();
            });
          }
        }

        // Back button handler
        document.getElementById('reading-back-btn')?.addEventListener('click', () => {
          hideDetailView();
        });

        // Open external button handler
        document.getElementById('reading-open-external')?.addEventListener('click', () => {
          if (readingState.currentExternalUrl) {
            vscode.postMessage({ command: 'openExternal', url: readingState.currentExternalUrl });
          }
        });

        // HN view tab switching
        document.querySelectorAll('.hn-view-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.hn-view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            readingState.hnDetailView = btn.dataset.view;
            renderHNDetailContent();
          });
        });

        function renderReadingError(message) {
          const content = document.getElementById('reading-content');
          if (!content) return;
          content.innerHTML = '<div class="reading-error">' +
            '<p>' + escapeHtml(message) + '</p>' +
            '<button class="btn btn-secondary retry-btn" id="reading-retry">Retry</button>' +
          '</div>';
          document.getElementById('reading-retry')?.addEventListener('click', () => {
            renderReadingContent();
          });
        }

        function formatTimeAgo(timestamp) {
          const seconds = Math.floor((Date.now() - timestamp) / 1000);
          if (seconds < 60) return 'just now';
          const minutes = Math.floor(seconds / 60);
          if (minutes < 60) return minutes + 'm ago';
          const hours = Math.floor(minutes / 60);
          if (hours < 24) return hours + 'h ago';
          const days = Math.floor(hours / 24);
          if (days < 30) return days + 'd ago';
          const months = Math.floor(days / 30);
          return months + 'mo ago';
        }

        function escapeHtml(text) {
          if (text == null) return '';
          const div = document.createElement('div');
          div.textContent = String(text);
          return div.innerHTML;
        }

        function escapeAttr(text) {
          if (!text) return '';
          return String(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }

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
            // Background with subtle grid
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.strokeStyle = '#222';
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
            gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
            gradient.addColorStop(0.6, 'rgba(239, 68, 68, 0.3)');
            gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(fx, fy, baseRadius * pulse * 1.5, 0, Math.PI * 2);
            ctx.fill();
            // Core
            ctx.fillStyle = '#ef4444';
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
            // Sky gradient
            const skyGrad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            skyGrad.addColorStop(0, '#4ec0ca');
            skyGrad.addColorStop(0.7, '#70c5ce');
            skyGrad.addColorStop(1, '#87ceeb');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            // Clouds (parallax)
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
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
            // Ground
            ctx.fillStyle = '#ded895';
            ctx.fillRect(0, this.canvas.height - 30, this.canvas.width, 30);
            // Ground pattern
            ctx.fillStyle = '#c4b67c';
            for (let x = -this.groundOffset; x < this.canvas.width; x += 24) {
              ctx.fillRect(x, this.canvas.height - 30, 12, 4);
            }
            ctx.fillStyle = '#8b7355';
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
            // Pipe body gradient
            const grad = ctx.createLinearGradient(x, 0, x + w, 0);
            grad.addColorStop(0, '#5a9f2f');
            grad.addColorStop(0.3, '#73bf2e');
            grad.addColorStop(0.7, '#73bf2e');
            grad.addColorStop(1, '#4a8a25');
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
            // Background with subtle gradient
            const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            bgGrad.addColorStop(0, '#0a0a1a');
            bgGrad.addColorStop(1, '#0f0f23');
            this.ctx.fillStyle = bgGrad;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw pin board area
            this.ctx.fillStyle = 'rgba(30, 30, 50, 0.5)';
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

                // Pin with metallic gradient
                const pinGrad = this.ctx.createRadialGradient(px - 1, rowY - 1, 0, px, rowY, 5);
                pinGrad.addColorStop(0, litPin ? '#ffd700' : '#888');
                pinGrad.addColorStop(0.5, litPin ? '#fbbf24' : '#666');
                pinGrad.addColorStop(1, litPin ? '#b8860b' : '#444');
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

              // Multiplier text
              this.ctx.fillStyle = '#000';
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

        // ===================== SLOTS =====================
        class SlotsGame {
          constructor(canvas, ctx, controls, betInput, onUpdate) {
            this.canvas = canvas; this.ctx = ctx; this.controls = controls;
            this.betInput = betInput; this.onUpdate = onUpdate;
            this.symbols = ['7', 'BAR', '🍒', '🍋', '🍊', '🔔', '⭐'];
            this.symbolColors = { '7': '#ef4444', 'BAR': '#4ade80', '🍒': '#ef4444', '🍋': '#fbbf24', '🍊': '#f97316', '🔔': '#fbbf24', '⭐': '#fbbf24' };
            this.payouts = { '7': [5, 25, 100], 'BAR': [3, 15, 50], '🔔': [2, 10, 25], '⭐': [2, 5, 15], '🍒': [1, 3, 10], '🍋': [0.5, 2, 5], '🍊': [0.5, 2, 5] };
            this.reels = 3;
            this.particles = new ParticleSystem(ctx);
            this.floatingTexts = [];
          }
          init() {
            this.currentBet = 0; this.spinning = false;
            // Each reel has array of symbols (for scrolling effect)
            this.reelStrips = Array(this.reels).fill(null).map(() =>
              Array(20).fill(null).map(() => this.symbols[Math.floor(Math.random() * this.symbols.length)])
            );
            this.reelPositions = [0, 0, 0]; // Current scroll position
            this.reelSpeeds = [0, 0, 0]; // Scroll speed per reel
            this.reelTargets = [null, null, null]; // Target stop positions
            this.finalSymbols = ['7', '7', '7']; // Final symbols shown
            this.winHighlight = 0; // For win animation
            this.lastWinAmount = 0;
            this.lastTime = 0;
            this.draw(); this.updateControls();
          }
          stop() { if (this.animationId) cancelAnimationFrame(this.animationId); }
          spin() {
            const bet = parseInt(this.betInput.value) || 10;
            if (bet > playerBalance) { alert('Not enough $GRASS! NGMI'); return; }
            placeBet(bet);
            SoundManager.play('click');
            this.currentBet = bet;
            this.spinning = true;
            this.winHighlight = 0;
            this.lastWinAmount = 0;
            this.updateControls();

            // Initialize spin with staggered speeds
            this.reelSpeeds = [25 + Math.random() * 5, 28 + Math.random() * 5, 31 + Math.random() * 5];
            this.reelTargets = [null, null, null];
            this.stopTimes = [
              performance.now() + 1000 + Math.random() * 200,  // Reel 0 stops first
              performance.now() + 1400 + Math.random() * 200,  // Reel 1 stops second
              performance.now() + 1800 + Math.random() * 200   // Reel 2 stops last
            ];

            // Generate final results
            this.finalSymbols = Array(this.reels).fill(null).map(() =>
              this.symbols[Math.floor(Math.random() * this.symbols.length)]
            );

            this.lastTime = performance.now();
            this.animate();
          }
          animate(currentTime = performance.now()) {
            const deltaTime = Math.min((currentTime - this.lastTime) / 16.67, 3);
            this.lastTime = currentTime;

            let stillSpinning = false;

            for (let i = 0; i < this.reels; i++) {
              if (this.reelSpeeds[i] > 0) {
                stillSpinning = true;

                // Check if it's time to start stopping this reel
                if (currentTime >= this.stopTimes[i] && this.reelTargets[i] === null) {
                  // Set target to final symbol
                  const finalIdx = this.symbols.indexOf(this.finalSymbols[i]);
                  this.reelTargets[i] = Math.floor(this.reelPositions[i] / 60) * 60 + finalIdx * 60 + 120;
                  SoundManager.play('drop');
                }

                // Apply deceleration if we have a target
                if (this.reelTargets[i] !== null) {
                  const distance = this.reelTargets[i] - this.reelPositions[i];
                  if (distance > 10) {
                    // Ease out deceleration
                    this.reelSpeeds[i] = Math.max(2, distance * 0.08);
                  } else {
                    // Snap to target
                    this.reelPositions[i] = this.reelTargets[i];
                    this.reelSpeeds[i] = 0;
                    SoundManager.play('flip');
                  }
                }

                // Update position
                this.reelPositions[i] += this.reelSpeeds[i] * deltaTime;

                // Play tick sound occasionally during fast spin
                if (this.reelSpeeds[i] > 15 && Math.random() < 0.1) {
                  SoundManager.play('spin');
                }
              }
            }

            // Update particles and floating texts
            this.particles.update();
            this.floatingTexts = this.floatingTexts.filter(t => {
              t.y -= 1.2 * deltaTime;
              t.life -= 0.015 * deltaTime;
              return t.life > 0;
            });

            // Win highlight animation
            if (this.winHighlight > 0) {
              this.winHighlight -= 0.02 * deltaTime;
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

            // Check for matches
            if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
              isTriple = true;
              const sym = symbols[0];
              const payout = this.payouts[sym] ? this.payouts[sym][2] : 5;
              winAmount = Math.floor(this.currentBet * payout);
              if (sym === '7') {
                vscode.postMessage({ command: 'casinoWin', game: 'lucky-7', amount: winAmount });
              }
            } else if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {
              const matchSym = symbols[0] === symbols[1] ? symbols[0] : (symbols[1] === symbols[2] ? symbols[1] : symbols[0]);
              const payout = this.payouts[matchSym] ? this.payouts[matchSym][0] : 0.5;
              winAmount = Math.floor(this.currentBet * payout);
            }

            if (winAmount > 0) {
              this.lastWinAmount = winAmount;
              this.winHighlight = 1;
              this.onUpdate(winAmount, true);
              SoundManager.play('win');

              // Particles for win
              const reelWidth = (this.canvas.width - 60) / 3;
              const centerY = 160;
              if (isTriple) {
                // Big celebration for triple
                for (let i = 0; i < 3; i++) {
                  const x = 30 + i * reelWidth + reelWidth / 2;
                  this.particles.burst(x, centerY, 20, [this.symbolColors[symbols[i]] || '#fbbf24', '#fff'], 5);
                }
                // Floating text
                this.floatingTexts.push({
                  x: this.canvas.width / 2, y: 80,
                  text: '+' + winAmount + ' $GRASS!',
                  color: '#4ade80', life: 1, scale: 1.5
                });
              } else {
                this.particles.burst(this.canvas.width / 2, centerY, 10, ['#fbbf24', '#fff'], 3);
                this.floatingTexts.push({
                  x: this.canvas.width / 2, y: 80,
                  text: '+' + winAmount + ' $GRASS',
                  color: '#fbbf24', life: 1, scale: 1
                });
              }

              if (winAmount >= this.currentBet * 100) {
                vscode.postMessage({ command: 'casinoWin', game: 'jackpot', amount: winAmount });
              }

              // Continue animation for effects
              this.continueEffects();
            } else {
              SoundManager.play('lose');
              this.onUpdate(this.currentBet, false);
            }

            this.updateControls();
          }
          continueEffects() {
            const hasEffects = this.particles.particles.length > 0 ||
                             this.floatingTexts.length > 0 ||
                             this.winHighlight > 0;
            if (hasEffects) {
              this.particles.update();
              this.floatingTexts = this.floatingTexts.filter(t => {
                t.y -= 1.2;
                t.life -= 0.015;
                return t.life > 0;
              });
              if (this.winHighlight > 0) this.winHighlight -= 0.02;
              this.draw();
              requestAnimationFrame(() => this.continueEffects());
            }
          }
          updateControls() {
            this.controls.innerHTML = '';
            const spinBtn = document.createElement('button');
            spinBtn.className = 'btn btn-bet'; spinBtn.textContent = 'SPIN';
            spinBtn.addEventListener('click', () => this.spin());
            spinBtn.disabled = this.spinning;
            this.controls.appendChild(spinBtn);
          }
          draw() {
            // Background with gradient
            const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            bgGrad.addColorStop(0, '#1a0f2e');
            bgGrad.addColorStop(1, '#2d1b4e');
            this.ctx.fillStyle = bgGrad;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Decorative lights at top
            for (let i = 0; i < 10; i++) {
              const x = 25 + i * ((this.canvas.width - 50) / 9);
              const hue = (Date.now() / 20 + i * 36) % 360;
              this.ctx.beginPath();
              this.ctx.arc(x, 25, 6, 0, Math.PI * 2);
              this.ctx.fillStyle = 'hsl(' + hue + ', 80%, 60%)';
              this.ctx.fill();
              // Glow
              const glow = this.ctx.createRadialGradient(x, 25, 0, x, 25, 15);
              glow.addColorStop(0, 'hsla(' + hue + ', 80%, 60%, 0.4)');
              glow.addColorStop(1, 'transparent');
              this.ctx.fillStyle = glow;
              this.ctx.fillRect(x - 15, 10, 30, 30);
            }

            // Title
            this.ctx.fillStyle = '#fbbf24';
            this.ctx.font = 'bold 28px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = '#fbbf24';
            this.ctx.shadowBlur = 10;
            this.ctx.fillText('SLOTS', this.canvas.width / 2, 65);
            this.ctx.shadowBlur = 0;

            // Slot machine frame with 3D effect
            const frameX = 15, frameY = 90, frameW = this.canvas.width - 30, frameH = 130;

            // Outer frame glow
            if (this.winHighlight > 0) {
              this.ctx.shadowColor = '#4ade80';
              this.ctx.shadowBlur = 30 * this.winHighlight;
            }

            // Frame background
            const frameGrad = this.ctx.createLinearGradient(frameX, frameY, frameX, frameY + frameH);
            frameGrad.addColorStop(0, '#2a2a2a');
            frameGrad.addColorStop(0.5, '#1a1a1a');
            frameGrad.addColorStop(1, '#0a0a0a');
            this.ctx.fillStyle = frameGrad;
            this.ctx.beginPath();
            this.ctx.roundRect(frameX, frameY, frameW, frameH, 10);
            this.ctx.fill();

            // Frame border
            this.ctx.strokeStyle = '#fbbf24';
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;

            // Inner gold trim
            this.ctx.strokeStyle = '#b8860b';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.roundRect(frameX + 6, frameY + 6, frameW - 12, frameH - 12, 6);
            this.ctx.stroke();

            // Reels
            const reelWidth = (frameW - 40) / 3;
            const reelHeight = frameH - 30;
            const reelY = frameY + 15;

            for (let i = 0; i < 3; i++) {
              const reelX = frameX + 15 + i * (reelWidth + 5);

              // Reel background
              this.ctx.fillStyle = '#fff';
              this.ctx.beginPath();
              this.ctx.roundRect(reelX, reelY, reelWidth, reelHeight, 4);
              this.ctx.fill();

              // Draw symbols (3 visible, scrolling)
              this.ctx.save();
              this.ctx.beginPath();
              this.ctx.roundRect(reelX, reelY, reelWidth, reelHeight, 4);
              this.ctx.clip();

              const symbolHeight = 60;
              const offset = this.reelPositions[i] % symbolHeight;
              const baseIndex = Math.floor(this.reelPositions[i] / symbolHeight);

              // Draw 3 symbols
              for (let j = -1; j <= 1; j++) {
                const symIndex = (baseIndex + j + 100 * this.symbols.length) % this.symbols.length;
                const sym = this.spinning ? this.symbols[symIndex] : (j === 0 ? this.finalSymbols[i] : this.symbols[(symIndex + j + this.symbols.length) % this.symbols.length]);
                const y = reelY + reelHeight / 2 + j * symbolHeight - offset + symbolHeight / 2;

                // Blur effect when spinning fast
                if (this.reelSpeeds[i] > 10) {
                  this.ctx.globalAlpha = 0.4;
                }

                this.ctx.fillStyle = '#000';
                this.ctx.font = 'bold 32px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(sym, reelX + reelWidth / 2, y);
                this.ctx.globalAlpha = 1;
              }

              this.ctx.restore();

              // Highlight center row
              this.ctx.strokeStyle = this.winHighlight > 0 ? 'rgba(74, 222, 128, ' + this.winHighlight + ')' : 'rgba(251, 191, 36, 0.3)';
              this.ctx.lineWidth = this.winHighlight > 0 ? 3 : 1;
              this.ctx.beginPath();
              this.ctx.roundRect(reelX - 2, reelY + reelHeight / 2 - 25, reelWidth + 4, 50, 4);
              this.ctx.stroke();
            }

            // Win line indicator arrows
            this.ctx.fillStyle = this.winHighlight > 0 ? '#4ade80' : '#fbbf24';
            // Left arrow
            this.ctx.beginPath();
            this.ctx.moveTo(frameX - 5, frameY + frameH / 2);
            this.ctx.lineTo(frameX + 8, frameY + frameH / 2 - 10);
            this.ctx.lineTo(frameX + 8, frameY + frameH / 2 + 10);
            this.ctx.fill();
            // Right arrow
            this.ctx.beginPath();
            this.ctx.moveTo(frameX + frameW + 5, frameY + frameH / 2);
            this.ctx.lineTo(frameX + frameW - 8, frameY + frameH / 2 - 10);
            this.ctx.lineTo(frameX + frameW - 8, frameY + frameH / 2 + 10);
            this.ctx.fill();

            // Paytable
            this.ctx.fillStyle = '#888';
            this.ctx.font = '11px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('777 = 100x  |  BAR = 50x  |  2 match = 1-5x', this.canvas.width / 2, 245);

            // Last win display
            if (this.lastWinAmount > 0 && !this.spinning) {
              this.ctx.fillStyle = '#4ade80';
              this.ctx.font = 'bold 16px sans-serif';
              this.ctx.fillText('WIN: ' + this.lastWinAmount + ' $GRASS', this.canvas.width / 2, 270);
            }

            this.ctx.textAlign = 'left';

            // Draw particles
            this.particles.draw();

            // Draw floating texts
            this.floatingTexts.forEach(t => {
              this.ctx.globalAlpha = t.life;
              this.ctx.fillStyle = t.color;
              this.ctx.font = 'bold ' + (16 * (t.scale || 1)) + 'px sans-serif';
              this.ctx.textAlign = 'center';
              this.ctx.fillText(t.text, t.x, t.y);
            });
            this.ctx.globalAlpha = 1;
            this.ctx.textAlign = 'left';
          }
        }
      </script>
    </body>
    </html>`;
  }

  public dispose(): void {
    BrainrotPanel.currentPanel = undefined;
    this._panel.dispose();
    this._pomodoroManager?.dispose();
    this._disposables.forEach((d) => d.dispose());
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
