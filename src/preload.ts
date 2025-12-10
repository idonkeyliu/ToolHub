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

// Redis 连接配置接口
interface RedisConnectionConfig {
    id?: string;
    name: string;
    host: string;
    port: number;
    password?: string;
    database: number;
    tls?: boolean;
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
    
    // Redis 操作 API
    redis: {
        testConnection: (config: RedisConnectionConfig) => ipcRenderer.invoke('redis:test-connection', config),
        connect: (config: RedisConnectionConfig) => ipcRenderer.invoke('redis:connect', config),
        disconnect: (connectionId: string) => ipcRenderer.invoke('redis:disconnect', connectionId),
        selectDB: (connectionId: string, db: number) => ipcRenderer.invoke('redis:select-db', connectionId, db),
        scan: (connectionId: string, cursor: string, pattern: string, count: number) => 
            ipcRenderer.invoke('redis:scan', connectionId, cursor, pattern, count),
        getType: (connectionId: string, key: string) => ipcRenderer.invoke('redis:get-type', connectionId, key),
        getTTL: (connectionId: string, key: string) => ipcRenderer.invoke('redis:get-ttl', connectionId, key),
        setTTL: (connectionId: string, key: string, ttl: number) => ipcRenderer.invoke('redis:set-ttl', connectionId, key, ttl),
        deleteKey: (connectionId: string, key: string) => ipcRenderer.invoke('redis:delete-key', connectionId, key),
        renameKey: (connectionId: string, oldKey: string, newKey: string) => 
            ipcRenderer.invoke('redis:rename-key', connectionId, oldKey, newKey),
        getString: (connectionId: string, key: string) => ipcRenderer.invoke('redis:get-string', connectionId, key),
        setString: (connectionId: string, key: string, value: string, ttl?: number) => 
            ipcRenderer.invoke('redis:set-string', connectionId, key, value, ttl),
        getHash: (connectionId: string, key: string) => ipcRenderer.invoke('redis:get-hash', connectionId, key),
        setHashField: (connectionId: string, key: string, field: string, value: string) => 
            ipcRenderer.invoke('redis:set-hash-field', connectionId, key, field, value),
        deleteHashField: (connectionId: string, key: string, field: string) => 
            ipcRenderer.invoke('redis:delete-hash-field', connectionId, key, field),
        getList: (connectionId: string, key: string, start: number, stop: number) => 
            ipcRenderer.invoke('redis:get-list', connectionId, key, start, stop),
        pushList: (connectionId: string, key: string, value: string, position: 'left' | 'right') => 
            ipcRenderer.invoke('redis:push-list', connectionId, key, value, position),
        deleteListItem: (connectionId: string, key: string, index: number, count: number) => 
            ipcRenderer.invoke('redis:delete-list-item', connectionId, key, index, count),
        getSet: (connectionId: string, key: string) => ipcRenderer.invoke('redis:get-set', connectionId, key),
        addSetMember: (connectionId: string, key: string, member: string) => 
            ipcRenderer.invoke('redis:add-set-member', connectionId, key, member),
        removeSetMember: (connectionId: string, key: string, member: string) => 
            ipcRenderer.invoke('redis:remove-set-member', connectionId, key, member),
        getZSet: (connectionId: string, key: string, withScores: boolean) => 
            ipcRenderer.invoke('redis:get-zset', connectionId, key, withScores),
        addZSetMember: (connectionId: string, key: string, member: string, score: number) => 
            ipcRenderer.invoke('redis:add-zset-member', connectionId, key, member, score),
        removeZSetMember: (connectionId: string, key: string, member: string) => 
            ipcRenderer.invoke('redis:remove-zset-member', connectionId, key, member),
        executeCommand: (connectionId: string, command: string) => 
            ipcRenderer.invoke('redis:execute-command', connectionId, command),
        dbSize: (connectionId: string) => ipcRenderer.invoke('redis:db-size', connectionId),
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
