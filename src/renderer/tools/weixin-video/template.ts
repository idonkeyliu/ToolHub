export const template = `
<div class="weixin-video-tool">
  <div class="tool-header">
    <h3>微信视频号下载</h3>
    <p class="tool-desc">一键抓取微信PC端播放的视频号视频</p>
  </div>

  <div class="control-section">
    <div class="main-control">
      <button id="toggleProxy" class="btn-primary btn-large">
        <span class="btn-icon">▶</span>
        <span class="btn-text">一键开启抓取</span>
      </button>
      <div class="status-indicator" id="statusIndicator">
        <span class="status-dot"></span>
        <span class="status-text">未启动</span>
      </div>
    </div>
    
    <div class="tips-box" id="tipsBox">
      <div class="tips-title">📌 使用说明</div>
      <ol class="tips-list">
        <li>点击上方按钮开启抓取</li>
        <li>打开<strong>微信PC端</strong>，播放视频号视频</li>
        <li>视频会自动出现在下方列表</li>
        <li>点击下载按钮保存视频</li>
      </ol>
    </div>
  </div>

  <div class="video-section">
    <div class="section-header">
      <h4>捕获的视频 <span id="videoCount" class="badge">0</span></h4>
      <button id="clearVideos" class="btn-text" title="清空列表">🗑️ 清空</button>
    </div>
    
    <div class="video-list" id="videoList">
      <div class="empty-state" id="emptyState">
        <div class="empty-icon">📹</div>
        <p>暂无捕获的视频</p>
        <p class="empty-hint">开启抓取后，播放视频号视频即可自动捕获</p>
      </div>
    </div>
  </div>
</div>
`;
