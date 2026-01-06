/**
 * 微信视频号代理管理器
 * 通过本地代理拦截微信PC端的视频请求，提取视频地址
 */

import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { URL } from 'node:url';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { app } from 'electron';

const execAsync = promisify(exec);

export interface CapturedVideo {
  id: string;
  url: string;
  title: string;
  quality: string;
  size: number;
  timestamp: number;
  contentType: string;
}

export interface ProxyStatus {
  running: boolean;
  port: number;
  capturedCount: number;
  proxyEnabled: boolean;
  error?: string;
}

class WeixinProxyManager extends EventEmitter {
  private server: http.Server | null = null;
  private capturedVideos: Map<string, CapturedVideo> = new Map();
  private port = 9527;
  private running = false;
  private proxyEnabled = false;
  private originalNetworkService: string = '';

  // 视频号相关的域名
  private readonly VIDEO_DOMAINS = [
    'finder.video.qq.com',
    'findermp.video.qq.com', 
    'channels.weixin.qq.com',
    'szextshort.weixin.qq.com',
    'szshort.weixin.qq.com',
    'szvideo.weixin.qq.com',
  ];

  // 视频文件特征
  private readonly VIDEO_PATTERNS = [
    /\.mp4/i,
    /\.m4v/i,
    /\.webm/i,
    /video\/mp4/i,
    /stodownload/i,
    /getfindervideo/i,
    /mmfinderassistant/i,
  ];

  constructor() {
    super();
  }

