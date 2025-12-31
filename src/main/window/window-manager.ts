/**
 * 窗口管理模块
 * 负责主窗口创建、Session 配置、权限管理等
 */

import { BrowserWindow, session, screen, ipcMain, dialog } from 'electron';
import path from 'node:path';

// ==================== 类型定义 ====================

export interface SiteDef {
    key: string;
    title: string;
    url: string;
    partition?: string;
}

// ==================== 配置常量 ====================

// 允许被 iframe 嵌入的站点域名列表
const FRAME_BYPASS_HOSTS = [
    'chat.deepseek.com',
    'auth.openai.com',
    'ab.chatgpt.com',
    'chat.openai.com',
    'chatgpt.com',
    'gemini.google.com',
    'accounts.google.com',
    'alkalimakersuite-pa.clients6.google.com',
    'makersuite.google.com',
    'generativelanguage.googleapis.com',
    'kimi.moonshot.cn',
    'grok.com',
    'accounts.x.ai',
    'lmarena.ai',
    'www.perplexity.ai',
    'perplexity.ai'
];

// 按域自定义 User-Agent
const UA_MAP: Record<string, string> = {
    'chat.openai.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'auth.openai.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'chatgpt.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'accounts.google.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'alkalimakersuite-pa.clients6.google.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'makersuite.google.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'grok.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'lmarena.ai': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'www.perplexity.ai': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'perplexity.ai': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
};

// 信任的站点列表（权限控制）
const TRUSTED_HOSTS = new Set<string>([
    'chat.openai.com', 'auth.openai.com', 'chatgpt.com', 'ab.chatgpt.com',
    'gemini.google.com', 'accounts.google.com',
    'alkalimakersuite-pa.clients6.google.com', 'makersuite.google.com',
    'chat.deepseek.com', 'kimi.moonshot.cn',
    'grok.com', 'accounts.x.ai',
    'lmarena.ai',
    'www.perplexity.ai', 'perplexity.ai'
]);

// 允许的权限列表
const ALLOW_PERMISSIONS = new Set([
    'clipboard-read',
    'clipboard-sanitized-write',
    'media',
    'display-capture',
    'geolocation'
]);

// ==================== 窗口管理器类 ====================

export class WindowManager {
    private mainWindow: BrowserWindow | null = null;
    private store: any = null;

    /**
     * 设置 Store
     */
    setStore(store: any): void {
        this.store = store;
    }

