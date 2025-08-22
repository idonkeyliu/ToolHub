import { contextBridge, ipcRenderer } from 'electron';
// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('llmHub', {
    version: '0.1.0',
    sites: [],
    lastSite: '',
    openExternal: (url) => ipcRenderer.send('open-external', url),
    persistLastSite: (key) => ipcRenderer.send('persist-last-site', key),
    clearActivePartition: (partition) => ipcRenderer.send('clear-active-partition', partition),
    openSiteWindow: (key) => ipcRenderer.send('open-site-window', key)
});
// 接收主进程数据
ipcRenderer.on('init-data', (_e, payload) => {
    window.llmHub.sites = payload.sites;
    window.llmHub.lastSite = payload.lastSite;
});
// 处理导航事件
ipcRenderer.on('nav', (_e, data) => {
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
ipcRenderer.on('top-login-done', (_e, key) => {
    window.dispatchEvent(new CustomEvent('top-login-done', { detail: key }));
});
// 去重：上面已存在 init-data 与 nav 版本，保留一个即可。
//# sourceMappingURL=preload.js.map