  /**
   * 启动代理服务器
   */
  async start(port?: number): Promise<ProxyStatus> {
    if (this.running) {
      return this.getStatus();
    }

    if (port) {
      this.port = port;
    }

    return new Promise((resolve) => {
      try {
        this.server = http.createServer((req, res) => {
          this.handleRequest(req, res);
        });

        // 处理 HTTPS CONNECT 请求
        this.server.on('connect', (req, clientSocket: net.Socket, head) => {
          this.handleConnect(req, clientSocket, head);
        });

        this.server.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            // 端口被占用，尝试下一个端口
            this.port++;
            if (this.port < 9600) {
              this.server?.close();
              this.start(this.port).then(resolve);
            } else {
              this.running = false;
              resolve({
                running: false,
                port: this.port,
                capturedCount: 0,
                proxyEnabled: false,
                error: '无法找到可用端口',
              });
            }
          } else {
            this.running = false;
            resolve({
              running: false,
              port: this.port,
              capturedCount: 0,
              proxyEnabled: false,
              error: err.message,
            });
          }
        });

        this.server.listen(this.port, '127.0.0.1', () => {
          this.running = true;
          console.log(`[WeixinProxy] 代理服务器启动成功，端口: ${this.port}`);
          resolve(this.getStatus());
        });
      } catch (err) {
        resolve({
          running: false,
          port: this.port,
          capturedCount: 0,
          proxyEnabled: false,
          error: (err as Error).message,
        });
      }
    });
  }

  /**
   * 停止代理服务器
   */
  async stop(): Promise<ProxyStatus> {
    return new Promise((resolve) => {
      if (!this.server) {
        this.running = false;
        resolve(this.getStatus());
        return;
      }

      this.server.close(() => {
        this.running = false;
        this.server = null;
        console.log('[WeixinProxy] 代理服务器已停止');
        resolve(this.getStatus());
      });
    });
  }

  /**
   * 获取代理状态
   */
  getStatus(): ProxyStatus {
    return {
      running: this.running,
      port: this.port,
      capturedCount: this.capturedVideos.size,
      proxyEnabled: this.proxyEnabled,
    };
  }

  /**
   * 获取当前活动的网络服务名称 (macOS)
   */
  private async getActiveNetworkService(): Promise<string> {
    if (process.platform !== 'darwin') return '';
    
    try {
      // 获取所有网络服务
      const { stdout } = await execAsync('networksetup -listallnetworkservices');
      const services = stdout.split('\n').filter(s => s && !s.includes('*'));
      
      // 优先检查 Wi-Fi 和以太网
      const priorityServices = ['Wi-Fi', 'Ethernet', 'USB 10/100/1000 LAN'];
      for (const service of priorityServices) {
        if (services.includes(service)) {
          // 检查该服务是否有活动的 IP
          try {
            const { stdout: ipInfo } = await execAsync(`networksetup -getinfo "${service}"`);
            if (ipInfo.includes('IP address:') && !ipInfo.includes('IP address: none')) {
              return service;
            }
          } catch {}
        }
      }
      
      // 返回第一个可用的服务
      return services[0] || 'Wi-Fi';
    } catch {
      return 'Wi-Fi';
    }
  }

  /**
   * 启用系统代理 (一键设置)
   */
  async enableSystemProxy(): Promise<{ success: boolean; error?: string }> {
    try {
      if (process.platform === 'darwin') {
        // macOS
        const service = await this.getActiveNetworkService();
        this.originalNetworkService = service;
        
        // 设置 HTTP 代理
        await execAsync(`networksetup -setwebproxy "${service}" 127.0.0.1 ${this.port}`);
        await execAsync(`networksetup -setwebproxystate "${service}" on`);
        
        // 设置 HTTPS 代理
        await execAsync(`networksetup -setsecurewebproxy "${service}" 127.0.0.1 ${this.port}`);
        await execAsync(`networksetup -setsecurewebproxystate "${service}" on`);
        
        this.proxyEnabled = true;
        console.log(`[WeixinProxy] 已启用系统代理 (${service}): 127.0.0.1:${this.port}`);
        return { success: true };
        
      } else if (process.platform === 'win32') {
        // Windows - 使用注册表设置代理
        const proxyServer = `127.0.0.1:${this.port}`;
        await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f`);
        await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "${proxyServer}" /f`);
        
        // 刷新 IE 设置使代理生效
        await execAsync('netsh winhttp import proxy source=ie').catch(() => {});
        
        this.proxyEnabled = true;
        console.log(`[WeixinProxy] 已启用系统代理: ${proxyServer}`);
        return { success: true };
        
      } else {
        return { success: false, error: '不支持的操作系统' };
      }
    } catch (err) {
      console.error('[WeixinProxy] 启用系统代理失败:', err);
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * 禁用系统代理 (一键关闭)
   */
  async disableSystemProxy(): Promise<{ success: boolean; error?: string }> {
    try {
      if (process.platform === 'darwin') {
        // macOS
        const service = this.originalNetworkService || await this.getActiveNetworkService();
        
        // 关闭 HTTP 代理
        await execAsync(`networksetup -setwebproxystate "${service}" off`);
        
        // 关闭 HTTPS 代理
        await execAsync(`networksetup -setsecurewebproxystate "${service}" off`);
        
        this.proxyEnabled = false;
        console.log(`[WeixinProxy] 已禁用系统代理 (${service})`);
        return { success: true };
        
      } else if (process.platform === 'win32') {
        // Windows - 禁用代理
        await execAsync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f`);
        
        this.proxyEnabled = false;
        console.log('[WeixinProxy] 已禁用系统代理');
        return { success: true };
        
      } else {
        return { success: false, error: '不支持的操作系统' };
      }
    } catch (err) {
      console.error('[WeixinProxy] 禁用系统代理失败:', err);
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * 获取捕获的视频列表
   */
  getCapturedVideos(): CapturedVideo[] {
    return Array.from(this.capturedVideos.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 清空捕获的视频
   */
  clearCapturedVideos(): void {
    this.capturedVideos.clear();
    this.emit('videos-updated', []);
  }

  /**
   * 删除单个视频
   */
  removeVideo(id: string): void {
    this.capturedVideos.delete(id);
    this.emit('videos-updated', this.getCapturedVideos());
  }

  /**
   * 处理 HTTP 请求
   */
  private handleRequest(clientReq: http.IncomingMessage, clientRes: http.ServerResponse): void {
    const url = clientReq.url || '';
    
    // 检查是否是视频请求
    this.checkAndCaptureVideo(url, clientReq.headers);

    // 转发请求
    try {
      const targetUrl = new URL(url);
      const options: http.RequestOptions = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || 80,
        path: targetUrl.pathname + targetUrl.search,
        method: clientReq.method,
        headers: clientReq.headers,
      };

      const proxyReq = http.request(options, (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(clientRes);
      });

      proxyReq.on('error', (err) => {
        console.error('[WeixinProxy] 请求转发错误:', err.message);
        clientRes.writeHead(502);
        clientRes.end('Bad Gateway');
      });

      clientReq.pipe(proxyReq);
    } catch (err) {
      clientRes.writeHead(400);
      clientRes.end('Bad Request');
    }
  }

  /**
   * 处理 HTTPS CONNECT 请求（隧道代理）
   */
  private handleConnect(
    req: http.IncomingMessage,
    clientSocket: net.Socket,
    head: Buffer
  ): void {
    const [hostname, port] = (req.url || '').split(':');
    const targetPort = parseInt(port, 10) || 443;

    // 检查是否是视频号相关域名
    const isVideoDomain = this.VIDEO_DOMAINS.some(domain => 
      hostname.includes(domain) || hostname.endsWith('.qq.com') || hostname.endsWith('.weixin.qq.com')
    );

    if (isVideoDomain) {
      console.log(`[WeixinProxy] 检测到视频号域名: ${hostname}`);
    }

    // 建立到目标服务器的连接
    const serverSocket = net.connect(targetPort, hostname, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      serverSocket.write(head);
      
      // 双向管道
      serverSocket.pipe(clientSocket);
      clientSocket.pipe(serverSocket);
    });

    serverSocket.on('error', (err) => {
      console.error(`[WeixinProxy] 连接目标服务器失败: ${hostname}:${targetPort}`, err.message);
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      console.error('[WeixinProxy] 客户端连接错误:', err.message);
      serverSocket.end();
    });
  }

  /**
   * 检查并捕获视频 URL
   */
  private checkAndCaptureVideo(url: string, headers: http.IncomingHttpHeaders): void {
    // 检查是否匹配视频模式
    const isVideoUrl = this.VIDEO_PATTERNS.some(pattern => pattern.test(url));
    const isVideoDomain = this.VIDEO_DOMAINS.some(domain => url.includes(domain));

    if (isVideoUrl || isVideoDomain) {
      // 生成唯一 ID
      const id = this.generateVideoId(url);
      
      if (!this.capturedVideos.has(id)) {
        const video: CapturedVideo = {
          id,
          url,
          title: this.extractTitle(url),
          quality: this.extractQuality(url),
          size: 0,
          timestamp: Date.now(),
          contentType: headers['content-type'] || 'video/mp4',
        };

        this.capturedVideos.set(id, video);
        console.log(`[WeixinProxy] 捕获视频: ${video.title}`);
        this.emit('video-captured', video);
        this.emit('videos-updated', this.getCapturedVideos());
      }
    }
  }

  /**
   * 生成视频 ID
   */
  private generateVideoId(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 从 URL 提取标题
   */
  private extractTitle(url: string): string {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      // 尝试从参数中提取
      const possibleTitleParams = ['title', 'name', 'desc', 'description'];
      for (const param of possibleTitleParams) {
        const value = params.get(param);
        if (value) return decodeURIComponent(value);
      }

      // 使用路径的最后一部分
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && !lastPart.includes('.')) {
          return lastPart;
        }
      }

      return `视频号视频_${Date.now()}`;
    } catch {
      return `视频号视频_${Date.now()}`;
    }
  }

  /**
   * 从 URL 提取画质信息
   */
  private extractQuality(url: string): string {
    // 常见的画质标识
    if (url.includes('1080') || url.includes('fhd')) return '1080P';
    if (url.includes('720') || url.includes('hd')) return '720P';
    if (url.includes('480') || url.includes('sd')) return '480P';
    if (url.includes('360')) return '360P';
    
    // 视频号特有的画质标识
    if (url.includes('xWT111')) return '超清';
    if (url.includes('xWT98')) return '高清';
    if (url.includes('xWT70')) return '标清';
    
    return '未知';
  }

  /**
   * 下载视频
   */
  async downloadVideo(video: CapturedVideo, savePath: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      try {
        const urlObj = new URL(video.url);
        const protocol = urlObj.protocol === 'https:' ? https : http;

        const file = fs.createWriteStream(savePath);
        
        const request = protocol.get(video.url, (response) => {
          if (response.statusCode === 301 || response.statusCode === 302) {
            // 处理重定向
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              this.downloadVideo({ ...video, url: redirectUrl }, savePath).then(resolve);
              return;
            }
          }

          response.pipe(file);
          
          file.on('finish', () => {
            file.close();
            resolve({ success: true });
          });
        });

        request.on('error', (err) => {
          fs.unlink(savePath, () => {}); // 删除不完整的文件
          resolve({ success: false, error: err.message });
        });

        file.on('error', (err) => {
          fs.unlink(savePath, () => {});
          resolve({ success: false, error: err.message });
        });
      } catch (err) {
        resolve({ success: false, error: (err as Error).message });
      }
    });
  }

  /**
   * 获取系统代理设置命令（用于提示用户）
   */
  getProxyInstructions(): string {
    const proxyUrl = `127.0.0.1:${this.port}`;
    
    if (process.platform === 'darwin') {
      return `
macOS 设置步骤：
1. 打开「系统偏好设置」→「网络」
2. 选择当前网络连接 → 点击「高级」
3. 切换到「代理」标签页
4. 勾选「网页代理 (HTTP)」和「安全网页代理 (HTTPS)」
5. 服务器地址填写: 127.0.0.1  端口: ${this.port}
6. 点击「好」保存设置

或使用命令行：
networksetup -setwebproxy Wi-Fi ${proxyUrl}
networksetup -setsecurewebproxy Wi-Fi ${proxyUrl}
      `.trim();
    } else if (process.platform === 'win32') {
      return `
Windows 设置步骤：
1. 打开「设置」→「网络和 Internet」→「代理」
2. 在「手动代理设置」中开启「使用代理服务器」
3. 地址填写: 127.0.0.1  端口: ${this.port}
4. 点击「保存」

或使用命令行（管理员权限）：
netsh winhttp set proxy ${proxyUrl}
      `.trim();
    }

    return `请将系统代理设置为: ${proxyUrl}`;
  }
}

// 单例导出
export const weixinProxyManager = new WeixinProxyManager();
