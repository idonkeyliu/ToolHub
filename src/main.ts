/**
 * ToolHub Shell - 主进程入口
 * 重构后的版本：作为协调者，将具体业务委托给各个管理器模块
 */

import { app, BrowserWindow, Menu, dialog, shell, session, ipcMain, screen } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Store from 'electron-store';

// 导入管理器模块
import { databaseManager } from './main/database/database-manager.js';
import { redisManager as redisManagerInstance } from './main/redis/redis-manager.js';
import { mongoManager as mongoManagerInstance } from './main/mongo/mongo-manager.js';
import { terminalManager as terminalManagerInstance } from './main/terminal/terminal-manager.js';
import { syncManager as syncManagerInstance } from './main/sync/sync-manager.js';
import { windowManager } from './main/window/window-manager.js';

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 全局状态管理 ====================

const store = new Store();
let mainWindow: BrowserWindow | null = null;

// 站点配置
interface SiteDef {
    key: string;
    title: string;
    url: string;
    partition?: string;
    ua?: string;
}

const sites: SiteDef[] = [
    { key: 'chatgpt', title: 'ChatGPT', url: 'https://chatgpt.com/', partition: 'persist:chatgpt' },
    { key: 'gemini', title: 'Gemini', url: 'https://gemini.google.com/app', partition: 'persist:gemini' },
    { key: 'deepseek', title: 'DeepSeek', url: 'https://chat.deepseek.com/', partition: 'persist:deepseek' },
    { key: 'kimi', title: 'Kimi', url: 'https://kimi.moonshot.cn/', partition: 'persist:kimi' },
    { key: 'grok', title: 'Grok', url: 'https://grok.com/', partition: 'persist:grok' },
    { key: 'lmarena', title: 'LMArena', url: 'https://lmarena.ai/', partition: 'persist:lmarena' },
];

// ==================== 数据库处理器注册 ====================

function setupDBHandlers() {
    const dbManager = databaseManager;
    
    ipcMain.handle('db:test-connection', async (_e, config) => {
        return dbManager.testConnection(config);
    });
    
    ipcMain.handle('db:connect', async (_e, config) => {
        return dbManager.connect(config);
    });
    
    ipcMain.handle('db:disconnect', async (_e, connectionId: string) => {
        return dbManager.disconnect(connectionId);
    });
    
    ipcMain.handle('db:get-databases', async (_e, connectionId: string) => {
        return dbManager.getDatabases(connectionId);
    });
    
    ipcMain.handle('db:get-tables', async (_e, connectionId: string, database: string) => {
        return dbManager.getTables(connectionId, database);
    });
    
    ipcMain.handle('db:get-table-structure', async (_e, connectionId: string, database: string, table: string) => {
        return dbManager.getTableStructure(connectionId, database, table);
    });
    
    ipcMain.handle('db:get-table-data', async (_e, connectionId: string, database: string, table: string, page: number, pageSize: number) => {
        return dbManager.getTableData(connectionId, database, table, page, pageSize);
    });
    
    ipcMain.handle('db:execute-query', async (_e, connectionId: string, database: string, sql: string) => {
        return dbManager.executeQuery(connectionId, database, sql);
    });
    
    ipcMain.handle('db:update-field', async (_e, connectionId: string, database: string, table: string, column: string, primaryKey: string, primaryKeyValue: any, newValue: any) => {
        // updateField 只需要 6 个参数 (去掉 newValue,合并到最后一个参数中)
        return databaseManager.updateField(connectionId, database, table, column, primaryKey, newValue);
    });
}

// ==================== Redis 处理器注册 ====================

