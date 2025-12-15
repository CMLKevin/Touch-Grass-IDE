/**
 * Reading Tab Logic
 * Returns JavaScript code as a string for the webview
 */

export function getReadingScript(): string {
  return `
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
`;
}
