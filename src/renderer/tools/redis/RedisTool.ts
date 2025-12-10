/**
 * Redis 管理工具
 */

import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { template } from './template';

declare function toast(msg: string): void;

declare const llmHub: {
  redis: {
    testConnection: (config: RedisConnectionConfig) => Promise<{ success: boolean; error?: string }>;
    connect: (config: RedisConnectionConfig) => Promise<{ success: boolean; connectionId?: string; error?: string }>;
    disconnect: (connectionId: string) => Promise<{ success: boolean; error?: string }>;
    selectDB: (connectionId: string, db: number) => Promise<{ success: boolean; error?: string }>;
    scan: (connectionId: string, cursor: string, pattern: string, count: number) => Promise<{ success: boolean; cursor?: string; keys?: string[]; error?: string }>;
    getType: (connectionId: string, key: string) => Promise<{ success: boolean; type?: string; error?: string }>;
    getTTL: (connectionId: string, key: string) => Promise<{ success: boolean; ttl?: number; error?: string }>;
    setTTL: (connectionId: string, key: string, ttl: number) => Promise<{ success: boolean; error?: string }>;
    deleteKey: (connectionId: string, key: string) => Promise<{ success: boolean; error?: string }>;
    renameKey: (connectionId: string, oldKey: string, newKey: string) => Promise<{ success: boolean; error?: string }>;
    getString: (connectionId: string, key: string) => Promise<{ success: boolean; value?: string; error?: string }>;
    setString: (connectionId: string, key: string, value: string, ttl?: number) => Promise<{ success: boolean; error?: string }>;
    getHash: (connectionId: string, key: string) => Promise<{ success: boolean; value?: Record<string, string>; error?: string }>;
    setHashField: (connectionId: string, key: string, field: string, value: string) => Promise<{ success: boolean; error?: string }>;
    deleteHashField: (connectionId: string, key: string, field: string) => Promise<{ success: boolean; error?: string }>;
    getList: (connectionId: string, key: string, start: number, stop: number) => Promise<{ success: boolean; value?: string[]; total?: number; error?: string }>;
    pushList: (connectionId: string, key: string, value: string, position: 'left' | 'right') => Promise<{ success: boolean; error?: string }>;
    deleteListItem: (connectionId: string, key: string, index: number, count: number) => Promise<{ success: boolean; error?: string }>;
    getSet: (connectionId: string, key: string) => Promise<{ success: boolean; value?: string[]; error?: string }>;
    addSetMember: (connectionId: string, key: string, member: string) => Promise<{ success: boolean; error?: string }>;
    removeSetMember: (connectionId: string, key: string, member: string) => Promise<{ success: boolean; error?: string }>;
    getZSet: (connectionId: string, key: string, withScores: boolean) => Promise<{ success: boolean; value?: Array<{ member: string; score: number }>; total?: number; error?: string }>;
    addZSetMember: (connectionId: string, key: string, member: string, score: number) => Promise<{ success: boolean; error?: string }>;
    removeZSetMember: (connectionId: string, key: string, member: string) => Promise<{ success: boolean; error?: string }>;
    executeCommand: (connectionId: string, command: string) => Promise<{ success: boolean; result?: any; error?: string }>;
    dbSize: (connectionId: string) => Promise<{ success: boolean; size?: number; error?: string }>;
  };
};

interface RedisConnectionConfig {
  id?: string;
  name: string;
  host: string;
  port: number;
  password?: string;
  database: number;
  tls?: boolean;
}

interface KeyInfo {
  key: string;
  type: string;
  ttl: number;
}

interface TabInfo {
  id: string;
  type: 'welcome' | 'key' | 'cli';
  title: string;
  connectionId?: string;
  keyName?: string;
  keyType?: string;
}