function setupRedisHandlers() {
    const redisManager = redisManagerInstance;
    
    ipcMain.handle('redis:test-connection', async (_e, config) => {
        return redisManager.testConnection(config);
    });
    
    ipcMain.handle('redis:connect', async (_e, config) => {
        return redisManager.connect(config);
    });
    
    ipcMain.handle('redis:disconnect', async (_e, connectionId: string) => {
        return redisManager.disconnect(connectionId);
    });
    
    ipcMain.handle('redis:select-db', async (_e, connectionId: string, db: number) => {
        return redisManager.selectDB(connectionId, db);
    });
    
    ipcMain.handle('redis:scan', async (_e, connectionId: string, cursor: string, pattern: string, count: number) => {
        return redisManager.scan(connectionId, cursor, pattern, count);
    });
    
    ipcMain.handle('redis:get-type', async (_e, connectionId: string, key: string) => {
        return redisManager.getType(connectionId, key);
    });
    
    ipcMain.handle('redis:get-ttl', async (_e, connectionId: string, key: string) => {
        return redisManager.getTTL(connectionId, key);
    });
    
    ipcMain.handle('redis:set-ttl', async (_e, connectionId: string, key: string, ttl: number) => {
        return redisManager.setTTL(connectionId, key, ttl);
    });
    
    ipcMain.handle('redis:delete-key', async (_e, connectionId: string, key: string) => {
        return redisManager.deleteKey(connectionId, key);
    });
    
    ipcMain.handle('redis:rename-key', async (_e, connectionId: string, oldKey: string, newKey: string) => {
        return redisManager.renameKey(connectionId, oldKey, newKey);
    });
    
    // String 操作
    ipcMain.handle('redis:get-string', async (_e, connectionId: string, key: string) => {
        return redisManager.getString(connectionId, key);
    });
    
    ipcMain.handle('redis:set-string', async (_e, connectionId: string, key: string, value: string, ttl?: number) => {
        return redisManager.setString(connectionId, key, value, ttl);
    });
    
    // Hash 操作
    ipcMain.handle('redis:get-hash', async (_e, connectionId: string, key: string) => {
        return redisManager.getHash(connectionId, key);
    });
    
    ipcMain.handle('redis:set-hash-field', async (_e, connectionId: string, key: string, field: string, value: string) => {
        return redisManager.setHashField(connectionId, key, field, value);
    });
    
    ipcMain.handle('redis:delete-hash-field', async (_e, connectionId: string, key: string, field: string) => {
        return redisManager.deleteHashField(connectionId, key, field);
    });
    
    // List 操作
    ipcMain.handle('redis:get-list', async (_e, connectionId: string, key: string, start: number, stop: number) => {
        return redisManager.getList(connectionId, key, start, stop);
    });
    
    ipcMain.handle('redis:push-list', async (_e, connectionId: string, key: string, value: string, position: 'left' | 'right') => {
        return redisManager.pushList(connectionId, key, value, position);
    });
    
    ipcMain.handle('redis:delete-list-item', async (_e, connectionId: string, key: string, index: number, count: number) => {
        return redisManager.deleteListItem(connectionId, key, index, count);
    });
    
    // Set 操作
    ipcMain.handle('redis:get-set', async (_e, connectionId: string, key: string) => {
        return redisManager.getSet(connectionId, key);
    });
    
    ipcMain.handle('redis:add-set-member', async (_e, connectionId: string, key: string, member: string) => {
        return redisManager.addSetMember(connectionId, key, member);
    });
    
    ipcMain.handle('redis:remove-set-member', async (_e, connectionId: string, key: string, member: string) => {
        return redisManager.removeSetMember(connectionId, key, member);
    });
    
    // ZSet 操作
    ipcMain.handle('redis:get-zset', async (_e, connectionId: string, key: string, withScores: boolean) => {
        return redisManager.getZSet(connectionId, key, withScores);
    });
    
    ipcMain.handle('redis:add-zset-member', async (_e, connectionId: string, key: string, member: string, score: number) => {
        return redisManager.addZSetMember(connectionId, key, member, score);
    });
    
    ipcMain.handle('redis:remove-zset-member', async (_e, connectionId: string, key: string, member: string) => {
        return redisManager.removeZSetMember(connectionId, key, member);
    });
    
    // 执行命令
    ipcMain.handle('redis:execute-command', async (_e, connectionId: string, command: string) => {
        return redisManager.executeCommand(connectionId, command);
    });
    
    // DB Size
    ipcMain.handle('redis:db-size', async (_e, connectionId: string) => {
        return redisManager.dbSize(connectionId);
    });
}

// ==================== MongoDB 处理器注册 ====================

