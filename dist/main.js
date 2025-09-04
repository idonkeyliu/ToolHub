import { app, BrowserWindow, Menu, dialog, shell, session, ipcMain, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Store from 'electron-store';
// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const store = new Store();
const sites = [
    { key: 'openai', title: 'OpenAI ChatGPT', url: 'https://chat.openai.com', partition: 'persist:openai' },
    { key: 'lmarena', title: 'LMArena', url: 'https://lmarena.ai/', partition: 'persist:lmarena' },
    { key: 'gemini', title: 'Google Gemini', url: 'https://gemini.google.com', partition: 'persist:gemini' },
    { key: 'deepseek', title: 'DeepSeek', url: 'https://chat.deepseek.com', partition: 'persist:deepseek' },
    { key: 'kimi', title: 'Kimi (Moonshot)', url: 'https://kimi.moonshot.cn', partition: 'persist:kimi' },
    { key: 'grok', title: 'Grok (xAI)', url: 'https://grok.com', partition: 'persist:grok' },
];
let mainWindow = null;
// 允许被 iframe 嵌入的站点域名列表（仅对这些域名做 header 调整）
const FRAME_BYPASS_HOSTS = [
    'chat.deepseek.com',
    'auth.openai.com',
    'ab.chatgpt.com',
    'chat.openai.com',
    'chatgpt.com',
    'gemini.google.com',
    'accounts.google.com', // Gemini 登录/刷新Cookie流程
    'aistudio.google.com', // Google AI Studio
    'kimi.moonshot.cn',
    'grok.com',
    'accounts.x.ai', // Grok 登录重定向域
    'lmarena.ai' // LM Arena 排行榜
];
// 按域自定义 UA（用户需求：GPT / Grok）。可按需再扩展。
const UA_MAP = {
    'chat.openai.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'auth.openai.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'chatgpt.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'aistudio.google.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'grok.com': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'lmarena.ai': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
};
function installFrameBypass() {
    const ses = session.defaultSession; // BrowserWindow (及其中 iframe) 使用的默认 session
    // 去掉 X-Frame-Options，并移除 CSP 中的 frame-ancestors 限制
    ses.webRequest.onHeadersReceived((details, callback) => {
        try {
            const urlHost = new URL(details.url).host;
            if (!FRAME_BYPASS_HOSTS.includes(urlHost)) {
                return callback({ responseHeaders: details.responseHeaders });
            }
            const newHeaders = {};
            // 复制并规范化（过滤掉 undefined）
            for (const [k, v] of Object.entries(details.responseHeaders || {})) {
                if (Array.isArray(v))
                    newHeaders[k] = v;
                else if (typeof v === 'string')
                    newHeaders[k] = v;
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
        }
        catch (e) {
            callback({ responseHeaders: details.responseHeaders });
        }
    });
    // 可选：拦截 frame busting（简单替换常见 window.top !== window.self 跳出脚本）
    // 复杂脚本很难完全规避，这里只做最小示例，如需更强策略需构建反向代理。
    // ses.webRequest.onBeforeRequest({ urls: FRAME_BYPASS_HOSTS.map(h => `*://${h}/*`) }, (details, callback) => {
    //     callback({ cancel: false });
    // });
    // 设置按域 User-Agent（只针对主框架与子框架 document 请求）
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
        try {
            const host = new URL(details.url).host;
            if (UA_MAP[host] && (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame')) {
                details.requestHeaders['User-Agent'] = UA_MAP[host];
            }
            // 为LMArena添加额外的请求头来避免403错误
            if (host === 'lmarena.ai') {
                details.requestHeaders['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8';
                details.requestHeaders['Accept-Language'] = 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7';
                details.requestHeaders['Accept-Encoding'] = 'gzip, deflate, br';
                details.requestHeaders['Cache-Control'] = 'no-cache';
                details.requestHeaders['Pragma'] = 'no-cache';
                details.requestHeaders['Upgrade-Insecure-Requests'] = '1';
                details.requestHeaders['Sec-Fetch-Dest'] = 'document';
                details.requestHeaders['Sec-Fetch-Mode'] = 'navigate';
                details.requestHeaders['Sec-Fetch-Site'] = 'none';
                details.requestHeaders['Sec-Fetch-User'] = '?1';
            }
        }
        catch { /* ignore */ }
        callback({ requestHeaders: details.requestHeaders });
    });
}
function installPermissions() {
    const trustedHosts = new Set([
        'chat.openai.com', 'auth.openai.com', 'chatgpt.com', 'ab.chatgpt.com',
        'gemini.google.com', 'accounts.google.com',
        'chat.deepseek.com', 'kimi.moonshot.cn',
        'grok.com', 'accounts.x.ai',
        'lmarena.ai'
    ]);
    const allowPerms = new Set([
        'clipboard-read',
        // 一些站点可能使用剪贴板写入的变体权限；若无效会被忽略
        'clipboard-sanitized-write',
        // 可按需放开以下常见权限（如需语音/屏幕分享/定位）
        'media', 'display-capture', 'geolocation'
    ]);
    const sessions = [
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
                    return allowPerms.has(permission) && trustedHosts.has(host);
                }
                catch {
                    return false;
                }
            });
            ses.setPermissionRequestHandler((_wc, permission, callback, details) => {
                try {
                    const host = details?.requestingUrl ? new URL(details.requestingUrl).host : '';
                    const allow = allowPerms.has(permission) && trustedHosts.has(host);
                    callback(allow);
                }
                catch {
                    callback(false);
                }
            });
        }
        catch { /* ignore */ }
    }
}
function createWindow(initialSite) {
    const workArea = screen.getPrimaryDisplay().workAreaSize;
    // 默认使用工作区 70% 尺寸（用户要求比之前稍宽稍高）
    const targetW = Math.max(400, Math.round(workArea.width * 0.7));
    const targetH = Math.max(320, Math.round(workArea.height * 0.7));
    // 忽略之前持久化宽度（仍会记录后续调整）
    mainWindow = new BrowserWindow({
        width: targetW,
        height: targetH,
        title: 'ToolHub Shell',
        minWidth: 400,
        minHeight: 320,
        // 恢复黑色不透明主题
        backgroundColor: '#000000',
        frame: true, // 恢复原生标题栏，避免高度错觉
        // 添加图标配置，根据平台自动选择正确格式
        icon: path.join(__dirname, '../assets/icons/icon.icns'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true, // 允许 renderer 使用 <webview>
            webSecurity: true, // 保持Web安全策略
            // 确保webview有足够的权限和性能配置
            additionalArguments: [
                '--enable-features=OverlayScrollbar,OverlayScrollbarFlashAfterAnyScrollUpdate,OverlayScrollbarFlashWhenMouseEnter',
                '--disable-features=VizDisplayCompositor', // 可能有助于webview显示
                '--enable-gpu-rasterization',
                '--enable-zero-copy'
            ]
        },
        show: false // 先不显示，等加载完成后再显示
    });
    mainWindow.on('resize', () => {
        if (!mainWindow)
            return;
        const b = mainWindow.getBounds();
        store.set?.('windowBounds', { width: b.width, height: b.height });
    });
    // 设置窗口背景为黑色
    mainWindow.setBackgroundColor('#000000');
    buildMenu();
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    // 当页面加载完成时显示窗口
    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow?.show(); // 现在显示窗口
        mainWindow?.webContents.send('init-data', { sites, lastSite: initialSite });
    });
    ipcMain.on('persist-last-site', (_e, key) => {
        store.set?.('lastSite', key);
    });
    ipcMain.on('clear-active-partition', async (_e, partition) => {
        try {
            const ses = session.fromPartition(partition);
            await ses.clearStorageData();
            dialog.showMessageBox({ message: `已清理 ${partition} 数据` });
        }
        catch (err) {
            dialog.showErrorBox('清理失败', String(err));
        }
    });
}
// Retain loadSite for menu fallback: open external site in separate BrowserWindow
function loadSite(site) {
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
    const partition = site.partition || `persist:${site.key}`;
    const ses = session.fromPartition(partition, { cache: true });
    if (site.ua)
        ses.setUserAgent(site.ua);
    child.loadURL(site.url).catch(err => dialog.showErrorBox('Load Failed', `${site.title}: ${err}`));
}
function buildMenu() {
    const template = [
        {
            label: 'App',
            submenu: [
                { label: 'Reload Window', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
                {
                    label: 'Half Height Now', click: () => {
                        if (!mainWindow)
                            return;
                        const b = mainWindow.getBounds();
                        const workH = screen.getPrimaryDisplay().workAreaSize.height;
                        const newH = Math.max(320, Math.round(workH / 2));
                        mainWindow.setBounds({ ...b, height: newH });
                    }
                },
                { label: 'Toggle DevTools', accelerator: 'Alt+CmdOrCtrl+I', click: () => mainWindow?.webContents.openDevTools() },
                { type: 'separator' },
                { label: 'Quit', role: 'quit' }
            ]
        },
        // 标准编辑菜单，确保在 macOS 上 Cmd+C/V/X 等快捷键与 webview/iframe 一起工作
        { role: 'editMenu' },
        {
            label: 'Site',
            submenu: [
                { label: 'Clear Current Site Data', click: () => mainWindow?.webContents.send('nav', { action: 'clear-data' }) },
                { label: 'Open Active in Browser', click: () => { const url = mainWindow?.webContents.getURL(); if (url)
                        shell.openExternal(url); } }
            ]
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
// 为所有 WebContents（窗口与 webview）提供右键复制/粘贴菜单
function installContextMenu() {
    app.on('web-contents-created', (_e, contents) => {
        contents.on('context-menu', (event, params) => {
            const template = [];
            const hasText = !!params.selectionText?.trim();
            const isEditable = !!params.isEditable;
            if (isEditable)
                template.push({ role: 'cut' });
            if (hasText)
                template.push({ role: 'copy' });
            if (isEditable)
                template.push({ role: 'paste' });
            if (template.length)
                template.push({ type: 'separator' });
            template.push({ role: 'selectAll' });
            const menu = Menu.buildFromTemplate(template);
            const win = BrowserWindow.fromWebContents(contents);
            menu.popup({ window: win ?? undefined });
        });
    });
}
app.whenReady().then(() => {
    installFrameBypass();
    installPermissions();
    installContextMenu();
    createWindow(store.get?.('lastSite'));
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow(store.get?.('lastSite'));
    });
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        app.quit();
});
ipcMain.on('open-external', (_e, url) => {
    if (url)
        shell.openExternal(url);
});
// 打开站点独立窗口（为需要顶层环境的站点提供登录/完整功能）
ipcMain.on('open-site-window', (_e, key) => {
    const site = sites.find(s => s.key === key);
    if (!site)
        return;
    const part = site.partition || `persist:${site.key}`;
    const win = new BrowserWindow({
        width: 1280,
        height: 860,
        title: site.title,
        webPreferences: {
            partition: part,
            nodeIntegration: false,
            contextIsolation: true,
        }
    });
    win.loadURL(site.url).catch(err => dialog.showErrorBox('Open Site Failed', String(err)));
});
// 打开顶层登录窗口（与 iframe 共用 partition）
ipcMain.on('open-top-login', (e, key) => {
    const site = sites.find(s => s.key === key);
    if (!site)
        return;
    const part = site.partition || `persist:${site.key}`;
    const win = new BrowserWindow({
        width: 900,
        height: 720,
        title: `Login - ${site.title}`,
        webPreferences: {
            partition: part,
            nodeIntegration: false,
            contextIsolation: true,
        }
    });
    win.loadURL(site.url).catch(err => dialog.showErrorBox('Login Window Load Failed', String(err)));
    win.on('closed', () => {
        // 通知渲染进程刷新该站点 iframe/webview
        mainWindow?.webContents.send('top-login-done', site.key);
    });
});
//# sourceMappingURL=main.js.map