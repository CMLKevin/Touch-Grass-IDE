import * as vscode from 'vscode';
import { SessionTracker } from '../core/SessionTracker';
import { AchievementEngine } from '../core/AchievementEngine';
import { PomodoroManager, PomodoroState } from '../core/PomodoroManager';
import { CurrencyManager } from '../core/CurrencyManager';
import { getHtmlTemplate, type WebviewConfig } from './webview';

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
    const webviewConfig: WebviewConfig = {
      intensity: config.get<string>('brainrotIntensity', 'casual'),
      autoDetect: config.get<boolean>('autoDetect', true),
      autoMinimize: config.get<boolean>('autoMinimize', true),
      idleTimeout: config.get<number>('idleTimeout', 30),
      casinoEnabled: config.get<boolean>('casinoEnabled', true),
      earningRate: config.get<number>('earningRate', 1),
      enableAchievements: config.get<boolean>('enableAchievements', true),
      cspSource: this._panel.webview.cspSource,
      nonce: getNonce(),
    };

    return getHtmlTemplate(webviewConfig);
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