function setupMongoHandlers() {
    const mongoManager = mongoManagerInstance;
    
    ipcMain.handle('mongo:test-connection', async (_e, config) => {
        return mongoManager.testConnection(config);
    });
    
    ipcMain.handle('mongo:connect', async (_e, config) => {
        return mongoManager.connect(config);
    });
    
    ipcMain.handle('mongo:disconnect', async (_e, connectionId: string) => {
        return mongoManager.disconnect(connectionId);
    });
    
    ipcMain.handle('mongo:list-databases', async (_e, connectionId: string) => {
        return mongoManager.listDatabases(connectionId);
    });
    
    ipcMain.handle('mongo:list-collections', async (_e, connectionId: string, database: string) => {
        return mongoManager.listCollections(connectionId, database);
    });
    
    ipcMain.handle('mongo:get-collection-stats', async (_e, connectionId: string, database: string, collection: string) => {
        return mongoManager.getCollectionStats(connectionId, database, collection);
    });
    
    ipcMain.handle('mongo:find-documents', async (_e, connectionId: string, database: string, collection: string, filterStr: string, sortStr: string, skip: number, limit: number) => {
        return mongoManager.findDocuments(connectionId, database, collection, filterStr, sortStr, skip, limit);
    });
    
    ipcMain.handle('mongo:insert-document', async (_e, connectionId: string, database: string, collection: string, documentStr: string) => {
        return mongoManager.insertDocument(connectionId, database, collection, documentStr);
    });
    
    ipcMain.handle('mongo:update-document', async (_e, connectionId: string, database: string, collection: string, id: string, documentStr: string) => {
        return mongoManager.updateDocument(connectionId, database, collection, id, documentStr);
    });
    
    ipcMain.handle('mongo:delete-document', async (_e, connectionId: string, database: string, collection: string, id: string) => {
        return mongoManager.deleteDocument(connectionId, database, collection, id);
    });
    
    ipcMain.handle('mongo:get-indexes', async (_e, connectionId: string, database: string, collection: string) => {
        return mongoManager.getIndexes(connectionId, database, collection);
    });
    
    ipcMain.handle('mongo:run-command', async (_e, connectionId: string, database: string, commandStr: string) => {
        return mongoManager.runCommand(connectionId, database, commandStr);
    });
    
    ipcMain.handle('mongo:drop-collection', async (_e, connectionId: string, database: string, collection: string) => {
        return mongoManager.dropCollection(connectionId, database, collection);
    });
    
    ipcMain.handle('mongo:create-collection', async (_e, connectionId: string, database: string, collection: string) => {
        return mongoManager.createCollection(connectionId, database, collection);
    });
}

// ==================== Terminal 处理器注册 ====================

function setupTerminalHandlers() {
    const terminalManager = terminalManagerInstance;
    
    ipcMain.handle('terminal:test-connection', async (_e, config) => {
        return terminalManager.testConnection(config);
    });
    
    ipcMain.handle('terminal:connect', async (_e, config) => {
        return terminalManager.connect(config);
    });
    
    ipcMain.handle('terminal:disconnect', async (_e, sessionId: string) => {
        return terminalManager.disconnect(sessionId);
    });
    
    ipcMain.handle('terminal:execute', async (_e, sessionId: string, command: string) => {
        return terminalManager.execute(sessionId, command);
    });
}

// ==================== Sync 处理器注册 ====================

function setupSyncHandlers() {
    const syncManager = syncManagerInstance;
    
    ipcMain.handle('sync:test-connection', async (_e, config) => {
        return syncManager.testConnection(config);
    });
    
    ipcMain.handle('sync:check-sync', async (_e, project, servers) => {
        return syncManager.checkSync(project, servers);
    });
    
    ipcMain.handle('sync:get-file-content', async (_e, server, filePath: string) => {
        return syncManager.getFileContent(server, filePath);
    });
}

// ==================== 窗口和应用管理 ====================

