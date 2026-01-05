import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { getTemplate } from './template';
import { i18n } from '../../core/i18n';

interface VideoInfo {
  tweetId: string;
  videoUrl: string;
  quality: string;
  timestamp: number;
  tweetUrl: string;
  author?: string;
}

export class XVideoTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'xvideo',
    title: i18n.t('xvideo.title') || 'X 视频下载',
    category: ToolCategory.NETWORK,
    icon: '📹',
    description: i18n.t('xvideo.desc') || '下载 X (Twitter) 视频，无需会员',
    keywords: ['x', 'twitter', 'video', 'download', '视频', '下载', '推特'],
  };

  readonly config = XVideoTool.config;

  private HISTORY_KEY = 'xvideo_download_history';
  private MAX_HISTORY = 20;
  private currentVideoUrl: string = '';
  private currentTweetId: string = '';

  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tool-view xvideo-tool';
    container.innerHTML = getTemplate();
    return container;
  }

  protected bindEvents(): void {
    this.setupParseButton();
    this.setupPasteButton();
    this.setupDownloadButton();
    this.setupCopyButton();
    this.setupShareButton();
    this.setupRetryButton();
    this.setupHistory();
    this.setupEnterKey();
  }

  private setupEnterKey(): void {
    const urlInput = this.querySelector('#tweetUrl') as HTMLInputElement;
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
        const urlInput = this.querySelector('#tweetUrl') as HTMLInputElement;
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
    const copyBtn = this.querySelector('#copyUrlBtn');
    this.addEventListener(copyBtn, 'click', () => this.copyVideoUrl());
  }

  private setupShareButton(): void {
    const shareBtn = this.querySelector('#shareBtn');
    this.addEventListener(shareBtn, 'click', () => {
      if (navigator.share && this.currentVideoUrl) {
        navigator.share({
          title: 'X 视频',
          url: this.currentVideoUrl,
        }).catch(() => {});
      } else {
        this.copyVideoUrl();
      }
    });
  }

  private setupRetryButton(): void {
    const retryBtn = this.querySelector('#retryBtn');
    this.addEventListener(retryBtn, 'click', () => {
      this.hideError();
      this.parseVideo();
    });
  }

  private extractTweetId(url: string): string | null {
    const patterns = [
      /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
      /status\/(\d+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  private extractAuthor(url: string): string {
    const match = url.match(/(?:twitter\.com|x\.com)\/(\w+)\/status/);
    return match ? `@${match[1]}` : '-';
  }

  private async parseVideo(): Promise<void> {
    const urlInput = this.querySelector('#tweetUrl') as HTMLInputElement;
    const parseBtn = this.querySelector('#parseBtn') as HTMLButtonElement;
    const tweetUrl = urlInput.value.trim();

    if (!tweetUrl) {
      this.showError('请输入推文链接');
      return;
    }

    if (!tweetUrl.includes('twitter.com') && !tweetUrl.includes('x.com')) {
      this.showError('请输入有效的 X/Twitter 链接');
      return;
    }

    const tweetId = this.extractTweetId(tweetUrl);
    if (!tweetId) {
      this.showError('无法解析推文 ID');
      return;
    }

    this.currentTweetId = tweetId;
    parseBtn.classList.add('loading');
    parseBtn.disabled = true;
    this.showStatus('正在解析视频链接...');
    this.hideError();
    this.hideResult();

    try {
      const videoUrl = await this.fetchVideoUrl(tweetUrl);
      
      if (videoUrl) {
        this.currentVideoUrl = videoUrl;
        const author = this.extractAuthor(tweetUrl);
        this.showResult(tweetId, videoUrl, author);
        this.addToHistory({
          tweetId,
          videoUrl,
          quality: this.extractQuality(videoUrl),
          timestamp: Date.now(),
          tweetUrl,
          author,
        });
      } else {
        this.showError('无法获取视频链接，可能原因：该推文不包含视频或已被删除');
      }
    } catch (error) {
      this.showError(`解析失败: ${error}`);
    } finally {
      parseBtn.classList.remove('loading');
      parseBtn.disabled = false;
      this.hideStatus();
    }
  }

  private async fetchVideoUrl(tweetUrl: string): Promise<string | null> {
    const apiUrl = `https://twitsave.com/info?url=${encodeURIComponent(tweetUrl)}`;
    
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });
      
      const html = await response.text();
      
      let match = html.match(/<video[^>]*src="(https:\/\/video\.twimg\.com[^"]+\.mp4)"/);
      if (match) {
        return match[1].replace(/&amp;/g, '&');
      }
      
      match = html.match(/href="(https:\/\/[^"]*video\.twimg\.com[^"]*\.mp4[^"]*)"/);
      if (match) {
        return match[1].replace(/&amp;/g, '&');
      }
      
      return null;
    } catch (error) {
      console.error('Fetch error:', error);
      return null;
    }
  }

  private extractQuality(url: string): string {
    const match = url.match(/\/(\d+x\d+)\//);
    if (match) {
      return match[1];
    }
    
    const pathMatch = url.match(/vid\/avc1\/(\d+x\d+)/);
    if (pathMatch) {
      return pathMatch[1];
    }
    
    return 'HD';
  }

  private showStatus(text: string): void {
    const statusSection = this.querySelector('#statusSection') as HTMLElement;
    const statusText = this.querySelector('#statusText') as HTMLElement;
    
    if (statusSection && statusText) {
      statusText.textContent = text;
      statusSection.style.display = 'flex';
    }
  }

  private hideStatus(): void {
    const statusSection = this.querySelector('#statusSection') as HTMLElement;
    if (statusSection) {
      statusSection.style.display = 'none';
    }
  }

  private showResult(tweetId: string, videoUrl: string, author: string): void {
    const resultSection = this.querySelector('#resultSection') as HTMLElement;
    const videoPreview = this.querySelector('#videoPreview') as HTMLVideoElement;
    const tweetIdEl = this.querySelector('#tweetId') as HTMLElement;
    const qualityEl = this.querySelector('#videoQuality') as HTMLElement;
    const authorEl = this.querySelector('#tweetAuthor') as HTMLElement;
    const qualityBadge = this.querySelector('#qualityBadge') as HTMLElement;

    if (resultSection && videoPreview && tweetIdEl && qualityEl) {
      videoPreview.src = videoUrl;
      tweetIdEl.textContent = tweetId;
      const quality = this.extractQuality(videoUrl);
      qualityEl.textContent = quality;
      if (authorEl) authorEl.textContent = author;
      if (qualityBadge) qualityBadge.textContent = quality.includes('1280') ? 'HD' : quality.includes('1920') ? 'FHD' : 'SD';
      resultSection.style.display = 'block';
    }
  }

  private hideResult(): void {
    const resultSection = this.querySelector('#resultSection') as HTMLElement;
    if (resultSection) {
      resultSection.style.display = 'none';
    }
  }

  private showError(text: string): void {
    const errorSection = this.querySelector('#errorSection') as HTMLElement;
    const errorText = this.querySelector('#errorText') as HTMLElement;

    if (errorSection && errorText) {
      errorText.textContent = text;
      errorSection.style.display = 'flex';
    }
  }

  private hideError(): void {
    const errorSection = this.querySelector('#errorSection') as HTMLElement;
    if (errorSection) {
      errorSection.style.display = 'none';
    }
  }

  private async downloadVideo(): Promise<void> {
    if (!this.currentVideoUrl) {
      this.showError('没有可下载的视频');
      return;
    }

    const downloadBtn = this.querySelector('#downloadBtn') as HTMLButtonElement;
    const originalContent = downloadBtn.innerHTML;
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: xvideo-spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/>
      </svg>
      <span>下载中...</span>
    `;

    try {
      const filename = `x_video_${this.currentTweetId}_${Date.now()}.mp4`;
      
      const response = await fetch(this.currentVideoUrl);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast('下载已开始');
    } catch (error) {
      this.showError(`下载失败: ${error}`);
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = originalContent;
    }
  }

  private copyVideoUrl(): void {
    if (!this.currentVideoUrl) {
      this.showError('没有可复制的链接');
      return;
    }

    const copyBtn = this.querySelector('#copyUrlBtn') as HTMLButtonElement;
    navigator.clipboard.writeText(this.currentVideoUrl).then(() => {
      copyBtn.classList.add('copied');
      this.showToast('链接已复制到剪贴板');
      setTimeout(() => copyBtn.classList.remove('copied'), 2000);
    }).catch(() => {
      this.showError('复制失败');
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
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(22, 163, 74, 0.95) 100%);
      color: white;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 8px 32px rgba(34, 197, 94, 0.3);
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

  private setupHistory(): void {
    this.loadHistory();
    
    const clearBtn = this.querySelector('#clearHistoryBtn');
    this.addEventListener(clearBtn, 'click', () => this.clearHistory());
  }

  private loadHistory(): void {
    const historyList = this.querySelector('#historyList') as HTMLElement;
    if (!historyList) return;

    try {
      const history: VideoInfo[] = JSON.parse(localStorage.getItem(this.HISTORY_KEY) || '[]');
      
      if (history.length === 0) {
        historyList.innerHTML = `
          <div class="xvideo-history-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>暂无下载记录</span>
          </div>
        `;
        return;
      }

      historyList.innerHTML = history.map(item => `
        <div class="xvideo-history-item" data-url="${item.tweetUrl}">
          <div class="xvideo-history-info">
            <div class="xvideo-history-url">${item.author || '@unknown'}</div>
            <div class="xvideo-history-time">${this.formatTime(item.timestamp)} · ${item.quality}</div>
          </div>
          <div class="xvideo-history-actions">
            <button class="xvideo-history-btn" data-action="load" data-url="${item.tweetUrl}">加载</button>
          </div>
        </div>
      `).join('');

      historyList.querySelectorAll('.xvideo-history-btn').forEach(btn => {
        this.addEventListener(btn as HTMLElement, 'click', (e: Event) => {
          e.stopPropagation();
          const target = e.target as HTMLElement;
          const action = target.dataset.action;
          
          if (action === 'load') {
            const url = target.dataset.url;
            if (url) {
              const urlInput = this.querySelector('#tweetUrl') as HTMLInputElement;
              urlInput.value = url;
              this.parseVideo();
            }
          }
        });
      });
    } catch (e) {
      console.error('Load history error:', e);
    }
  }

  private addToHistory(info: VideoInfo): void {
    try {
      let history: VideoInfo[] = JSON.parse(localStorage.getItem(this.HISTORY_KEY) || '[]');
      
      history = history.filter(item => item.tweetId !== info.tweetId);
      history.unshift(info);
      
      if (history.length > this.MAX_HISTORY) {
        history = history.slice(0, this.MAX_HISTORY);
      }
      
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
      this.loadHistory();
    } catch (e) {
      console.error('Save history error:', e);
    }
  }

  private clearHistory(): void {
    localStorage.removeItem(this.HISTORY_KEY);
    this.loadHistory();
    this.showToast('历史记录已清空');
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