export class RedisTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'redis',
    title: 'Redis',
    category: ToolCategory.DEVELOPER,
    icon: '🔴',
    description: 'Redis 管理工具',
    keywords: ['redis', '缓存', 'cache', 'nosql', '键值'],
  };

  readonly config = RedisTool.config;

  private connections: RedisConnectionConfig[] = [];
  private activeConnections: Map<string, string> = new Map();
  private currentConfigId: string | null = null;
  private currentDB: number = 0;
  private keys: KeyInfo[] = [];
  private scanCursor: string = '0';
  private hasMoreKeys: boolean = false;
  private tabs: TabInfo[] = [{ id: 'welcome', type: 'welcome', title: '欢迎' }];
  private activeTabId = 'welcome';
  private editingConfigId: string | null = null;

  render(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = template;
    return container.firstElementChild as HTMLElement;
  }

  protected onMounted(): void {
    this.loadConnections();
    this.renderConnectionList();
  }

  protected bindEvents(): void {
    this.addEventListener(this.querySelector('#addConnectionBtn'), 'click', () => this.showConnectionModal());
    this.addEventListener(this.querySelector('#welcomeAddBtn'), 'click', () => this.showConnectionModal());
    this.addEventListener(this.querySelector('#closeModalBtn'), 'click', () => this.hideConnectionModal());
    this.addEventListener(this.querySelector('#testConnBtn'), 'click', () => this.testConnection());
    this.addEventListener(this.querySelector('#saveConnBtn'), 'click', () => this.saveConnection());
    this.addEventListener(this.querySelector('#connectionModal'), 'click', (e) => {
      if ((e.target as HTMLElement).id === 'connectionModal') this.hideConnectionModal();
    });
    this.addEventListener(this.querySelector('#refreshKeysBtn'), 'click', () => this.refreshKeys());
    this.addEventListener(this.querySelector('#keySearchBtn'), 'click', () => this.refreshKeys());
    this.addEventListener(this.querySelector('#keySearchInput'), 'keypress', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') this.refreshKeys();
    });
    this.addEventListener(this.querySelector('#dbSelect'), 'change', (e) => {
      this.switchDatabase(parseInt((e.target as HTMLSelectElement).value));
    });
    this.addEventListener(this.querySelector('#addKeyBtn'), 'click', () => this.showAddKeyModal());
    this.addEventListener(this.querySelector('#closeAddKeyModalBtn'), 'click', () => this.hideAddKeyModal());
    this.addEventListener(this.querySelector('#cancelAddKeyBtn'), 'click', () => this.hideAddKeyModal());
    this.addEventListener(this.querySelector('#confirmAddKeyBtn'), 'click', () => this.createNewKey());
    this.addEventListener(this.querySelector('#addKeyModal'), 'click', (e) => {
      if ((e.target as HTMLElement).id === 'addKeyModal') this.hideAddKeyModal();
    });
  }

  private loadConnections(): void {
    try {
      const saved = localStorage.getItem('redis_connections');
      if (saved) this.connections = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load Redis connections:', e);
    }
  }

  private saveConnections(): void {
    try {
      localStorage.setItem('redis_connections', JSON.stringify(this.connections));
    } catch (e) {
      console.error('Failed to save Redis connections:', e);
    }
  }

  private renderConnectionList(): void {
    const list = this.querySelector('#connectionList');
    if (!list) return;

    if (this.connections.length === 0) {
      list.innerHTML = '<div class="empty-hint">暂无连接配置</div>';
      return;
    }

    list.innerHTML = this.connections.map(conn => {
      const isConnected = this.activeConnections.has(conn.id!);
      const isActive = this.currentConfigId === conn.id;
      return `
        <div class="connection-item ${isConnected ? 'connected' : ''} ${isActive ? 'active' : ''}" data-id="${conn.id}">
          <div class="conn-icon">🔴</div>
          <div class="conn-info">
            <div class="conn-name">${this.escapeHtml(conn.name)}</div>
            <div class="conn-detail">${this.escapeHtml(conn.host)}:${conn.port}</div>
          </div>
          <div class="conn-actions">
            <button class="conn-action-btn edit" data-action="edit" title="编辑">✏️</button>
            <button class="conn-action-btn delete" data-action="delete" title="删除">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.connection-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const action = target.dataset.action;
        const id = (item as HTMLElement).dataset.id!;
        if (action === 'edit') { e.stopPropagation(); this.editConnection(id); }
        else if (action === 'delete') { e.stopPropagation(); this.deleteConnection(id); }
        else this.connectToRedis(id);
      });
    });
  }

  private showConnectionModal(config?: RedisConnectionConfig): void {
    const modal = this.querySelector('#connectionModal');
    const title = this.querySelector('#modalTitle');
    if (!modal || !title) return;

    this.editingConfigId = config?.id || null;
    title.textContent = config ? '编辑 Redis 连接' : '添加 Redis 连接';

    (this.querySelector('#connName') as HTMLInputElement).value = config?.name || '';
    (this.querySelector('#connHost') as HTMLInputElement).value = config?.host || 'localhost';
    (this.querySelector('#connPort') as HTMLInputElement).value = String(config?.port || 6379);
    (this.querySelector('#connPassword') as HTMLInputElement).value = config?.password || '';
    (this.querySelector('#connDatabase') as HTMLSelectElement).value = String(config?.database || 0);
    (this.querySelector('#connTLS') as HTMLInputElement).checked = config?.tls || false;

    modal.style.display = 'flex';
  }

  private hideConnectionModal(): void {
    const modal = this.querySelector('#connectionModal');
    if (modal) modal.style.display = 'none';
    this.editingConfigId = null;
  }

  private getFormConfig(): RedisConnectionConfig {
    return {
      id: this.editingConfigId || `redis_${Date.now()}`,
      name: (this.querySelector('#connName') as HTMLInputElement).value.trim(),
      host: (this.querySelector('#connHost') as HTMLInputElement).value.trim() || 'localhost',
      port: parseInt((this.querySelector('#connPort') as HTMLInputElement).value) || 6379,
      password: (this.querySelector('#connPassword') as HTMLInputElement).value || undefined,
      database: parseInt((this.querySelector('#connDatabase') as HTMLSelectElement).value) || 0,
      tls: (this.querySelector('#connTLS') as HTMLInputElement).checked,
    };
  }

  private async testConnection(): Promise<void> {
    const config = this.getFormConfig();
    if (!config.name) { toast('请输入连接名称'); return; }

    this.setStatus('正在测试连接...', 'loading');
    try {
      const result = await llmHub.redis.testConnection(config);
      if (result.success) { toast('连接成功！'); this.setStatus('连接测试成功'); }
      else { toast(`连接失败: ${result.error}`); this.setStatus('连接测试失败', 'error'); }
    } catch (e) { toast(`连接失败: ${e}`); this.setStatus('连接测试失败', 'error'); }
  }

  private saveConnection(): void {
    const config = this.getFormConfig();
    if (!config.name) { toast('请输入连接名称'); return; }

    if (this.editingConfigId) {
      const index = this.connections.findIndex(c => c.id === this.editingConfigId);
      if (index !== -1) this.connections[index] = config;
    } else {
      this.connections.push(config);
    }

    this.saveConnections();
    this.renderConnectionList();
    this.hideConnectionModal();
    toast('连接配置已保存');
  }

  private editConnection(id: string): void {
    const config = this.connections.find(c => c.id === id);
    if (config) this.showConnectionModal(config);
  }

  private deleteConnection(id: string): void {
    if (!confirm('确定要删除这个连接配置吗？')) return;

    if (this.activeConnections.has(id)) {
      const connectionId = this.activeConnections.get(id)!;
      llmHub.redis.disconnect(connectionId).catch(console.error);
      this.activeConnections.delete(id);
    }

    this.connections = this.connections.filter(c => c.id !== id);
    this.saveConnections();
    this.renderConnectionList();

    if (this.currentConfigId === id) {
      this.currentConfigId = null;
      const keysPanel = this.querySelector('#keysPanel');
      if (keysPanel) keysPanel.style.display = 'none';
    }

    toast('连接配置已删除');
  }

  private async connectToRedis(configId: string): Promise<void> {
    const config = this.connections.find(c => c.id === configId);
    if (!config) return;

    this.currentConfigId = configId;
    this.renderConnectionList();

    if (this.activeConnections.has(configId)) {
      await this.loadKeys();
      return;
    }

    this.setStatus(`正在连接 ${config.name}...`, 'loading');

    try {
      const result = await llmHub.redis.connect(config);
      if (result.success && result.connectionId) {
        this.activeConnections.set(configId, result.connectionId);
        this.currentDB = config.database;
        (this.querySelector('#dbSelect') as HTMLSelectElement).value = String(this.currentDB);
        this.renderConnectionList();
        await this.loadKeys();
        this.setStatus(`已连接: ${config.name}`, 'connected');
        toast(`已连接到 ${config.name}`);
      } else {
        toast(`连接失败: ${result.error}`);
        this.setStatus('连接失败', 'error');
      }
    } catch (e) {
      toast(`连接失败: ${e}`);
      this.setStatus('连接失败', 'error');
    }
  }

  private async switchDatabase(db: number): Promise<void> {
    if (!this.currentConfigId) return;
    const connectionId = this.activeConnections.get(this.currentConfigId);
    if (!connectionId) return;

    this.setStatus(`切换到 DB ${db}...`, 'loading');
    try {
      const result = await llmHub.redis.selectDB(connectionId, db);
      if (result.success) {
        this.currentDB = db;
        await this.loadKeys();
        this.setStatus(`已切换到 DB ${db}`, 'connected');
      } else {
        toast(`切换失败: ${result.error}`);
        this.setStatus('切换失败', 'error');
      }
    } catch (e) {
      toast(`切换失败: ${e}`);
      this.setStatus('切换失败', 'error');
    }
  }

  private async loadKeys(pattern: string = '*', append: boolean = false): Promise<void> {
    if (!this.currentConfigId) return;
    const connectionId = this.activeConnections.get(this.currentConfigId);
    if (!connectionId) return;

    const keysPanel = this.querySelector('#keysPanel');
    const keysContainer = this.querySelector('#keysContainer');
    const keyCount = this.querySelector('#keyCount');
    if (!keysPanel || !keysContainer) return;

    keysPanel.style.display = 'flex';

    if (!append) {
      this.keys = [];
      this.scanCursor = '0';
      keysContainer.innerHTML = '<div class="empty-hint">加载中...</div>';
    }

    try {
      const result = await llmHub.redis.scan(connectionId, this.scanCursor, pattern, 100);
      if (result.success && result.keys) {
        this.scanCursor = result.cursor || '0';
        this.hasMoreKeys = this.scanCursor !== '0';

        const keyInfos: KeyInfo[] = await Promise.all(
          result.keys.map(async (key) => {
            const [typeRes, ttlRes] = await Promise.all([
              llmHub.redis.getType(connectionId, key),
              llmHub.redis.getTTL(connectionId, key),
            ]);
            return { key, type: typeRes.type || 'unknown', ttl: ttlRes.ttl ?? -1 };
          })
        );

        this.keys = append ? [...this.keys, ...keyInfos] : keyInfos;
        this.renderKeyList();

        const sizeRes = await llmHub.redis.dbSize(connectionId);
        if (keyCount && sizeRes.success) keyCount.textContent = `${sizeRes.size} keys`;
      } else {
        keysContainer.innerHTML = `<div class="empty-hint">加载失败: ${result.error}</div>`;
      }
    } catch (e) {
      keysContainer.innerHTML = `<div class="empty-hint">加载失败: ${e}</div>`;
    }
  }

  private renderKeyList(): void {
    const keysContainer = this.querySelector('#keysContainer');
    if (!keysContainer) return;

    if (this.keys.length === 0) {
      keysContainer.innerHTML = '<div class="empty-hint">没有找到键</div>';
      return;
    }

    keysContainer.innerHTML = this.keys.map(info => {
      const ttlClass = info.ttl > 0 && info.ttl < 60 ? 'expiring' : info.ttl === -2 ? 'expired' : '';
      const ttlText = info.ttl === -1 ? '' : info.ttl === -2 ? '已过期' : `${info.ttl}s`;
      return `
        <div class="key-item" data-key="${this.escapeHtml(info.key)}" data-type="${info.type}">
          <span class="key-type ${info.type}">${info.type}</span>
          <span class="key-name">${this.escapeHtml(info.key)}</span>
          ${ttlText ? `<span class="key-ttl ${ttlClass}">${ttlText}</span>` : ''}
        </div>
      `;
    }).join('') + (this.hasMoreKeys ? '<button class="load-more-btn">加载更多...</button>' : '');

    keysContainer.querySelectorAll('.key-item').forEach(item => {
      item.addEventListener('click', () => {
        const key = (item as HTMLElement).dataset.key!;
        const type = (item as HTMLElement).dataset.type!;
        this.openKeyTab(key, type);
      });
    });

    keysContainer.querySelector('.load-more-btn')?.addEventListener('click', () => {
      const pattern = (this.querySelector('#keySearchInput') as HTMLInputElement).value.trim() || '*';
      this.loadKeys(pattern, true);
    });
  }

  private refreshKeys(): void {
    const pattern = (this.querySelector('#keySearchInput') as HTMLInputElement).value.trim() || '*';
    this.loadKeys(pattern);
  }

  private openKeyTab(key: string, type: string): void {
    if (!this.currentConfigId) return;
    const tabId = `key_${this.currentConfigId}_${key}`;
    const existingTab = this.tabs.find(t => t.id === tabId);
    if (existingTab) { this.switchTab(tabId); return; }

    const tab: TabInfo = {
      id: tabId, type: 'key', title: key.length > 20 ? key.slice(0, 20) + '...' : key,
      connectionId: this.currentConfigId, keyName: key, keyType: type,
    };
    this.tabs.push(tab);
    this.renderTabs();
    this.createKeyPanel(tab);
    this.switchTab(tabId);
  }

  private openCLITab(): void {
    if (!this.currentConfigId) return;
    const config = this.connections.find(c => c.id === this.currentConfigId);
    const tabId = `cli_${this.currentConfigId}`;
    const existingTab = this.tabs.find(t => t.id === tabId);
    if (existingTab) { this.switchTab(tabId); return; }

    const tab: TabInfo = { id: tabId, type: 'cli', title: `CLI - ${config?.name || 'Redis'}`, connectionId: this.currentConfigId };
    this.tabs.push(tab);
    this.renderTabs();
    this.createCLIPanel(tab);
    this.switchTab(tabId);
  }

  private renderTabs(): void {
    const tabBar = this.querySelector('#tabBar');
    if (!tabBar) return;

    tabBar.innerHTML = this.tabs.map(tab => `
      <div class="tab ${tab.id === this.activeTabId ? 'active' : ''}" data-tab="${tab.id}">
        <span>${this.escapeHtml(tab.title)}</span>
        ${tab.type !== 'welcome' ? '<button class="tab-close" data-close="true">×</button>' : ''}
      </div>
    `).join('');

    tabBar.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.dataset.close) { e.stopPropagation(); this.closeTab((tab as HTMLElement).dataset.tab!); }
        else this.switchTab((tab as HTMLElement).dataset.tab!);
      });
    });
  }

  private switchTab(tabId: string): void {
    this.activeTabId = tabId;
    this.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', (tab as HTMLElement).dataset.tab === tabId));
    this.querySelectorAll('.content-panel').forEach(panel => panel.classList.toggle('active', (panel as HTMLElement).dataset.panel === tabId));
  }

  private closeTab(tabId: string): void {
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    const panel = this.querySelector(`.content-panel[data-panel="${tabId}"]`);
    if (panel) panel.remove();

    this.tabs.splice(index, 1);
    this.renderTabs();

    if (this.activeTabId === tabId) {
      const newActiveTab = this.tabs[Math.max(0, index - 1)];
      if (newActiveTab) this.switchTab(newActiveTab.id);
    }
  }

  private async createKeyPanel(tab: TabInfo): Promise<void> {
    const panels = this.querySelector('.content-panels');
    if (!panels || !tab.connectionId || !tab.keyName) return;

    const connectionId = this.activeConnections.get(tab.connectionId);
    if (!connectionId) return;

    const panel = document.createElement('div');
    panel.className = 'content-panel';
    panel.dataset.panel = tab.id;
    panel.innerHTML = '<div class="empty-hint">加载中...</div>';
    panels.appendChild(panel);

    const [ttlRes] = await Promise.all([llmHub.redis.getTTL(connectionId, tab.keyName)]);
    const ttl = ttlRes.ttl ?? -1;
    const ttlText = ttl === -1 ? '永不过期' : ttl === -2 ? '已过期' : `${ttl} 秒`;

    let contentHtml = '';
    switch (tab.keyType) {
      case 'string': contentHtml = await this.renderStringEditor(connectionId, tab.keyName); break;
      case 'hash': contentHtml = await this.renderHashEditor(connectionId, tab.keyName); break;
      case 'list': contentHtml = await this.renderListEditor(connectionId, tab.keyName); break;
      case 'set': contentHtml = await this.renderSetEditor(connectionId, tab.keyName); break;
      case 'zset': contentHtml = await this.renderZSetEditor(connectionId, tab.keyName); break;
      default: contentHtml = '<div class="empty-hint">不支持的类型</div>';
    }

    panel.innerHTML = `
      <div class="key-panel">
        <div class="key-header">
          <div class="key-info">
            <div class="key-full-name">${this.escapeHtml(tab.keyName)}</div>
            <div class="key-meta">
              <span>类型: <strong>${tab.keyType}</strong></span>
              <span>TTL: <strong>${ttlText}</strong></span>
            </div>
          </div>
          <div class="key-actions">
            <button class="key-action-btn secondary cli-btn">CLI</button>
            <button class="key-action-btn secondary ttl-btn">设置 TTL</button>
            <button class="key-action-btn secondary rename-btn">重命名</button>
            <button class="key-action-btn danger delete-btn">删除</button>
          </div>
        </div>
        <div class="key-content">${contentHtml}</div>
      </div>
    `;

    this.bindKeyPanelEvents(panel, tab, connectionId);
  }

  private bindKeyPanelEvents(panel: HTMLElement, tab: TabInfo, connectionId: string): void {
    const key = tab.keyName!;

    panel.querySelector('.cli-btn')?.addEventListener('click', () => this.openCLITab());

    panel.querySelector('.ttl-btn')?.addEventListener('click', async () => {
      const newTTL = prompt('输入新的 TTL（秒），-1 表示永不过期:', '-1');
      if (newTTL === null) return;
      const result = await llmHub.redis.setTTL(connectionId, key, parseInt(newTTL));
      if (result.success) { toast('TTL 已更新'); this.refreshKeys(); }
      else toast(`更新失败: ${result.error}`);
    });

    panel.querySelector('.rename-btn')?.addEventListener('click', async () => {
      const newKey = prompt('输入新的键名:', key);
      if (!newKey || newKey === key) return;
      const result = await llmHub.redis.renameKey(connectionId, key, newKey);
      if (result.success) {
        toast('键已重命名');
        this.closeTab(tab.id);
        this.refreshKeys();
        this.openKeyTab(newKey, tab.keyType!);
      } else toast(`重命名失败: ${result.error}`);
    });

    panel.querySelector('.delete-btn')?.addEventListener('click', async () => {
      if (!confirm(`确定要删除键 "${key}" 吗？`)) return;
      const result = await llmHub.redis.deleteKey(connectionId, key);
      if (result.success) { toast('键已删除'); this.closeTab(tab.id); this.refreshKeys(); }
      else toast(`删除失败: ${result.error}`);
    });

    // String save
    panel.querySelector('.save-string-btn')?.addEventListener('click', async () => {
      const textarea = panel.querySelector('.string-value') as HTMLTextAreaElement;
      const result = await llmHub.redis.setString(connectionId, key, textarea.value);
      if (result.success) toast('保存成功');
      else toast(`保存失败: ${result.error}`);
    });

    // Hash add field
    panel.querySelector('.add-hash-field-btn')?.addEventListener('click', async () => {
      const field = prompt('输入字段名:');
      if (!field) return;
      const value = prompt('输入值:') || '';
      const result = await llmHub.redis.setHashField(connectionId, key, field, value);
      if (result.success) { toast('字段已添加'); this.refreshKeyPanel(tab); }
      else toast(`添加失败: ${result.error}`);
    });

    // Hash delete field
    panel.querySelectorAll('[data-action="delete-field"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = (btn as HTMLElement).closest('tr');
        const field = row?.dataset.field;
        if (!field || !confirm(`确定删除字段 "${field}" 吗？`)) return;
        const result = await llmHub.redis.deleteHashField(connectionId, key, field);
        if (result.success) { toast('字段已删除'); row?.remove(); }
        else toast(`删除失败: ${result.error}`);
      });
    });

    // List push
    panel.querySelector('.push-left-btn')?.addEventListener('click', async () => {
      const value = prompt('输入要插入的值:');
      if (value === null) return;
      const result = await llmHub.redis.pushList(connectionId, key, value, 'left');
      if (result.success) { toast('已插入到头部'); this.refreshKeyPanel(tab); }
      else toast(`插入失败: ${result.error}`);
    });

    panel.querySelector('.push-right-btn')?.addEventListener('click', async () => {
      const value = prompt('输入要插入的值:');
      if (value === null) return;
      const result = await llmHub.redis.pushList(connectionId, key, value, 'right');
      if (result.success) { toast('已插入到尾部'); this.refreshKeyPanel(tab); }
      else toast(`插入失败: ${result.error}`);
    });

    // Set add member
    panel.querySelector('.add-set-member-btn')?.addEventListener('click', async () => {
      const member = prompt('输入成员:');
      if (!member) return;
      const result = await llmHub.redis.addSetMember(connectionId, key, member);
      if (result.success) { toast('成员已添加'); this.refreshKeyPanel(tab); }
      else toast(`添加失败: ${result.error}`);
    });

    // Set delete member
    panel.querySelectorAll('[data-action="delete-set-member"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = (btn as HTMLElement).closest('tr');
        const member = row?.dataset.member;
        if (!member || !confirm(`确定删除成员 "${member}" 吗？`)) return;
        const result = await llmHub.redis.removeSetMember(connectionId, key, member);
        if (result.success) { toast('成员已删除'); row?.remove(); }
        else toast(`删除失败: ${result.error}`);
      });
    });

    // ZSet add member
    panel.querySelector('.add-zset-member-btn')?.addEventListener('click', async () => {
      const member = prompt('输入成员:');
      if (!member) return;
      const scoreStr = prompt('输入分数:', '0');
      if (scoreStr === null) return;
      const result = await llmHub.redis.addZSetMember(connectionId, key, member, parseFloat(scoreStr));
      if (result.success) { toast('成员已添加'); this.refreshKeyPanel(tab); }
      else toast(`添加失败: ${result.error}`);
    });

    // ZSet delete member
    panel.querySelectorAll('[data-action="delete-zset-member"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = (btn as HTMLElement).closest('tr');
        const member = row?.dataset.member;
        if (!member || !confirm(`确定删除成员 "${member}" 吗？`)) return;
        const result = await llmHub.redis.removeZSetMember(connectionId, key, member);
        if (result.success) { toast('成员已删除'); row?.remove(); }
        else toast(`删除失败: ${result.error}`);
      });
    });
  }

  private async refreshKeyPanel(tab: TabInfo): Promise<void> {
    const panel = this.querySelector(`.content-panel[data-panel="${tab.id}"]`);
    if (panel) { panel.remove(); await this.createKeyPanel(tab); this.switchTab(tab.id); }
  }

  private async renderStringEditor(connectionId: string, key: string): Promise<string> {
    const result = await llmHub.redis.getString(connectionId, key);
    const value = result.value || '';
    return `
      <div class="string-editor">
        <textarea class="string-value">${this.escapeHtml(value)}</textarea>
        <div style="margin-top: 12px;">
          <button class="key-action-btn primary save-string-btn">保存</button>
        </div>
      </div>
    `;
  }

  private async renderHashEditor(connectionId: string, key: string): Promise<string> {
    const result = await llmHub.redis.getHash(connectionId, key);
    const hash = result.value || {};
    const entries = Object.entries(hash);
    return `
      <div class="data-table-wrap">
        <table class="data-table hash-table">
          <thead><tr><th>Field</th><th>Value</th><th width="80">操作</th></tr></thead>
          <tbody>
            ${entries.map(([field, value]) => `
              <tr data-field="${this.escapeHtml(field)}">
                <td>${this.escapeHtml(field)}</td>
                <td>${this.escapeHtml(value)}</td>
                <td class="row-actions"><button class="row-action-btn delete" data-action="delete-field">删除</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <button class="add-row-btn add-hash-field-btn">+ 添加字段</button>
    `;
  }

  private async renderListEditor(connectionId: string, key: string): Promise<string> {
    const result = await llmHub.redis.getList(connectionId, key, 0, 99);
    const items = result.value || [];
    return `
      <div class="data-table-wrap">
        <table class="data-table list-table">
          <thead><tr><th width="60">Index</th><th>Value</th></tr></thead>
          <tbody>
            ${items.map((value, index) => `
              <tr data-index="${index}"><td>${index}</td><td>${this.escapeHtml(value)}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="key-action-btn secondary push-left-btn">← 插入头部</button>
        <button class="key-action-btn secondary push-right-btn">插入尾部 →</button>
      </div>
      ${(result.total || 0) > 100 ? '<div class="empty-hint" style="margin-top: 8px;">显示前 100 条</div>' : ''}
    `;
  }

  private async renderSetEditor(connectionId: string, key: string): Promise<string> {
    const result = await llmHub.redis.getSet(connectionId, key);
    const members = result.value || [];
    return `
      <div class="data-table-wrap">
        <table class="data-table set-table">
          <thead><tr><th>Member</th><th width="80">操作</th></tr></thead>
          <tbody>
            ${members.map(member => `
              <tr data-member="${this.escapeHtml(member)}">
                <td>${this.escapeHtml(member)}</td>
                <td class="row-actions"><button class="row-action-btn delete" data-action="delete-set-member">删除</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <button class="add-row-btn add-set-member-btn">+ 添加成员</button>
    `;
  }

  private async renderZSetEditor(connectionId: string, key: string): Promise<string> {
    const result = await llmHub.redis.getZSet(connectionId, key, true);
    const members = result.value || [];
    return `
      <div class="data-table-wrap">
        <table class="data-table zset-table">
          <thead><tr><th width="100">Score</th><th>Member</th><th width="80">操作</th></tr></thead>
          <tbody>
            ${members.map(item => `
              <tr data-member="${this.escapeHtml(item.member)}">
                <td>${item.score}</td>
                <td>${this.escapeHtml(item.member)}</td>
                <td class="row-actions"><button class="row-action-btn delete" data-action="delete-zset-member">删除</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <button class="add-row-btn add-zset-member-btn">+ 添加成员</button>
      ${(result.total || 0) > 100 ? '<div class="empty-hint" style="margin-top: 8px;">显示前 100 条</div>' : ''}
    `;
  }

  private createCLIPanel(tab: TabInfo): void {
    const panels = this.querySelector('.content-panels');
    if (!panels || !tab.connectionId) return;

    const connectionId = this.activeConnections.get(tab.connectionId);
    if (!connectionId) return;

    const panel = document.createElement('div');
    panel.className = 'content-panel';
    panel.dataset.panel = tab.id;
    panel.innerHTML = `
      <div class="cli-panel">
        <div class="cli-output"><div class="cli-line info">输入 Redis 命令，按 Enter 执行</div></div>
        <div class="cli-input-wrap">
          <input type="text" class="cli-input" placeholder="输入命令，如: GET key">
          <button class="cli-run-btn">执行</button>
        </div>
      </div>
    `;
    panels.appendChild(panel);

    const output = panel.querySelector('.cli-output')!;
    const input = panel.querySelector('.cli-input') as HTMLInputElement;
    const runBtn = panel.querySelector('.cli-run-btn')!;
    const history: string[] = [];
    let historyIndex = -1;

    const executeCommand = async () => {
      const command = input.value.trim();
      if (!command) return;

      history.unshift(command);
      historyIndex = -1;
      input.value = '';

      output.innerHTML += `<div class="cli-line command">${this.escapeHtml(command)}</div>`;

      try {
        const result = await llmHub.redis.executeCommand(connectionId, command);
        if (result.success) {
          const resultStr = typeof result.result === 'object' ? JSON.stringify(result.result, null, 2) : String(result.result ?? '(nil)');
          output.innerHTML += `<div class="cli-line result">${this.escapeHtml(resultStr)}</div>`;
        } else {
          output.innerHTML += `<div class="cli-line error">${this.escapeHtml(result.error || 'Error')}</div>`;
        }
      } catch (e) {
        output.innerHTML += `<div class="cli-line error">${this.escapeHtml(String(e))}</div>`;
      }

      output.scrollTop = output.scrollHeight;
    };

    runBtn.addEventListener('click', executeCommand);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') executeCommand();
      else if (e.key === 'ArrowUp' && history.length > 0) {
        historyIndex = Math.min(historyIndex + 1, history.length - 1);
        input.value = history[historyIndex];
      } else if (e.key === 'ArrowDown') {
        historyIndex = Math.max(historyIndex - 1, -1);
        input.value = historyIndex >= 0 ? history[historyIndex] : '';
      }
    });
  }

  private showAddKeyModal(): void {
    const modal = this.querySelector('#addKeyModal');
    if (modal) modal.style.display = 'flex';
  }

  private hideAddKeyModal(): void {
    const modal = this.querySelector('#addKeyModal');
    if (modal) modal.style.display = 'none';
  }

  private async createNewKey(): Promise<void> {
    if (!this.currentConfigId) return;
    const connectionId = this.activeConnections.get(this.currentConfigId);
    if (!connectionId) return;

    const keyName = (this.querySelector('#newKeyName') as HTMLInputElement).value.trim();
    const keyType = (this.querySelector('#newKeyType') as HTMLSelectElement).value;
    const keyValue = (this.querySelector('#newKeyValue') as HTMLTextAreaElement).value;
    const ttl = parseInt((this.querySelector('#newKeyTTL') as HTMLInputElement).value) || -1;

    if (!keyName) { toast('请输入键名'); return; }

    let result: { success: boolean; error?: string };
    switch (keyType) {
      case 'string':
        result = await llmHub.redis.setString(connectionId, keyName, keyValue, ttl > 0 ? ttl : undefined);
        break;
      case 'hash':
        const [field, ...valueParts] = keyValue.split(':');
        result = await llmHub.redis.setHashField(connectionId, keyName, field || 'field', valueParts.join(':') || keyValue);
        break;
      case 'list':
        result = await llmHub.redis.pushList(connectionId, keyName, keyValue, 'right');
        break;
      case 'set':
        result = await llmHub.redis.addSetMember(connectionId, keyName, keyValue);
        break;
      case 'zset':
        const [scoreStr, ...memberParts] = keyValue.split(':');
        result = await llmHub.redis.addZSetMember(connectionId, keyName, memberParts.join(':') || keyValue, parseFloat(scoreStr) || 0);
        break;
      default:
        result = { success: false, error: '不支持的类型' };
    }

    if (result.success) {
      if (ttl > 0) await llmHub.redis.setTTL(connectionId, keyName, ttl);
      toast('键创建成功');
      this.hideAddKeyModal();
      this.refreshKeys();
    } else {
      toast(`创建失败: ${result.error}`);
    }
  }

  private setStatus(text: string, type: 'normal' | 'loading' | 'error' | 'connected' = 'normal'): void {
    const statusText = this.querySelector('#statusText');
    const statusDot = this.querySelector('#statusDot');
    if (statusText) statusText.textContent = text;
    if (statusDot) {
      statusDot.className = 'status-dot';
      if (type === 'connected') statusDot.classList.add('connected');
      else if (type === 'loading') statusDot.classList.add('loading');
      else if (type === 'error') statusDot.classList.add('error');
    }
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