function createWindow(initialSite?: string) {
    mainWindow = windowManager.createWindow(initialSite, sites, __dirname);
    
    // 窗口尺寸持久化
    mainWindow.on('resize', () => {
        if (!mainWindow) return;
        const bounds = mainWindow.getBounds();
        (store as any).set?.('windowBounds', { width: bounds.width, height: bounds.height });
    });
    
    // 加载页面
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    
    // 当页面加载完成时显示窗口并发送初始数据
    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow?.show();
        mainWindow?.webContents.send('init-data', { sites, lastSite: initialSite });
    });
    
    // IPC 监听器
    ipcMain.on('persist-last-site', (_e, key: string) => {
        (store as any).set?.('lastSite', key);
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
}

function loadSite(site: SiteDef) {
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
    if (site.ua) ses.setUserAgent(site.ua);
    child.loadURL(site.url).catch(err => dialog.showErrorBox('Load Failed', `${site.title}: ${err}`));
}

function buildMenu() {
    const template: MenuItemConstructorOptions[] = [
        {
            label: 'App',
            submenu: [
                { label: 'Reload Window', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
                {
                    label: 'Half Height Now', click: () => {
                        if (!mainWindow) return;
                        const workArea = screen.getPrimaryDisplay().workAreaSize;
                        const bounds = mainWindow.getBounds();
                        const targetH = Math.max(320, Math.round(workArea.height * 0.5));
                        mainWindow.setBounds({ ...bounds, height: targetH });
                    }
                },
                { type: 'separator' },
                { role: 'quit' },
            ],
        },
        {
            label: 'Sites',
            submenu: sites.map(s => ({
                label: s.title,
                click: () => loadSite(s)
            })),
        },
        {
            label: 'Dev',
            submenu: [
                { label: 'Toggle DevTools', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow?.webContents.toggleDevTools() },
            ],
        },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function installContextMenu() {
    ipcMain.on('show-context-menu', () => {
        const menu = Menu.buildFromTemplate([
            { label: 'Inspect Element', click: () => mainWindow?.webContents.inspectElement(0, 0) },
        ]);
        menu.popup();
    });
}

// ==================== Emoji 文件处理器 ====================

function setupEmojiHandlers() {
    // 获取指定目录下的 emoji 文件列表
    ipcMain.handle('emoji:list-files', async (_e, categoryDir: string) => {
        try {
            const emojiPath = path.join(__dirname, 'renderer', 'assets', 'emojis', categoryDir);
            const files = fs.readdirSync(emojiPath);
            return files.filter(f => f.endsWith('.png')).sort();
        } catch (e) {
            console.error(`Failed to list emoji files for ${categoryDir}:`, e);
            return [];
        }
    });
}

// ==================== 应用生命周期 ====================

app.whenReady().then(async () => {
    // 所有管理器已经在模块级别初始化，直接注册处理器
    
    // 注册所有处理器
    setupDBHandlers();
    setupRedisHandlers();
    setupMongoHandlers();
    setupTerminalHandlers();
    setupSyncHandlers();
    setupEmojiHandlers();
    
    // 配置窗口环境
    windowManager.installFrameBypass();
    windowManager.installPermissions();
    installContextMenu();
    
    // 创建主窗口
    createWindow((store as any).get?.('lastSite'));
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow((store as any).get?.('lastSite'));
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// ==================== 其他 IPC 处理器 ====================

ipcMain.on('open-external', (_e, url: string) => {
    if (url) shell.openExternal(url);
});

// 保存文件对话框
ipcMain.handle('save-file', async (_e, options: { defaultName: string; filters: { name: string; extensions: string[] }[]; data: string }) => {
    const result = await dialog.showSaveDialog({
        defaultPath: options.defaultName,
        filters: options.filters,
    });
    
    if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
    }
    
    try {
        const base64Data = options.data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(result.filePath, buffer);
        return { success: true, filePath: result.filePath };
    } catch (err) {
        return { success: false, error: String(err) };
    }
});

// 打开站点独立窗口
ipcMain.on('open-site-window', (_e, key: string) => {
    const site = sites.find(s => s.key === key);
    if (!site) return;
    const partition = site.partition || `persist:${site.key}`;
    const win = new BrowserWindow({
        width: 1280,
        height: 860,
        title: site.title,
        webPreferences: {
            partition,
            nodeIntegration: false,
            contextIsolation: true,
        }
    });
    win.loadURL(site.url).catch(err => dialog.showErrorBox('Open Site Failed', String(err)));
});

// 打开顶层登录窗口
ipcMain.on('open-top-login', (_e, key: string) => {
    const site = sites.find(s => s.key === key);
    if (!site) return;
    const partition = site.partition || `persist:${site.key}`;
    const win = new BrowserWindow({
        width: 900,
        height: 720,
        title: `Login - ${site.title}`,
        webPreferences: {
            partition,
            nodeIntegration: false,
            contextIsolation: true,
        }
    });
    win.loadURL(site.url).catch(err => dialog.showErrorBox('Login Window Load Failed', String(err)));
    win.on('closed', () => {
        mainWindow?.webContents.send('top-login-done', site.key);
    });
});
