import { contextBridge, ipcRenderer } from 'electron';

// 存储数据（在 preload 作用域内可修改）
let _sites: any[] = [];
let _lastSite = '';

// 数据库连接配置接口
interface DBConnectionConfig {
    id?: string;
    name: string;
    type: 'mysql' | 'postgresql' | 'sqlite';
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    sqlitePath?: string;
}

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('llmHub', {
    version: '0.1.0',
    get sites() { return _sites; },
    get lastSite() { return _lastSite; },
    openExternal: (url: string) => ipcRenderer.send('open-external', url),
    persistLastSite: (key: string) => ipcRenderer.send('persist-last-site', key),
    clearActivePartition: (partition: string) => ipcRenderer.send('clear-active-partition', partition),
    openSiteWindow: (key: string) => ipcRenderer.send('open-site-window', key),
    saveFile: (options: { defaultName: string; filters: { name: string; extensions: string[] }[]; data: string }) => 
        ipcRenderer.invoke('save-file', options),
    
    // 数据库操作 API
    db: {
        testConnection: (config: DBConnectionConfig) => ipcRenderer.invoke('db:test-connection', config),
        connect: (config: DBConnectionConfig) => ipcRenderer.invoke('db:connect', config),
        disconnect: (connectionId: string) => ipcRenderer.invoke('db:disconnect', connectionId),
        getDatabases: (connectionId: string) => ipcRenderer.invoke('db:get-databases', connectionId),
        getTables: (connectionId: string, database: string) => ipcRenderer.invoke('db:get-tables', connectionId, database),
        getTableStructure: (connectionId: string, database: string, table: string) => 
            ipcRenderer.invoke('db:get-table-structure', connectionId, database, table),
        getTableData: (connectionId: string, database: string, table: string, page: number, pageSize: number) => 
            ipcRenderer.invoke('db:get-table-data', connectionId, database, table, page, pageSize),
        executeQuery: (connectionId: string, database: string, sql: string) => 
            ipcRenderer.invoke('db:execute-query', connectionId, database, sql),
        updateRecord: (connectionId: string, database: string, table: string, primaryKey: string, primaryValue: any, column: string, value: any) =>
            ipcRenderer.invoke('db:update-record', connectionId, database, table, primaryKey, primaryValue, column, value),
    },
});

// 接收主进程数据
ipcRenderer.on('init-data', (_e, payload) => {
    _sites = payload.sites;
    _lastSite = payload.lastSite;
    // 触发自定义事件通知渲染进程数据已就绪
    window.dispatchEvent(new CustomEvent('llmHub-ready'));
});

// 处理导航事件
ipcRenderer.on('nav', (_e, data) => {
    const active = document.querySelector('webview.active') as any;
    if (!active) return;

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
            if (partition) (window as any).llmHub.clearActivePartition(partition);
            break;
        }
    }
});

// 登录窗口关闭通知转发为 DOM 事件
ipcRenderer.on('top-login-done', (_e, key: string) => {
    window.dispatchEvent(new CustomEvent('top-login-done', { detail: key }));
});

// 去重：上面已存在 init-data 与 nav 版本，保留一个即可。
