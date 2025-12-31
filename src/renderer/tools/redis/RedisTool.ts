/**
 * Redis 管理工具
 */

import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { getTemplate } from './template';
import { toast } from '../../components/Toast';
import { i18n } from '../../core/i18n';
import type { RedisConnectionConfig } from '../../types';

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
    description: i18n.t('tool.redisDesc'),
    keywords: ['redis', 'cache', 'nosql'],
  };

  readonly config = RedisTool.config;

  private connections: RedisConnectionConfig[] = [];
  private activeConnections: Map<string, string> = new Map();
  private currentConfigId: string | null = null;
  private currentDB: number = 0;
  private keys: KeyInfo[] = [];
  private scanCursor: string = '0';
  private hasMoreKeys: boolean = false;
  private tabs: TabInfo[] = [{ id: 'welcome', type: 'welcome', title: i18n.t('redis.welcome') }];
  private activeTabId = 'welcome';
  private editingConfigId: string | null = null;

  render(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = getTemplate();
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
      list.innerHTML = `<div class="empty-hint">${i18n.t('redis.noConnections')}</div>`;
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
            <button class="conn-action-btn edit" data-action="edit" title="Edit">✏️</button>
            <button class="conn-action-btn delete" data-action="delete" title="Delete">🗑️</button>
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
    title.textContent = config ? i18n.t('redis.editConnection') : i18n.t('redis.addRedisConnection');

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
    console.log('[Redis] testConnection called');
    const config = this.getFormConfig();
    console.log('[Redis] config:', config);
    if (!config.name) { toast(i18n.t('redis.enterConnName')); return; }

    const statusEl = this.querySelector('#connTestStatus');
    const testBtn = this.querySelector('#testConnBtn') as HTMLButtonElement;
    
    if (statusEl) {
      statusEl.textContent = i18n.t('redis.testing');
      statusEl.style.color = '#f59e0b';
    }
    if (testBtn) testBtn.disabled = true;
    
    try {
      console.log('[Redis] calling llmHub.redis.testConnection...');
      const result = await llmHub.redis.testConnection(config);
      console.log('[Redis] testConnection result:', result);
      if (result.success) { 
        if (statusEl) {
          statusEl.textContent = i18n.t('redis.testSuccess');
          statusEl.style.color = '#22c55e';
        }
        toast(i18n.t('redis.connectionSuccess')); 
      } else { 
        if (statusEl) {
          statusEl.textContent = `❌ ${result.error}`;
          statusEl.style.color = '#ef4444';
        }
        toast(`${i18n.t('redis.connectionFailed')}: ${result.error}`); 
      }
    } catch (e) { 
      console.error('[Redis] testConnection error:', e);
      if (statusEl) {
        statusEl.textContent = `❌ ${e}`;
        statusEl.style.color = '#ef4444';
      }
      toast(`${i18n.t('redis.connectionFailed')}: ${e}`); 
    } finally {
      if (testBtn) testBtn.disabled = false;
    }
  }

  private saveConnection(): void {
    console.log('[Redis] saveConnection called');
    const config = this.getFormConfig();
    console.log('[Redis] config to save:', config);
    if (!config.name) { toast(i18n.t('redis.enterConnName')); return; }

    if (this.editingConfigId) {
      const index = this.connections.findIndex(c => c.id === this.editingConfigId);
      if (index !== -1) this.connections[index] = config;
    } else {
      this.connections.push(config);
    }

    this.saveConnections();
    this.renderConnectionList();
    this.hideConnectionModal();
    toast(i18n.t('redis.configSaved'));
    console.log('[Redis] connection saved successfully');
  }

  private editConnection(id: string): void {
    const config = this.connections.find(c => c.id === id);
    if (config) this.showConnectionModal(config);
  }

  private deleteConnection(id: string): void {
    if (!confirm(i18n.t('redis.confirmDelete'))) return;

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
      this.setStatus(i18n.t('redis.notConnected'));
    }

    toast(i18n.t('redis.configDeleted'));
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

    this.setStatus(`${i18n.t('redis.connecting')} ${config.name}...`, 'loading');

    try {
      const result = await llmHub.redis.connect(config);
      if (result.success && result.connectionId) {
        this.activeConnections.set(configId, result.connectionId);
        this.currentDB = config.database;
        (this.querySelector('#dbSelect') as HTMLSelectElement).value = String(this.currentDB);
        this.renderConnectionList();
        await this.loadKeys();
        this.setStatus(`${i18n.t('redis.connected')}: ${config.name}`, 'connected');
        toast(`${i18n.t('redis.connectedTo')} ${config.name}`);
      } else {
        toast(`${i18n.t('redis.connectionFailed')}: ${result.error}`);
        this.setStatus(i18n.t('redis.connectionFailed'), 'error');
      }
    } catch (e) {
      toast(`${i18n.t('redis.connectionFailed')}: ${e}`);
      this.setStatus(i18n.t('redis.connectionFailed'), 'error');
    }
  }

  private async switchDatabase(db: number): Promise<void> {
    if (!this.currentConfigId) return;
    const connectionId = this.activeConnections.get(this.currentConfigId);
    if (!connectionId) return;

    this.setStatus(`Switching to DB ${db}...`, 'loading');
    try {
      const result = await llmHub.redis.selectDB(connectionId, db);
      if (result.success) {
        this.currentDB = db;
        await this.loadKeys();
        this.setStatus(`Switched to DB ${db}`, 'connected');
      } else {
        toast(`Switch failed: ${result.error}`);
        this.setStatus('Switch failed', 'error');
      }
    } catch (e) {
      toast(`Switch failed: ${e}`);
      this.setStatus('Switch failed', 'error');
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
      keysContainer.innerHTML = '<div class="empty-hint">Loading...</div>';
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
        keysContainer.innerHTML = `<div class="empty-hint">Load failed: ${result.error}</div>`;
      }
    } catch (e) {
      keysContainer.innerHTML = `<div class="empty-hint">Load failed: ${e}</div>`;
    }
  }

  private renderKeyList(): void {
    const keysContainer = this.querySelector('#keysContainer');
    if (!keysContainer) return;

    if (this.keys.length === 0) {
      keysContainer.innerHTML = '<div class="empty-hint">No keys found</div>';
      return;
    }

    keysContainer.innerHTML = this.keys.map(info => {
      const ttlClass = info.ttl > 0 && info.ttl < 60 ? 'expiring' : info.ttl === -2 ? 'expired' : '';
      const ttlText = info.ttl === -1 ? '' : info.ttl === -2 ? 'Expired' : `${info.ttl}s`;
      return `
        <div class="key-item" data-key="${this.escapeHtml(info.key)}" data-type="${info.type}">
          <span class="key-type ${info.type}">${info.type}</span>
          <span class="key-name">${this.escapeHtml(info.key)}</span>
          ${ttlText ? `<span class="key-ttl ${ttlClass}">${ttlText}</span>` : ''}
        </div>
      `;
    }).join('') + (this.hasMoreKeys ? '<button class="load-more-btn">Load more...</button>' : '');

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
    panel.innerHTML = '<div class="empty-hint">' + i18n.t('common.loading') + '</div>';
    panels.appendChild(panel);

    const [ttlRes] = await Promise.all([llmHub.redis.getTTL(connectionId, tab.keyName)]);
    const ttl = ttlRes.ttl ?? -1;
    const ttlText = ttl === -1 ? i18n.t('redis.neverExpire') : ttl === -2 ? i18n.t('redis.expired') : `${ttl} ${i18n.t('common.seconds')}`;

    let contentHtml = '';
    switch (tab.keyType) {
      case 'string': contentHtml = await this.renderStringEditor(connectionId, tab.keyName); break;
      case 'hash': contentHtml = await this.renderHashEditor(connectionId, tab.keyName); break;
      case 'list': contentHtml = await this.renderListEditor(connectionId, tab.keyName); break;
      case 'set': contentHtml = await this.renderSetEditor(connectionId, tab.keyName); break;
      case 'zset': contentHtml = await this.renderZSetEditor(connectionId, tab.keyName); break;
      default: contentHtml = '<div class="empty-hint">' + i18n.t('redis.unsupportedType') + '</div>';
    }

    panel.innerHTML = `
      <div class="key-panel">
        <div class="key-header">
          <div class="key-info">
            <div class="key-full-name">${this.escapeHtml(tab.keyName)}</div>
            <div class="key-meta">
              <span>${i18n.t('redis.type')}: <strong>${tab.keyType}</strong></span>
              <span>TTL: <strong>${ttlText}</strong></span>
            </div>
          </div>
          <div class="key-actions">
            <button class="key-action-btn secondary cli-btn">CLI</button>
            <button class="key-action-btn secondary ttl-btn">Set TTL</button>
            <button class="key-action-btn secondary rename-btn">${i18n.t('redis.rename')}</button>
            <button class="key-action-btn danger delete-btn">${i18n.t('redis.delete')}</button>
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
      const newTTL = prompt(i18n.t('redis.ttl'), '-1');
      if (newTTL === null) return;
      const result = await llmHub.redis.setTTL(connectionId, key, parseInt(newTTL));
      if (result.success) { toast('TTL updated'); this.refreshKeys(); }
      else toast(`Update failed: ${result.error}`);
    });

    panel.querySelector('.rename-btn')?.addEventListener('click', async () => {
      const newKey = prompt('Enter new key name:', key);
      if (!newKey || newKey === key) return;
      const result = await llmHub.redis.renameKey(connectionId, key, newKey);
      if (result.success) {
        toast('Key renamed');
        this.closeTab(tab.id);
        this.refreshKeys();
        this.openKeyTab(newKey, tab.keyType!);
      } else toast(`Rename failed: ${result.error}`);
    });

    panel.querySelector('.delete-btn')?.addEventListener('click', async () => {
      if (!confirm(i18n.t('redis.confirmDeleteKey').replace('{key}', key))) return;
      const result = await llmHub.redis.deleteKey(connectionId, key);
      if (result.success) { toast(i18n.t('redis.keyDeleted')); this.closeTab(tab.id); this.refreshKeys(); }
      else toast(`${i18n.t('redis.deleteFailed')}: ${result.error}`);
    });

    // String save
    panel.querySelector('.save-string-btn')?.addEventListener('click', async () => {
      const textarea = panel.querySelector('.string-value') as HTMLTextAreaElement;
      const result = await llmHub.redis.setString(connectionId, key, textarea.value);
      if (result.success) toast(i18n.t('redis.saveSuccess'));
      else toast(`${i18n.t('redis.saveFailed')}: ${result.error}`);
    });

    // Hash add field
    panel.querySelector('.add-hash-field-btn')?.addEventListener('click', async () => {
      const field = prompt('Enter field name:');
      if (!field) return;
      const value = prompt('Enter value:') || '';
      const result = await llmHub.redis.setHashField(connectionId, key, field, value);
      if (result.success) { toast('Field added'); this.refreshKeyPanel(tab); }
      else toast(`Add failed: ${result.error}`);
    });

    // Hash delete field
    panel.querySelectorAll('[data-action="delete-field"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = (btn as HTMLElement).closest('tr');
        const field = row?.dataset.field;
        if (!field || !confirm(i18n.t('redis.confirmDeleteField').replace('{field}', field))) return;
        const result = await llmHub.redis.deleteHashField(connectionId, key, field);
        if (result.success) { toast(i18n.t('redis.fieldDeleted')); row?.remove(); }
        else toast(`${i18n.t('redis.deleteFailed')}: ${result.error}`);
      });
    });

    // List push
    panel.querySelector('.push-left-btn')?.addEventListener('click', async () => {
      const value = prompt('Enter value to insert:');
      if (value === null) return;
      const result = await llmHub.redis.pushList(connectionId, key, value, 'left');
      if (result.success) { toast('Inserted at head'); this.refreshKeyPanel(tab); }
      else toast(`Insert failed: ${result.error}`);
    });

    panel.querySelector('.push-right-btn')?.addEventListener('click', async () => {
      const value = prompt('Enter value to insert:');
      if (value === null) return;
      const result = await llmHub.redis.pushList(connectionId, key, value, 'right');
      if (result.success) { toast('Inserted at tail'); this.refreshKeyPanel(tab); }
      else toast(`Insert failed: ${result.error}`);
    });

    // Set add member
    panel.querySelector('.add-set-member-btn')?.addEventListener('click', async () => {
      const member = prompt('Enter member:');
      if (!member) return;
      const result = await llmHub.redis.addSetMember(connectionId, key, member);
      if (result.success) { toast('Member added'); this.refreshKeyPanel(tab); }
      else toast(`Add failed: ${result.error}`);
    });

    // Set delete member
    panel.querySelectorAll('[data-action="delete-set-member"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = (btn as HTMLElement).closest('tr');
        const member = row?.dataset.member;
        if (!member || !confirm(i18n.t('redis.confirmDeleteMember').replace('{member}', member))) return;
        const result = await llmHub.redis.removeSetMember(connectionId, key, member);
        if (result.success) { toast(i18n.t('redis.memberDeleted')); row?.remove(); }
        else toast(`${i18n.t('redis.deleteFailed')}: ${result.error}`);
      });
    });

    // ZSet add member
    panel.querySelector('.add-zset-member-btn')?.addEventListener('click', async () => {
      const member = prompt('Enter member:');
      if (!member) return;
      const scoreStr = prompt('Enter score:', '0');
      if (scoreStr === null) return;
      const result = await llmHub.redis.addZSetMember(connectionId, key, member, parseFloat(scoreStr));
      if (result.success) { toast('Member added'); this.refreshKeyPanel(tab); }
      else toast(`Add failed: ${result.error}`);
    });

    // ZSet delete member
    panel.querySelectorAll('[data-action="delete-zset-member"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = (btn as HTMLElement).closest('tr');
        const member = row?.dataset.member;
        if (!member || !confirm(i18n.t('redis.confirmDeleteMember').replace('{member}', member))) return;
        const result = await llmHub.redis.removeZSetMember(connectionId, key, member);
        if (result.success) { toast(i18n.t('redis.memberDeleted')); row?.remove(); }
        else toast(`${i18n.t('redis.deleteFailed')}: ${result.error}`);
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
          <button class="key-action-btn primary save-string-btn">${i18n.t('redis.save')}</button>
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
          <thead><tr><th>Field</th><th>Value</th><th width="80">Actions</th></tr></thead>
          <tbody>
            ${entries.map(([field, value]) => `
              <tr data-field="${this.escapeHtml(field)}">
                <td>${this.escapeHtml(field)}</td>
                <td>${this.escapeHtml(value)}</td>
                <td class="row-actions"><button class="row-action-btn delete" data-action="delete-field">${i18n.t('redis.delete')}</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <button class="add-row-btn add-hash-field-btn">+ Add Field</button>
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
        <button class="key-action-btn secondary push-left-btn">← Push Left</button>
        <button class="key-action-btn secondary push-right-btn">Push Right →</button>
      </div>
      ${(result.total || 0) > 100 ? `<div class="empty-hint" style="margin-top: 8px;">${i18n.t('redis.showingFirst100')}</div>` : ''}
    `;
  }

  private async renderSetEditor(connectionId: string, key: string): Promise<string> {
    const result = await llmHub.redis.getSet(connectionId, key);
    const members = result.value || [];
    return `
      <div class="data-table-wrap">
        <table class="data-table set-table">
          <thead><tr><th>Member</th><th width="80">Actions</th></tr></thead>
          <tbody>
            ${members.map(member => `
              <tr data-member="${this.escapeHtml(member)}">
                <td>${this.escapeHtml(member)}</td>
                <td class="row-actions"><button class="row-action-btn delete" data-action="delete-set-member">${i18n.t('redis.delete')}</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <button class="add-row-btn add-set-member-btn">+ Add Member</button>
    `;
  }

  private async renderZSetEditor(connectionId: string, key: string): Promise<string> {
    const result = await llmHub.redis.getZSet(connectionId, key, true);
    const members = result.value || [];
    return `
      <div class="data-table-wrap">
        <table class="data-table zset-table">
          <thead><tr><th width="100">Score</th><th>Member</th><th width="80">Actions</th></tr></thead>
          <tbody>
            ${members.map(item => `
              <tr data-member="${this.escapeHtml(item.member)}">
                <td>${item.score}</td>
                <td>${this.escapeHtml(item.member)}</td>
                <td class="row-actions"><button class="row-action-btn delete" data-action="delete-zset-member">${i18n.t('redis.delete')}</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <button class="add-row-btn add-zset-member-btn">+ Add Member</button>
      ${(result.total || 0) > 100 ? '<div class="empty-hint" style="margin-top: 8px;">Showing first 100</div>' : ''}
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
        <div class="cli-output"><div class="cli-line info">${i18n.t('redis.cliHint')}</div></div>
        <div class="cli-input-wrap">
          <input type="text" class="cli-input" placeholder="${i18n.t('redis.cliPlaceholder')}">
          <button class="cli-run-btn">${i18n.t('redis.execute')}</button>
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

    if (!keyName) { toast(i18n.t('redis.pleaseInputKeyName')); return; }

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
        result = { success: false, error: i18n.t('redis.unsupportedType') };
    }

    if (result.success) {
      if (ttl > 0) await llmHub.redis.setTTL(connectionId, keyName, ttl);
      toast(i18n.t('redis.keyCreated'));
      this.hideAddKeyModal();
      this.refreshKeys();
    } else {
      toast(`${i18n.t('redis.createFailed')}: ${result.error}`);
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
