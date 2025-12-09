"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// 存储数据（在 preload 作用域内可修改）
let _sites = [];
let _lastSite = '';
// 暴露给渲染进程的API
electron_1.contextBridge.exposeInMainWorld('llmHub', {
    version: '0.1.0',
    get sites() { return _sites; },
    get lastSite() { return _lastSite; },
    openExternal: (url) => electron_1.ipcRenderer.send('open-external', url),
    persistLastSite: (key) => electron_1.ipcRenderer.send('persist-last-site', key),
    clearActivePartition: (partition) => electron_1.ipcRenderer.send('clear-active-partition', partition),
    openSiteWindow: (key) => electron_1.ipcRenderer.send('open-site-window', key)
});
// 接收主进程数据
electron_1.ipcRenderer.on('init-data', (_e, payload) => {
    _sites = payload.sites;
    _lastSite = payload.lastSite;
    // 触发自定义事件通知渲染进程数据已就绪
    window.dispatchEvent(new CustomEvent('llmHub-ready'));
});
// 处理导航事件
electron_1.ipcRenderer.on('nav', (_e, data) => {
    const active = document.querySelector('webview.active');
    if (!active)
        return;
    switch (data.action) {
        case 'back':
            active.goBack?.();
            break;
        case 'forward':
            active.goForward?.();
            break;
        case 'reload':
            active.reload?.();
            break;
        case 'clear-data': {
            const partition = active.getAttribute('partition');
            if (partition)
                window.llmHub.clearActivePartition(partition);
            break;
        }
    }
});
// 登录窗口关闭通知转发为 DOM 事件
electron_1.ipcRenderer.on('top-login-done', (_e, key) => {
    window.dispatchEvent(new CustomEvent('top-login-done', { detail: key }));
});
// 去重：上面已存在 init-data 与 nav 版本，保留一个即可。
//# sourceMappingURL=preload.js.map