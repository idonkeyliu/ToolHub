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
    openSiteWindow: (key) => electron_1.ipcRenderer.send('open-site-window', key),
    setTrafficLightVisibility: (visible) => electron_1.ipcRenderer.send('set-traffic-light-visibility', visible),
    saveFile: (options) => electron_1.ipcRenderer.invoke('save-file', options),
    // 数据库操作 API
    db: {
        testConnection: (config) => electron_1.ipcRenderer.invoke('db:test-connection', config),
        connect: (config) => electron_1.ipcRenderer.invoke('db:connect', config),
        disconnect: (connectionId) => electron_1.ipcRenderer.invoke('db:disconnect', connectionId),
        getDatabases: (connectionId) => electron_1.ipcRenderer.invoke('db:get-databases', connectionId),
        getTables: (connectionId, database) => electron_1.ipcRenderer.invoke('db:get-tables', connectionId, database),
        getTableStructure: (connectionId, database, table) => electron_1.ipcRenderer.invoke('db:get-table-structure', connectionId, database, table),
        getTableData: (connectionId, database, table, page, pageSize) => electron_1.ipcRenderer.invoke('db:get-table-data', connectionId, database, table, page, pageSize),
        executeQuery: (connectionId, database, sql) => electron_1.ipcRenderer.invoke('db:execute-query', connectionId, database, sql),
        updateRecord: (connectionId, database, table, primaryKey, primaryValue, column, value) => electron_1.ipcRenderer.invoke('db:update-record', connectionId, database, table, primaryKey, primaryValue, column, value),
    },
    // Redis 操作 API
    redis: {
        testConnection: (config) => electron_1.ipcRenderer.invoke('redis:test-connection', config),
        connect: (config) => electron_1.ipcRenderer.invoke('redis:connect', config),
        disconnect: (connectionId) => electron_1.ipcRenderer.invoke('redis:disconnect', connectionId),
        selectDB: (connectionId, db) => electron_1.ipcRenderer.invoke('redis:select-db', connectionId, db),
        scan: (connectionId, cursor, pattern, count) => electron_1.ipcRenderer.invoke('redis:scan', connectionId, cursor, pattern, count),
        getType: (connectionId, key) => electron_1.ipcRenderer.invoke('redis:get-type', connectionId, key),
        getTTL: (connectionId, key) => electron_1.ipcRenderer.invoke('redis:get-ttl', connectionId, key),
        setTTL: (connectionId, key, ttl) => electron_1.ipcRenderer.invoke('redis:set-ttl', connectionId, key, ttl),
        deleteKey: (connectionId, key) => electron_1.ipcRenderer.invoke('redis:delete-key', connectionId, key),
        renameKey: (connectionId, oldKey, newKey) => electron_1.ipcRenderer.invoke('redis:rename-key', connectionId, oldKey, newKey),
        getString: (connectionId, key) => electron_1.ipcRenderer.invoke('redis:get-string', connectionId, key),
        setString: (connectionId, key, value, ttl) => electron_1.ipcRenderer.invoke('redis:set-string', connectionId, key, value, ttl),
        getHash: (connectionId, key) => electron_1.ipcRenderer.invoke('redis:get-hash', connectionId, key),
        setHashField: (connectionId, key, field, value) => electron_1.ipcRenderer.invoke('redis:set-hash-field', connectionId, key, field, value),
        deleteHashField: (connectionId, key, field) => electron_1.ipcRenderer.invoke('redis:delete-hash-field', connectionId, key, field),
        getList: (connectionId, key, start, stop) => electron_1.ipcRenderer.invoke('redis:get-list', connectionId, key, start, stop),
        pushList: (connectionId, key, value, position) => electron_1.ipcRenderer.invoke('redis:push-list', connectionId, key, value, position),
        deleteListItem: (connectionId, key, index, count) => electron_1.ipcRenderer.invoke('redis:delete-list-item', connectionId, key, index, count),
        getSet: (connectionId, key) => electron_1.ipcRenderer.invoke('redis:get-set', connectionId, key),
        addSetMember: (connectionId, key, member) => electron_1.ipcRenderer.invoke('redis:add-set-member', connectionId, key, member),
        removeSetMember: (connectionId, key, member) => electron_1.ipcRenderer.invoke('redis:remove-set-member', connectionId, key, member),
        getZSet: (connectionId, key, withScores) => electron_1.ipcRenderer.invoke('redis:get-zset', connectionId, key, withScores),
        addZSetMember: (connectionId, key, member, score) => electron_1.ipcRenderer.invoke('redis:add-zset-member', connectionId, key, member, score),
        removeZSetMember: (connectionId, key, member) => electron_1.ipcRenderer.invoke('redis:remove-zset-member', connectionId, key, member),
        executeCommand: (connectionId, command) => electron_1.ipcRenderer.invoke('redis:execute-command', connectionId, command),
        dbSize: (connectionId) => electron_1.ipcRenderer.invoke('redis:db-size', connectionId),
    },
    // MongoDB 操作 API
    mongo: {
        testConnection: (config) => electron_1.ipcRenderer.invoke('mongo:test-connection', config),
        connect: (config) => electron_1.ipcRenderer.invoke('mongo:connect', config),
        disconnect: (connectionId) => electron_1.ipcRenderer.invoke('mongo:disconnect', connectionId),
        listDatabases: (connectionId) => electron_1.ipcRenderer.invoke('mongo:list-databases', connectionId),
        listCollections: (connectionId, database) => electron_1.ipcRenderer.invoke('mongo:list-collections', connectionId, database),
        getCollectionStats: (connectionId, database, collection) => electron_1.ipcRenderer.invoke('mongo:get-collection-stats', connectionId, database, collection),
        findDocuments: (connectionId, database, collection, filter, sort, skip, limit) => electron_1.ipcRenderer.invoke('mongo:find-documents', connectionId, database, collection, filter, sort, skip, limit),
        insertDocument: (connectionId, database, collection, document) => electron_1.ipcRenderer.invoke('mongo:insert-document', connectionId, database, collection, document),
        updateDocument: (connectionId, database, collection, id, document) => electron_1.ipcRenderer.invoke('mongo:update-document', connectionId, database, collection, id, document),
        deleteDocument: (connectionId, database, collection, id) => electron_1.ipcRenderer.invoke('mongo:delete-document', connectionId, database, collection, id),
        getIndexes: (connectionId, database, collection) => electron_1.ipcRenderer.invoke('mongo:get-indexes', connectionId, database, collection),
        runCommand: (connectionId, database, command) => electron_1.ipcRenderer.invoke('mongo:run-command', connectionId, database, command),
        dropCollection: (connectionId, database, collection) => electron_1.ipcRenderer.invoke('mongo:drop-collection', connectionId, database, collection),
        createCollection: (connectionId, database, collection) => electron_1.ipcRenderer.invoke('mongo:create-collection', connectionId, database, collection),
    },
    // SSH 终端操作 API
    terminal: {
        testConnection: (config) => electron_1.ipcRenderer.invoke('terminal:test-connection', config),
        connect: (config) => electron_1.ipcRenderer.invoke('terminal:connect', config),
        disconnect: (sessionId) => electron_1.ipcRenderer.invoke('terminal:disconnect', sessionId),
        execute: (sessionId, command) => electron_1.ipcRenderer.invoke('terminal:execute', sessionId, command),
    },
    // 文件同步检测 API
    sync: {
        testConnection: (config) => electron_1.ipcRenderer.invoke('sync:test-connection', config),
        checkSync: (project, servers) => electron_1.ipcRenderer.invoke('sync:check-sync', project, servers),
        getFileContent: (server, filePath) => electron_1.ipcRenderer.invoke('sync:get-file-content', server, filePath),
    },
    // Emoji 文件 API
    listEmojiFiles: (categoryDir) => electron_1.ipcRenderer.invoke('emoji:list-files', categoryDir),
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