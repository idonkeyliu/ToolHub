import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { getTemplate } from './template';
import { i18n } from '../../core/i18n';

interface VideoFormat {
  quality: string;
  format: string;
  url: string;
  size?: string;
  type: 'video' | 'audio';
}

interface VideoInfo {
  videoId: string;
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
  views?: string;
  formats: VideoFormat[];
  timestamp: number;
  directUrl?: string;  // 直接下载链接
}

export class YoutubeTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'youtube-dl',
    title: i18n.t('youtube.title') || 'YouTube 下载',
    category: ToolCategory.VIDEO,
    icon: '📺',
    description: i18n.t('youtube.desc') || '下载 YouTube 视频',
    keywords: ['youtube', 'video', 'download', '视频', '下载', 'yt'],
  };

  readonly config = YoutubeTool.config;

  private HISTORY_KEY = 'youtube_download_history';
  private MAX_HISTORY = 20;
  private currentVideoInfo: VideoInfo | null = null;
  private selectedFormat: VideoFormat | null = null;
  private currentFormatType: 'video' | 'audio' = 'video';

  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tool-view youtube-tool-container';
    container.innerHTML = getTemplate();
    return container;
  }

  protected bindEvents(): void {
    this.setupParseButton();
    this.setupPasteButton();
    this.setupDownloadButton();
    this.setupCopyButton();
    this.setupFormatTabs();
    this.setupHistory();
    this.setupEnterKey();
    this.setupClearHistory();
  }

  private setupEnterKey(): void {
    const urlInput = this.querySelector('#youtubeUrl') as HTMLInputElement;
    this.addEventListener(urlInput, 'keypress', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        this.parseVideo();
      }
    });
  }

  private setupPasteButton(): void {
    const pasteBtn = this.querySelector('#pasteBtn');
    this.addEventListener(pasteBtn, 'click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        const urlInput = this.querySelector('#youtubeUrl') as HTMLInputElement;
        urlInput.value = text;
        urlInput.focus();
      } catch (e) {
        this.showToast('无法访问剪贴板');
      }
    });
  }

  private setupParseButton(): void {
    const parseBtn = this.querySelector('#parseBtn');
    this.addEventListener(parseBtn, 'click', () => this.parseVideo());
  }

  private setupDownloadButton(): void {
    const downloadBtn = this.querySelector('#downloadBtn');
    this.addEventListener(downloadBtn, 'click', () => this.downloadVideo());
  }

  private setupCopyButton(): void {
    const copyBtn = this.querySelector('#copyLinkBtn');
    this.addEventListener(copyBtn, 'click', () => this.copyLink());
  }

  private setupFormatTabs(): void {
    const tabs = this.querySelectorAll('.yt-format-tab');
    tabs.forEach(tab => {
      this.addEventListener(tab as HTMLElement, 'click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentFormatType = (tab as HTMLElement).dataset.type as 'video' | 'audio';
        if (this.currentVideoInfo) {
          this.renderFormats(this.currentVideoInfo.formats);
        }
      });
    });
  }

  private setupClearHistory(): void {
    const clearBtn = this.querySelector('#clearHistoryBtn');
    this.addEventListener(clearBtn, 'click', () => {
      localStorage.removeItem(this.HISTORY_KEY);
      this.renderHistory();
      this.showToast('历史记录已清空');
    });
  }

  private async parseVideo(): Promise<void> {
    const urlInput = this.querySelector('#youtubeUrl') as HTMLInputElement;
    const parseBtn = this.querySelector('#parseBtn') as HTMLButtonElement;
    const url = urlInput.value.trim();

    if (!url) {
      this.showStatus('请输入 YouTube 视频链接', 'error');
      return;
    }

    const videoId = this.extractVideoId(url);
    if (!videoId) {
      this.showStatus('无效的 YouTube 链接', 'error');
      return;
    }

    parseBtn.classList.add('loading');
    parseBtn.disabled = true;
    this.showStatus('正在解析视频信息...', 'loading');
    this.hideResult();

    try {
      const videoInfo = await this.fetchVideoInfo(videoId, url);
      if (videoInfo) {
        this.currentVideoInfo = videoInfo;
        this.showResult(videoInfo);
        this.hideStatusCard();
      } else {
        this.showStatus('解析失败，请检查链接是否正确', 'error');
      }
    } catch (error) {
      this.showStatus(`解析失败: ${(error as Error).message}`, 'error');
    } finally {
      parseBtn.classList.remove('loading');
      parseBtn.disabled = false;
    }
  }

  private extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  private async fetchVideoInfo(videoId: string, originalUrl: string): Promise<VideoInfo | null> {
    // 优先使用 yt-dlp 获取完整信息
    try {
      const result = await (window as any).llmHub?.youtube?.getVideoInfo(videoId);
      if (result?.success && result.info) {
        return {
          videoId,
          title: result.info.title || `YouTube Video (${videoId})`,
          thumbnail: result.info.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          duration: result.info.duration || '',
          author: result.info.author || '',
          views: result.info.views || '',
          formats: this.getDefaultFormats(),
          timestamp: Date.now(),
        };
      }
    } catch (e) {
      console.warn('yt-dlp info failed:', e);
    }
    
    // 备用：使用 noembed
    let basicInfo: VideoInfo | null = null;
    
    try {
      basicInfo = await this.tryNoembed(videoId);
    } catch (e) {
      console.warn('Noembed failed:', e);
    }
    
    if (!basicInfo) {
      basicInfo = await this.tryYtdl(videoId);
    }
    
    return basicInfo;
  }

  private async fetchDirectUrl(videoId: string): Promise<string | null> {
    // 使用 yt-dlp 获取直链
    try {
      const result = await (window as any).llmHub?.youtube?.getVideoUrl(videoId, 'video');
      if (result?.success && result.url) {
        return result.url;
      }
      console.warn('yt-dlp failed:', result?.error);
    } catch (e) {
      console.warn('yt-dlp API failed:', e);
    }
    
    return null;
  }

  private async tryNoembed(videoId: string): Promise<VideoInfo | null> {
    try {
      const noembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(noembedUrl);
      const data = await response.json();

      if (data.title) {
        return {
          videoId,
          title: data.title,
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          duration: '',
          author: data.author_name || '',
          formats: this.getDefaultFormats(),
          timestamp: Date.now(),
        };
      }
    } catch (e) {
      console.warn('Noembed failed:', e);
    }

    return null;
  }

  private async tryYtdl(videoId: string): Promise<VideoInfo | null> {
    return {
      videoId,
      title: `YouTube Video (${videoId})`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: '',
      author: '',
      formats: this.getDefaultFormats(),
      timestamp: Date.now(),
    };
  }

  private getDefaultFormats(): VideoFormat[] {
    return [
      { quality: '4K', format: 'mp4', url: '', type: 'video' },
      { quality: '1080p', format: 'mp4', url: '', type: 'video' },
      { quality: '720p', format: 'mp4', url: '', type: 'video' },
      { quality: '480p', format: 'mp4', url: '', type: 'video' },
      { quality: '360p', format: 'mp4', url: '', type: 'video' },
      { quality: '320kbps', format: 'mp3', url: '', type: 'audio' },
      { quality: '256kbps', format: 'mp3', url: '', type: 'audio' },
      { quality: '128kbps', format: 'mp3', url: '', type: 'audio' },
    ];
  }

  private showStatus(message: string, type: 'loading' | 'error' | 'success', progress?: number): void {
    const statusArea = this.querySelector('#statusArea') as HTMLElement;
    const statusText = this.querySelector('#statusText') as HTMLElement;
    const statusHint = statusArea.querySelector('.yt-status-hint') as HTMLElement;
    const spinner = statusArea.querySelector('.yt-status-spinner') as HTMLElement;
    let progressBar = statusArea.querySelector('.yt-progress-bar') as HTMLElement;
    let progressFill = statusArea.querySelector('.yt-progress-fill') as HTMLElement;
    let progressText = statusArea.querySelector('.yt-progress-text') as HTMLElement;
    
    if (statusText) statusText.textContent = message;
    
    statusArea.classList.remove('error', 'success');
    if (type !== 'loading') {
      statusArea.classList.add(type);
    }
    
    if (spinner) {
      spinner.style.display = type === 'loading' && progress === undefined ? 'block' : 'none';
    }
    
    // 进度条处理
    if (progress !== undefined) {
      if (!progressBar) {
        // 创建进度条
        progressBar = document.createElement('div');
        progressBar.className = 'yt-progress-bar';
        progressBar.innerHTML = `
          <div class="yt-progress-fill"></div>
          <span class="yt-progress-text">0%</span>
        `;
        statusArea.appendChild(progressBar);
        progressFill = progressBar.querySelector('.yt-progress-fill') as HTMLElement;
        progressText = progressBar.querySelector('.yt-progress-text') as HTMLElement;
      }
      progressBar.style.display = 'block';
      if (progressFill) progressFill.style.width = `${progress}%`;
      if (progressText) progressText.textContent = `${progress.toFixed(1)}%`;
    } else if (progressBar) {
      progressBar.style.display = 'none';
    }
    
    if (statusHint) {
      statusHint.style.display = type === 'loading' ? 'block' : 'none';
    }
    
    statusArea.style.display = 'flex';
  }

  private hideStatusCard(): void {
    const statusArea = this.querySelector('#statusArea') as HTMLElement;
    statusArea.style.display = 'none';
  }

  private showResult(info: VideoInfo): void {
    const resultArea = this.querySelector('#resultArea') as HTMLElement;
    const thumbnail = this.querySelector('#videoThumbnail') as HTMLImageElement;
    const title = this.querySelector('#videoTitle') as HTMLElement;
    const duration = this.querySelector('#videoDuration') as HTMLElement;
    const durationBadge = this.querySelector('#videoDurationBadge') as HTMLElement;
    const author = this.querySelector('#videoAuthor') as HTMLElement;
    const views = this.querySelector('#videoViews') as HTMLElement;

    thumbnail.src = info.thumbnail;
    thumbnail.onerror = () => {
      thumbnail.src = `https://img.youtube.com/vi/${info.videoId}/hqdefault.jpg`;
    };
    title.textContent = info.title;
    if (duration) duration.textContent = info.duration || '-';
    if (durationBadge) durationBadge.textContent = info.duration || '00:00';
    if (author) author.textContent = info.author || '-';
    if (views) views.textContent = info.views || '-';

    this.renderFormats(info.formats);
    resultArea.style.display = 'block';
  }

  private renderFormats(formats: VideoFormat[]): void {
    const formatList = this.querySelector('#formatList') as HTMLElement;
    const filteredFormats = formats.filter(f => f.type === this.currentFormatType);

    formatList.innerHTML = filteredFormats.map((f, i) => `
      <div class="yt-format-item ${i === 0 ? 'selected' : ''}" data-index="${formats.indexOf(f)}">
        <span class="yt-format-quality">${f.quality}</span>
        <span class="yt-format-info">${f.format.toUpperCase()}${f.size ? ` · ${f.size}` : ''}</span>
      </div>
    `).join('');

    if (filteredFormats.length > 0) {
      this.selectedFormat = filteredFormats[0];
    }

    formatList.querySelectorAll('.yt-format-item').forEach(item => {
      this.addEventListener(item as HTMLElement, 'click', () => {
        formatList.querySelectorAll('.yt-format-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        const index = parseInt((item as HTMLElement).dataset.index || '0');
        this.selectedFormat = formats[index];
      });
    });
  }

  private hideResult(): void {
    const resultArea = this.querySelector('#resultArea') as HTMLElement;
    resultArea.style.display = 'none';
  }

  private async downloadVideo(): Promise<void> {
    if (!this.currentVideoInfo) {
      this.showStatus('请先解析视频', 'error');
      return;
    }

    const downloadBtn = this.querySelector('#downloadBtn') as HTMLButtonElement;
    const originalContent = downloadBtn.innerHTML;
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/>
      </svg>
      <span>下载中...</span>
    `;

    try {
      const videoId = this.currentVideoInfo.videoId;
      const isAudio = this.currentFormatType === 'audio';
      
      this.showStatus('正在下载视频...', 'loading', 0);
      
      // 监听进度
      const youtube = (window as any).llmHub?.youtube;
      if (youtube?.onProgress) {
        youtube.onProgress((data: { videoId: string; progress: number; line: string }) => {
          if (data.videoId === videoId) {
            this.showStatus(`下载中: ${data.progress.toFixed(1)}%`, 'loading', data.progress);
          }
        });
      }
      
      // 使用 yt-dlp 直接下载到本地
      const result = await youtube?.download(videoId, isAudio ? 'audio' : 'video');
      
      // 移除进度监听
      youtube?.removeProgressListener?.();
      
      if (result?.success) {
        this.saveToHistory(this.currentVideoInfo);
        this.showStatus(`下载完成！文件保存在: ${result.downloadDir}`, 'success');
        this.showToast('下载完成');
      } else {
        this.showStatus(`下载失败: ${result?.error || '未知错误'}`, 'error');
      }
    } catch (error) {
      this.showStatus(`下载失败: ${error}`, 'error');
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = originalContent;
    }
  }

  private copyLink(): void {
    if (!this.currentVideoInfo) return;

    const copyBtn = this.querySelector('#copyLinkBtn') as HTMLButtonElement;
    const url = `https://www.youtube.com/watch?v=${this.currentVideoInfo.videoId}`;
    
    navigator.clipboard.writeText(url).then(() => {
      copyBtn.classList.add('copied');
      this.showToast('链接已复制到剪贴板');
      setTimeout(() => copyBtn.classList.remove('copied'), 2000);
    }).catch(() => {
      this.showStatus('复制失败', 'error');
    });
  }

  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      padding: 14px 28px;
      background: linear-gradient(135deg, rgba(255, 0, 0, 0.95) 0%, rgba(204, 0, 0, 0.95) 100%);
      color: white;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 8px 32px rgba(255, 0, 0, 0.3);
      backdrop-filter: blur(8px);
      opacity: 0;
      transition: all 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 2500);
  }

  private saveToHistory(info: VideoInfo): void {
    const history = this.getHistory();
    
    const filtered = history.filter(h => h.videoId !== info.videoId);
    filtered.unshift(info);
    
    const limited = filtered.slice(0, this.MAX_HISTORY);
    
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(limited));
    this.renderHistory();
  }

  private getHistory(): VideoInfo[] {
    try {
      const data = localStorage.getItem(this.HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private setupHistory(): void {
    this.renderHistory();
  }

  private renderHistory(): void {
    const historyList = this.querySelector('#historyList') as HTMLElement;
    const history = this.getHistory();

    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="yt-history-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>暂无下载记录</span>
        </div>
      `;
      return;
    }

    historyList.innerHTML = history.map(item => `
      <div class="yt-history-item" data-video-id="${item.videoId}">
        <img class="yt-history-thumb" src="${item.thumbnail}" alt="" 
             onerror="this.src='https://img.youtube.com/vi/${item.videoId}/default.jpg'" />
        <div class="yt-history-info">
          <div class="yt-history-title">${item.title}</div>
          <div class="yt-history-meta">
            <span>${item.author || 'Unknown'}</span>
            <span>${this.formatTime(item.timestamp)}</span>
          </div>
        </div>
        <div class="yt-history-actions">
          <button class="yt-history-btn">再次下载</button>
        </div>
      </div>
    `).join('');

    historyList.querySelectorAll('.yt-history-btn').forEach(btn => {
      this.addEventListener(btn as HTMLElement, 'click', (e: Event) => {
        const item = (e.target as HTMLElement).closest('.yt-history-item') as HTMLElement;
        const videoId = item?.dataset.videoId;
        if (videoId) {
          const urlInput = this.querySelector('#youtubeUrl') as HTMLInputElement;
          urlInput.value = `https://www.youtube.com/watch?v=${videoId}`;
          this.parseVideo();
        }
      });
    });
  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  }
}