    /**
     * 安装 Frame Bypass（允许 iframe 嵌入）
     */
    installFrameBypass(): void {
        const ses = session.defaultSession;
        
        // 去掉 X-Frame-Options 和 CSP 中的 frame-ancestors
        ses.webRequest.onHeadersReceived((details, callback) => {
            try {
                const urlHost = new URL(details.url).host;
                if (!FRAME_BYPASS_HOSTS.includes(urlHost)) {
                    return callback({ responseHeaders: details.responseHeaders });
                }
                
                const newHeaders: Record<string, string | string[]> = {};
                for (const [k, v] of Object.entries(details.responseHeaders || {})) {
                    if (Array.isArray(v)) newHeaders[k] = v;
                    else if (typeof v === 'string') newHeaders[k] = v;
                }
                
                // 删除 X-Frame-Options
                for (const key of Object.keys(newHeaders)) {
                    if (key.toLowerCase() === 'x-frame-options') {
                        delete newHeaders[key];
                    }
                }
                
                // 处理 CSP
                for (const key of Object.keys(newHeaders)) {
                    if (key.toLowerCase() === 'content-security-policy') {
                        const val = newHeaders[key];
                        const arr = Array.isArray(val) ? val : [val];
                        const modified = arr.map(pol => pol
                            .split(';')
                            .filter(seg => !seg.trim().toLowerCase().startsWith('frame-ancestors'))
                            .join(';'));
                        newHeaders[key] = modified;
                    }
                }
                
                callback({
                    responseHeaders: newHeaders,
                    statusLine: details.statusLine
                });
            } catch (e) {
                callback({ responseHeaders: details.responseHeaders });
            }
        });

        // 设置按域 User-Agent
        ses.webRequest.onBeforeSendHeaders((details, callback) => {
            try {
                const host = new URL(details.url).host;
                if (UA_MAP[host] && (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame')) {
                    details.requestHeaders['User-Agent'] = UA_MAP[host];
                }

                // LMArena 特殊请求头
                if (host === 'lmarena.ai') {
                    Object.assign(details.requestHeaders, {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1'
                    });
                }

                // Google 特殊请求头
                if (host === 'accounts.google.com' || host.endsWith('.google.com')) {
                    Object.assign(details.requestHeaders, {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Ch-Ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
                        'Sec-Ch-Ua-Mobile': '?0',
                        'Sec-Ch-Ua-Platform': '"macOS"',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1'
                    });
                }
            } catch { /* ignore */ }
            callback({ requestHeaders: details.requestHeaders });
        });
    }

    /**
     * 安装权限管理
     */
    installPermissions(): void {
        const sessions: Electron.Session[] = [
            session.defaultSession,
            session.fromPartition('persist:openai'),
            session.fromPartition('persist:lmarena'),
            session.fromPartition('persist:gemini'),
            session.fromPartition('persist:deepseek'),
            session.fromPartition('persist:kimi'),
            session.fromPartition('persist:grok')
        ];

        for (const ses of sessions) {
            try {
                ses.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
                    try {
                        const host = requestingOrigin ? new URL(requestingOrigin).host : '';
                        return ALLOW_PERMISSIONS.has(permission) && TRUSTED_HOSTS.has(host);
                    } catch { return false; }
                });
                
                ses.setPermissionRequestHandler((_wc, permission, callback, details) => {
                    try {
                        const host = details?.requestingUrl ? new URL(details.requestingUrl).host : '';
                        const allow = ALLOW_PERMISSIONS.has(permission) && TRUSTED_HOSTS.has(host);
                        callback(allow);
                    } catch {
                        callback(false);
                    }
                });
            } catch { /* ignore */ }
        }
    }

    /**
     * 创建主窗口
     */
    createWindow(initialSite?: string, sites?: SiteDef[], __dirname?: string): BrowserWindow {
        const workArea = screen.getPrimaryDisplay().workAreaSize;
        const targetW = Math.max(400, Math.round(workArea.width * 0.7));
        const targetH = Math.max(320, Math.round(workArea.height * 0.7));
        
        this.mainWindow = new BrowserWindow({
            width: targetW,
            height: targetH,
            title: 'ToolHub Shell',
            minWidth: 400,
            minHeight: 320,
            backgroundColor: '#000000',
            titleBarStyle: 'hiddenInset',
            trafficLightPosition: { x: 12, y: 12 },
            icon: __dirname ? path.join(__dirname, '../assets/icons/icon.icns') : undefined,
            webPreferences: {
                preload: __dirname ? path.join(__dirname, 'preload.js') : undefined,
                nodeIntegration: false,
                contextIsolation: true,
                webviewTag: true,
                webSecurity: true,
                additionalArguments: [
                    '--enable-features=OverlayScrollbar,OverlayScrollbarFlashAfterAnyScrollUpdate,OverlayScrollbarFlashWhenMouseEnter',
                    '--disable-features=VizDisplayCompositor',
                    '--enable-gpu-rasterization',
                    '--enable-zero-copy'
                ]
            },
            show: false
        });

        // 窗口尺寸变化时保存
        this.mainWindow.on('resize', () => {
            if (!this.mainWindow) return;
            const b = this.mainWindow.getBounds();
            this.store?.set?.('windowBounds', { width: b.width, height: b.height });
        });

        this.mainWindow.setBackgroundColor('#000000');
        
        if (__dirname) {
            this.mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
        }

        // 页面加载完成后显示窗口
        this.mainWindow.webContents.once('did-finish-load', () => {
            this.mainWindow?.show();
            if (sites) {
                this.mainWindow?.webContents.send('init-data', { sites, lastSite: initialSite });
            }
        });

        // 注册 IPC 处理器
        this.setupIpcHandlers();

        return this.mainWindow;
    }

    /**
     * 设置 IPC 处理器
     */
    private setupIpcHandlers(): void {
        ipcMain.on('persist-last-site', (_e, key: string) => {
            this.store?.set?.('lastSite', key);
        });
        
        ipcMain.on('clear-active-partition', async (_e, partition: string) => {
            try {
                const ses = session.fromPartition(partition);
                await ses.clearStorageData();
                dialog.showMessageBox({ message: `已清理 ${partition} 数据` });
            } catch (err) {
                dialog.showErrorBox('清理失败', String(err));
            }
        });

        // 控制红绿灯按钮显示/隐藏
        ipcMain.on('set-traffic-light-visibility', (_e, visible: boolean) => {
            if (this.mainWindow && process.platform === 'darwin') {
                this.mainWindow.setWindowButtonVisibility(visible);
            }
        });
    }

    /**
     * 创建子窗口（用于打开外部站点）
     */
    loadSite(site: SiteDef): BrowserWindow {
        const child = new BrowserWindow({
            width: 1280,
            height: 860,
            title: site.title,
            webPreferences: {
                partition: site.partition || `persist:${site.key}`,
                nodeIntegration: false,
                contextIsolation: true,
            }
        });
        child.loadURL(site.url);
        return child;
    }

    /**
     * 获取主窗口
     */
    getMainWindow(): BrowserWindow | null {
        return this.mainWindow;
    }
}

// 导出单例
export const windowManager = new WindowManager();
