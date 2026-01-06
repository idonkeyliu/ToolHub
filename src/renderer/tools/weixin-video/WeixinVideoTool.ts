import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { template } from './template';

interface CapturedVideo {
  id: string;
  url: string;
  title: string;
  quality: string;
  size: number;
  timestamp: number;
  contentType: string;
}

interface ProxyStatus {
  running: boolean;
  port: number;
  capturedCount: number;
  proxyEnabled: boolean;
  error?: string;
}

export class WeixinVideoTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'weixin-video',
    title: '微信视频号下载',
    category: ToolCategory.VIDEO,
    icon: '📹',
    description: '一键抓取微信PC端视频号视频',
    keywords: ['weixin', 'wechat', '微信', '视频号', 'video', '下载'],
  };

  readonly config = WeixinVideoTool.config;

  private videos: CapturedVideo[] = [];
  private isRunning = false;

  render(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = template;
    return container;
  }

  protected bindEvents(): void {
    const toggleBtn = this.querySelector('#toggleProxy') as HTMLButtonElement;
    const clearBtn = this.querySelector('#clearVideos') as HTMLButtonElement;

    this.addEventListener(toggleBtn, 'click', () => this.toggleProxy());
    this.addEventListener(clearBtn, 'click', () => this.clearVideos());
  }

  protected onMounted(): void {
    this.loadStatus();
    this.setupListeners();
  }

  private setupListeners(): void {
    const api = (window as any).api;
    if (!api?.weixinProxy) return;

    // 监听视频捕获事件
    api.weixinProxy.onVideoCaptured((video: CapturedVideo) => {
      this.addVideo(video);
    });

    // 监听视频列表更新
    api.weixinProxy.onVideosUpdated((videos: CapturedVideo[]) => {
      this.videos = videos;
      this.renderVideoList();
    });
  }

  private async loadStatus(): Promise<void> {
    const api = (window as any).api;
    if (!api?.weixinProxy) return;

    try {
      const status: ProxyStatus = await api.weixinProxy.getStatus();
      this.isRunning = status.running;
      this.updateUI();

      if (status.running) {
        const videos = await api.weixinProxy.getVideos();
        this.videos = videos;
        this.renderVideoList();
      }
    } catch (err) {
      console.error('加载状态失败:', err);
    }
  }

  private async toggleProxy(): Promise<void> {
    const api = (window as any).api;
    if (!api?.weixinProxy) {
      alert('API 不可用，请确保在 Electron 环境中运行');
      return;
    }

    const toggleBtn = this.querySelector('#toggleProxy') as HTMLButtonElement;
    if (toggleBtn) {
      toggleBtn.disabled = true;
      const btnText = toggleBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = '处理中...';
    }

    try {
      if (this.isRunning) {
        // 停止：先关闭系统代理，再停止服务
        await api.weixinProxy.disableSystemProxy();
        const status = await api.weixinProxy.stop();
        this.isRunning = status.running;
      } else {
        // 启动：先启动服务，再开启系统代理
        const status = await api.weixinProxy.start();
        if (status.running) {
          const proxyResult = await api.weixinProxy.enableSystemProxy();
          if (!proxyResult.success) {
            alert(`代理服务已启动，但自动设置系统代理失败：${proxyResult.error}\n\n请手动设置系统代理为 127.0.0.1:${status.port}`);
          }
        } else if (status.error) {
          alert(`启动失败: ${status.error}`);
        }
        this.isRunning = status.running;
      }
      this.updateUI();
    } catch (err) {
      alert(`操作失败: ${(err as Error).message}`);
    } finally {
      if (toggleBtn) {
        toggleBtn.disabled = false;
      }
    }
  }

  private updateUI(): void {
    const toggleBtn = this.querySelector('#toggleProxy') as HTMLButtonElement;
    const statusIndicator = this.querySelector('#statusIndicator') as HTMLElement;
    const statusText = statusIndicator?.querySelector('.status-text') as HTMLElement;

    if (toggleBtn) {
      const btnIcon = toggleBtn.querySelector('.btn-icon') as HTMLElement;
      const btnText = toggleBtn.querySelector('.btn-text') as HTMLElement;

      if (this.isRunning) {
        toggleBtn.classList.add('running');
        if (btnIcon) btnIcon.textContent = '⏹';
        if (btnText) btnText.textContent = '停止抓取';
      } else {
        toggleBtn.classList.remove('running');
        if (btnIcon) btnIcon.textContent = '▶';
        if (btnText) btnText.textContent = '一键开启抓取';
      }
    }

    if (statusIndicator) {
      if (this.isRunning) {
        statusIndicator.classList.add('running');
        if (statusText) statusText.textContent = '抓取中...';
      } else {
        statusIndicator.classList.remove('running');
        if (statusText) statusText.textContent = '未启动';
      }
    }
  }

  private addVideo(video: CapturedVideo): void {
    // 避免重复
    if (!this.videos.find(v => v.id === video.id)) {
      this.videos.unshift(video);
      this.renderVideoList();
    }
  }

  private renderVideoList(): void {
    const listContainer = this.querySelector('#videoList') as HTMLElement;
    const emptyState = this.querySelector('#emptyState') as HTMLElement;
    const videoCount = this.querySelector('#videoCount') as HTMLElement;

    if (!listContainer) return;

    if (videoCount) {
      videoCount.textContent = String(this.videos.length);
    }

    if (this.videos.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      listContainer.innerHTML = '';
      listContainer.appendChild(emptyState);
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    listContainer.innerHTML = this.videos.map(video => `
      <div class="video-item" data-id="${video.id}">
        <div class="video-info">
          <div class="video-title" title="${this.escapeHtml(video.title)}">${this.escapeHtml(video.title)}</div>
          <div class="video-meta">
            <span>画质: ${video.quality}</span>
            <span>时间: ${this.formatTime(video.timestamp)}</span>
          </div>
        </div>
        <div class="video-actions">
          <button class="btn-download" data-id="${video.id}">下载</button>
          <button class="btn-remove" data-id="${video.id}">删除</button>
        </div>
      </div>
    `).join('');

    // 绑定按钮事件
    listContainer.querySelectorAll('.btn-download').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.id;
        if (id) this.downloadVideo(id);
      });
    });

    listContainer.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.id;
        if (id) this.removeVideo(id);
      });
    });
  }

  private async downloadVideo(id: string): Promise<void> {
    const video = this.videos.find(v => v.id === id);
    if (!video) return;

    const api = (window as any).api;
    if (!api?.weixinProxy) return;

    const btn = this.querySelector(`.btn-download[data-id="${id}"]`) as HTMLButtonElement;
    if (btn) {
      btn.classList.add('loading');
      btn.textContent = '下载中...';
    }

    try {
      const result = await api.weixinProxy.downloadVideo(video);
      if (result.success) {
        if (btn) btn.textContent = '已下载';
      } else if (!result.canceled) {
        alert(`下载失败: ${result.error}`);
        if (btn) btn.textContent = '下载';
      } else {
        if (btn) btn.textContent = '下载';
      }
    } catch (err) {
      alert(`下载失败: ${(err as Error).message}`);
      if (btn) btn.textContent = '下载';
    } finally {
      if (btn) btn.classList.remove('loading');
    }
  }

  private async removeVideo(id: string): Promise<void> {
    const api = (window as any).api;
    if (!api?.weixinProxy) return;

    try {
      await api.weixinProxy.removeVideo(id);
      this.videos = this.videos.filter(v => v.id !== id);
      this.renderVideoList();
    } catch (err) {
      console.error('删除失败:', err);
    }
  }

  private async clearVideos(): Promise<void> {
    if (this.videos.length === 0) return;
    
    if (!confirm('确定要清空所有捕获的视频吗？')) return;

    const api = (window as any).api;
    if (!api?.weixinProxy) return;

    try {
      await api.weixinProxy.clearVideos();
      this.videos = [];
      this.renderVideoList();
    } catch (err) {
      console.error('清空失败:', err);
    }
  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  protected onDestroy(): void {
    // 工具销毁时，确保关闭系统代理
    if (this.isRunning) {
      const api = (window as any).api;
      if (api?.weixinProxy) {
        api.weixinProxy.disableSystemProxy().catch(() => {});
        api.weixinProxy.stop().catch(() => {});
      }
    }
  }
}
