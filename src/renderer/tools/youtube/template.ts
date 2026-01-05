export const getTemplate = (): string => `
<div class="yt-container">
  <!-- 主内容区 -->
  <div class="yt-main">
    <!-- 品牌头部 -->
    <div class="yt-hero">
      <div class="yt-brand">
        <div class="yt-logo">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </div>
        <div class="yt-brand-text">
          <h1>YouTube 下载器</h1>
          <p>高清下载 YouTube 视频，支持多种格式</p>
        </div>
      </div>
      <div class="yt-hero-stats">
        <div class="yt-stat">
          <span class="yt-stat-value">4K</span>
          <span class="yt-stat-label">最高画质</span>
        </div>
        <div class="yt-stat">
          <span class="yt-stat-value">MP4</span>
          <span class="yt-stat-label">视频格式</span>
        </div>
        <div class="yt-stat">
          <span class="yt-stat-value">MP3</span>
          <span class="yt-stat-label">音频格式</span>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="yt-input-card">
      <div class="yt-input-wrapper">
        <div class="yt-input-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <input type="text" id="youtubeUrl" class="yt-input" 
               placeholder="粘贴 YouTube 视频链接...">
        <button id="pasteBtn" class="yt-paste-btn" title="粘贴">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
      </div>
      <button id="parseBtn" class="yt-parse-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        <span>解析视频</span>
      </button>
      <div class="yt-supported">
        <span class="yt-badge">✓ youtube.com</span>
        <span class="yt-badge">✓ youtu.be</span>
        <span class="yt-badge">✓ 播放列表</span>
      </div>
    </div>

    <!-- 状态提示 -->
    <div id="statusArea" class="yt-status-card" style="display: none;">
      <div class="yt-status-spinner"></div>
      <div class="yt-status-content">
        <span id="statusText">正在解析视频...</span>
        <span class="yt-status-hint">请稍候，正在获取视频信息</span>
      </div>
    </div>

    <!-- 结果展示 -->
    <div id="resultArea" class="yt-result-card" style="display: none;">
      <!-- 视频预览 -->
      <div class="yt-preview">
        <img id="videoThumbnail" class="yt-thumbnail" src="" alt="视频缩略图" />
        <div class="yt-preview-overlay">
          <div class="yt-play-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
          <div class="yt-duration" id="videoDurationBadge">00:00</div>
        </div>
      </div>

      <!-- 视频信息 -->
      <div class="yt-video-info">
        <h3 id="videoTitle" class="yt-video-title"></h3>
        <div class="yt-video-meta">
          <div class="yt-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span id="videoAuthor">-</span>
          </div>
          <div class="yt-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span id="videoDuration">-</span>
          </div>
          <div class="yt-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span id="videoViews">-</span>
          </div>
        </div>
      </div>

      <!-- 格式选择 -->
      <div class="yt-formats">
        <div class="yt-format-header">
          <h4>选择下载格式</h4>
          <div class="yt-format-tabs">
            <button class="yt-format-tab active" data-type="video">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              视频
            </button>
            <button class="yt-format-tab" data-type="audio">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
              音频
            </button>
          </div>
        </div>
        <div id="formatList" class="yt-format-list"></div>
      </div>

      <!-- 操作按钮 -->
      <div class="yt-actions">
        <button id="copyLinkBtn" class="yt-action-btn yt-copy-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span>复制链接</span>
        </button>
        <button id="downloadBtn" class="yt-action-btn yt-download-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>下载</span>
        </button>
      </div>
    </div>
  </div>

  <!-- 侧边栏 -->
  <div class="yt-sidebar">
    <div class="yt-sidebar-header">
      <h3>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        下载历史
      </h3>
      <button id="clearHistoryBtn" class="yt-clear-btn" title="清空历史">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
    <div id="historyList" class="yt-history-list">
      <div class="yt-history-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>暂无下载记录</span>
      </div>
    </div>
  </div>
</div>
`;
