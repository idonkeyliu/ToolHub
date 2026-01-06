import { i18n } from '../../core/i18n';

export const getTemplate = () => `
<div class="xvideo-container">
  <!-- 主内容区 -->
  <div class="xvideo-main">
    <!-- 品牌头部 -->
    <div class="xvideo-hero">
      <div class="xvideo-brand">
        <div class="xvideo-logo">
          <svg viewBox="0 0 24 24" fill="currentColor" class="x-logo">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </div>
        <div class="xvideo-brand-text">
          <h1>X 视频下载器</h1>
          <p>免费下载 X (Twitter) 上的任何视频</p>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="xvideo-input-card">
      <div class="xvideo-input-wrapper">
        <div class="xvideo-input-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <input type="text" id="tweetUrl" class="xvideo-input" 
               placeholder="粘贴 X/Twitter 推文链接...">
        <button id="pasteBtn" class="xvideo-paste-btn" title="粘贴">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
      </div>
      <button id="parseBtn" class="xvideo-parse-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        <span>解析视频</span>
      </button>
      <div class="xvideo-supported">
        <span class="xvideo-badge">✓ x.com</span>
        <span class="xvideo-badge">✓ twitter.com</span>
        <span class="xvideo-badge">✓ 无需登录</span>
      </div>
    </div>

    <!-- 状态提示 -->
    <div id="statusSection" class="xvideo-status-card" style="display: none;">
      <div class="xvideo-status-spinner"></div>
      <div class="xvideo-status-content">
        <span id="statusText">正在解析视频...</span>
        <span class="xvideo-status-hint">请稍候，正在获取视频信息</span>
      </div>
    </div>

    <!-- 错误提示 -->
    <div id="errorSection" class="xvideo-error-card" style="display: none;">
      <div class="xvideo-error-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <div class="xvideo-error-content">
        <span class="xvideo-error-title">解析失败</span>
        <span id="errorText" class="xvideo-error-msg"></span>
      </div>
      <button id="retryBtn" class="xvideo-retry-btn">重试</button>
    </div>

    <!-- 结果展示 -->
    <div id="resultSection" class="xvideo-result-card" style="display: none;">
      <div class="xvideo-video-wrapper">
        <video id="videoPreview" controls class="xvideo-video"></video>
        <div class="xvideo-video-overlay">
          <div class="xvideo-quality-badge" id="qualityBadge">HD</div>
        </div>
      </div>
      
      <div class="xvideo-meta">
        <div class="xvideo-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span id="tweetAuthor">-</span>
        </div>
        <div class="xvideo-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span id="tweetId">-</span>
        </div>
        <div class="xvideo-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
          <span id="videoQuality">-</span>
        </div>
      </div>

      <div class="xvideo-actions">
        <button id="downloadBtn" class="xvideo-action-btn xvideo-download-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>下载视频</span>
        </button>
        <button id="copyUrlBtn" class="xvideo-action-btn xvideo-copy-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span>复制链接</span>
        </button>
        <button id="shareBtn" class="xvideo-action-btn xvideo-share-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <span>分享</span>
        </button>
      </div>
    </div>

    <!-- 历史记录卡片 -->
    <div class="xvideo-history-card">
      <div class="xvideo-history-header">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          下载历史
        </h3>
        <button id="clearHistoryBtn" class="xvideo-clear-btn" title="清空历史">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
      <div id="historyList" class="xvideo-history-grid">
        <div class="xvideo-history-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>暂无下载记录</span>
        </div>
      </div>
    </div>
  </div>
</div>
`;
