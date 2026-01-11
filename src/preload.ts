import { contextBridge, ipcRenderer } from 'electron';
import type { DBConnectionConfig, RedisConnectionConfig, MongoConnectionConfig, ServerConfig } from './shared/types';

// 存储数据（在 preload 作用域内可修改）
let _sites: any[] = [];
let _lastSite = '';

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('llmHub', {
    version: '0.1.0',
    get sites() { return _sites; },
    get lastSite() { return _lastSite; },
    openExternal: (url: string) => ipcRenderer.send('open-external', url),
    persistLastSite: (key: string) => ipcRenderer.send('persist-last-site', key),
    clearActivePartition: (partition: string) => ipcRenderer.send('clear-active-partition', partition),
    openSiteWindow: (key: string) => ipcRenderer.send('open-site-window', key),
    setTrafficLightVisibility: (visible: boolean) => ipcRenderer.send('set-traffic-light-visibility', visible),
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

    // MongoDB 操作 API
    mongo: {
        testConnection: (config: MongoConnectionConfig) => ipcRenderer.invoke('mongo:test-connection', config),
        connect: (config: MongoConnectionConfig) => ipcRenderer.invoke('mongo:connect', config),
        disconnect: (connectionId: string) => ipcRenderer.invoke('mongo:disconnect', connectionId),
        listDatabases: (connectionId: string) => ipcRenderer.invoke('mongo:list-databases', connectionId),
        listCollections: (connectionId: string, database: string) =>
            ipcRenderer.invoke('mongo:list-collections', connectionId, database),
        getCollectionStats: (connectionId: string, database: string, collection: string) =>
            ipcRenderer.invoke('mongo:get-collection-stats', connectionId, database, collection),
        findDocuments: (connectionId: string, database: string, collection: string, filter: string, sort: string, skip: number, limit: number) =>
            ipcRenderer.invoke('mongo:find-documents', connectionId, database, collection, filter, sort, skip, limit),
        insertDocument: (connectionId: string, database: string, collection: string, document: string) =>
            ipcRenderer.invoke('mongo:insert-document', connectionId, database, collection, document),
        updateDocument: (connectionId: string, database: string, collection: string, id: string, document: string) =>
            ipcRenderer.invoke('mongo:update-document', connectionId, database, collection, id, document),
        deleteDocument: (connectionId: string, database: string, collection: string, id: string) =>
            ipcRenderer.invoke('mongo:delete-document', connectionId, database, collection, id),
        getIndexes: (connectionId: string, database: string, collection: string) =>
            ipcRenderer.invoke('mongo:get-indexes', connectionId, database, collection),
        runCommand: (connectionId: string, database: string, command: string) =>
            ipcRenderer.invoke('mongo:run-command', connectionId, database, command),
        dropCollection: (connectionId: string, database: string, collection: string) =>
            ipcRenderer.invoke('mongo:drop-collection', connectionId, database, collection),
        createCollection: (connectionId: string, database: string, collection: string) =>
            ipcRenderer.invoke('mongo:create-collection', connectionId, database, collection),
    },

    // SSH 终端操作 API
    terminal: {
        testConnection: (config: ServerConfig) => ipcRenderer.invoke('terminal:test-connection', config),
        connect: (config: ServerConfig) => ipcRenderer.invoke('terminal:connect', config),
        disconnect: (sessionId: string) => ipcRenderer.invoke('terminal:disconnect', sessionId),
        execute: (sessionId: string, command: string) => ipcRenderer.invoke('terminal:execute', sessionId, command),
    },

    // 文件同步检测 API
    sync: {
        testConnection: (config: ServerConfig) => ipcRenderer.invoke('sync:test-connection', config),
        checkSync: (project: any, servers: ServerConfig[]) => ipcRenderer.invoke('sync:check-sync', project, servers),
        getFileContent: (server: ServerConfig, filePath: string) => ipcRenderer.invoke('sync:get-file-content', server, filePath),
    },

    // Emoji 文件 API
    listEmojiFiles: (categoryDir: string): Promise<string[]> => ipcRenderer.invoke('emoji:list-files', categoryDir),

    // YouTube 下载 API
    youtube: {
        getVideoUrl: (videoId: string, format: 'video' | 'audio' = 'video') =>
            ipcRenderer.invoke('youtube:get-video-url', videoId, format),
        getVideoInfo: (videoId: string) =>
            ipcRenderer.invoke('youtube:get-video-info', videoId),
        download: (videoId: string, format: 'video' | 'audio' = 'video') =>
            ipcRenderer.invoke('youtube:download', videoId, format),
        onProgress: (callback: (data: { videoId: string; progress: number; line: string }) => void) => {
            ipcRenderer.on('youtube:download-progress', (_e, data) => callback(data));
        },
        removeProgressListener: () => {
            ipcRenderer.removeAllListeners('youtube:download-progress');
        },
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
