/**
 * MongoDB 管理工具
 */

import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { getTemplate } from './template';
import { toast } from '../../components/Toast';
import { i18n } from '../../core/i18n';

declare const llmHub: {
  mongo: {
    testConnection: (config: MongoConnectionConfig) => Promise<{ success: boolean; error?: string }>;
    connect: (config: MongoConnectionConfig) => Promise<{ success: boolean; connectionId?: string; error?: string }>;
    disconnect: (connectionId: string) => Promise<{ success: boolean; error?: string }>;
    listDatabases: (connectionId: string) => Promise<{ success: boolean; databases?: string[]; error?: string }>;
    listCollections: (connectionId: string, database: string) => Promise<{ success: boolean; collections?: string[]; error?: string }>;
    getCollectionStats: (connectionId: string, database: string, collection: string) => Promise<{ success: boolean; stats?: { count: number; size: number; avgObjSize: number }; error?: string }>;
    findDocuments: (connectionId: string, database: string, collection: string, filter: string, sort: string, skip: number, limit: number) => Promise<{ success: boolean; documents?: any[]; total?: number; error?: string }>;
    insertDocument: (connectionId: string, database: string, collection: string, document: string) => Promise<{ success: boolean; insertedId?: string; error?: string }>;
    updateDocument: (connectionId: string, database: string, collection: string, id: string, document: string) => Promise<{ success: boolean; error?: string }>;
    deleteDocument: (connectionId: string, database: string, collection: string, id: string) => Promise<{ success: boolean; error?: string }>;
    getIndexes: (connectionId: string, database: string, collection: string) => Promise<{ success: boolean; indexes?: Array<{ name: string; key: Record<string, number> }>; error?: string }>;
    runCommand: (connectionId: string, database: string, command: string) => Promise<{ success: boolean; result?: any; error?: string }>;
    dropCollection: (connectionId: string, database: string, collection: string) => Promise<{ success: boolean; error?: string }>;
    createCollection: (connectionId: string, database: string, collection: string) => Promise<{ success: boolean; error?: string }>;
  };
};

interface MongoConnectionConfig {
  id?: string;
  name: string;
  mode: 'standard' | 'uri';
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  authDB?: string;
  uri?: string;
  tls?: boolean;
}

interface DatabaseInfo {
  name: string;
  collections: string[];
  expanded: boolean;
}

interface TabInfo {
  id: string;
  type: 'welcome' | 'collection' | 'shell';
  title: string;
  connectionId?: string;
  database?: string;
  collection?: string;
}

interface CollectionState {
  filter: string;
  sort: string;
  page: number;
  pageSize: number;
  total: number;
  documents: any[];
}

export class MongoTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'mongo',
    title: 'MongoDB',
    category: ToolCategory.DEVELOPER,
    icon: '🍃',
    description: i18n.t('tool.mongoDesc'),
    keywords: ['mongodb', 'mongo', 'nosql', 'document'],
  };

  readonly config = MongoTool.config;

  private connections: MongoConnectionConfig[] = [];
  private activeConnections: Map<string, string> = new Map();
  private currentConfigId: string | null = null;
  private databases: DatabaseInfo[] = [];
  private tabs: TabInfo[] = [{ id: 'welcome', type: 'welcome', title: i18n.t('mongo.welcome') }];
  private activeTabId = 'welcome';
  private editingConfigId: string | null = null;
  private collectionStates: Map<string, CollectionState> = new Map();
  private editingDocId: string | null = null;
  private editingDocTabId: string | null = null;

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
    this.addEventListener(this.querySelector('#refreshCollectionsBtn'), 'click', () => this.refreshDatabases());
    this.addEventListener(this.querySelector('#collectionSearchInput'), 'input', () => this.filterTree());
    
    // 连接模式切换
    this.addEventListener(this.querySelector('#connMode'), 'change', (e) => {
      const mode = (e.target as HTMLSelectElement).value;
      const standardFields = this.querySelector('#standardConnFields');
      const uriFields = this.querySelector('#uriConnFields');
      if (standardFields && uriFields) {
        standardFields.style.display = mode === 'standard' ? 'block' : 'none';
        uriFields.style.display = mode === 'uri' ? 'block' : 'none';
      }
    });

    // 新增文档弹窗
    this.addEventListener(this.querySelector('#closeAddDocModalBtn'), 'click', () => this.hideAddDocModal());
    this.addEventListener(this.querySelector('#cancelAddDocBtn'), 'click', () => this.hideAddDocModal());
    this.addEventListener(this.querySelector('#confirmAddDocBtn'), 'click', () => this.insertDocument());
    this.addEventListener(this.querySelector('#addDocModal'), 'click', (e) => {
      if ((e.target as HTMLElement).id === 'addDocModal') this.hideAddDocModal();
    });

    // 编辑文档弹窗
    this.addEventListener(this.querySelector('#closeEditDocModalBtn'), 'click', () => this.hideEditDocModal());
    this.addEventListener(this.querySelector('#cancelEditDocBtn'), 'click', () => this.hideEditDocModal());
    this.addEventListener(this.querySelector('#confirmEditDocBtn'), 'click', () => this.saveEditedDocument());
    this.addEventListener(this.querySelector('#editDocModal'), 'click', (e) => {
      if ((e.target as HTMLElement).id === 'editDocModal') this.hideEditDocModal();
    });
  }

  private loadConnections(): void {
    try {
      const saved = localStorage.getItem('mongo_connections');
      if (saved) this.connections = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load MongoDB connections:', e);
    }
  }

  private saveConnections(): void {
    try {
      localStorage.setItem('mongo_connections', JSON.stringify(this.connections));
    } catch (e) {
      console.error('Failed to save MongoDB connections:', e);
    }
  }

  private renderConnectionList(): void {
    const list = this.querySelector('#connectionList');
    if (!list) return;

    if (this.connections.length === 0) {
      list.innerHTML = `<div class="empty-hint">${i18n.t('mongo.noConnections')}</div>`;
      return;
    }

    list.innerHTML = this.connections.map(conn => {
      const isConnected = this.activeConnections.has(conn.id!);
      const isActive = this.currentConfigId === conn.id;
      const detail = conn.mode === 'uri' ? i18n.t('mongo.uriConnection') : `${conn.host}:${conn.port}`;
      return `
        <div class="connection-item ${isConnected ? 'connected' : ''} ${isActive ? 'active' : ''}" data-id="${conn.id}">
          <div class="conn-icon">🍃</div>
          <div class="conn-info">
            <div class="conn-name">${this.escapeHtml(conn.name)}</div>
            <div class="conn-detail">${this.escapeHtml(detail)}</div>
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
        else this.connectToMongo(id);
      });
    });
  }

  private showConnectionModal(config?: MongoConnectionConfig): void {
    const modal = this.querySelector('#connectionModal');
    const title = this.querySelector('#modalTitle');
    if (!modal || !title) return;

    this.editingConfigId = config?.id || null;
    title.textContent = config ? i18n.t('mongo.editConnection') : i18n.t('mongo.addMongoConnection');

    const mode = config?.mode || 'standard';
    (this.querySelector('#connName') as HTMLInputElement).value = config?.name || '';
    (this.querySelector('#connMode') as HTMLSelectElement).value = mode;
    (this.querySelector('#connHost') as HTMLInputElement).value = config?.host || 'localhost';
    (this.querySelector('#connPort') as HTMLInputElement).value = String(config?.port || 27017);
    (this.querySelector('#connUser') as HTMLInputElement).value = config?.user || '';
    (this.querySelector('#connPassword') as HTMLInputElement).value = config?.password || '';
    (this.querySelector('#connAuthDB') as HTMLInputElement).value = config?.authDB || 'admin';
    (this.querySelector('#connUri') as HTMLTextAreaElement).value = config?.uri || '';
    (this.querySelector('#connTLS') as HTMLInputElement).checked = config?.tls || false;

    const standardFields = this.querySelector('#standardConnFields');
    const uriFields = this.querySelector('#uriConnFields');
    if (standardFields && uriFields) {
      standardFields.style.display = mode === 'standard' ? 'block' : 'none';
      uriFields.style.display = mode === 'uri' ? 'block' : 'none';
    }

    modal.style.display = 'flex';
  }

  private hideConnectionModal(): void {
    const modal = this.querySelector('#connectionModal');
    if (modal) modal.style.display = 'none';
    this.editingConfigId = null;
  }

  private getFormConfig(): MongoConnectionConfig {
    const mode = (this.querySelector('#connMode') as HTMLSelectElement).value as 'standard' | 'uri';
    return {
      id: this.editingConfigId || `mongo_${Date.now()}`,
      name: (this.querySelector('#connName') as HTMLInputElement).value.trim(),
      mode,
      host: (this.querySelector('#connHost') as HTMLInputElement).value.trim() || 'localhost',
      port: parseInt((this.querySelector('#connPort') as HTMLInputElement).value) || 27017,
      user: (this.querySelector('#connUser') as HTMLInputElement).value.trim() || undefined,
      password: (this.querySelector('#connPassword') as HTMLInputElement).value || undefined,
      authDB: (this.querySelector('#connAuthDB') as HTMLInputElement).value.trim() || 'admin',
      uri: (this.querySelector('#connUri') as HTMLTextAreaElement).value.trim() || undefined,
      tls: (this.querySelector('#connTLS') as HTMLInputElement).checked,
    };
  }

  private async testConnection(): Promise<void> {
    const config = this.getFormConfig();
    if (!config.name) { toast(i18n.t('mongo.enterConnName')); return; }

    const statusEl = this.querySelector('#connTestStatus');
    const testBtn = this.querySelector('#testConnBtn') as HTMLButtonElement;
    
    if (statusEl) {
      statusEl.textContent = i18n.t('mongo.testing');
      statusEl.style.color = '#f59e0b';
    }
    if (testBtn) testBtn.disabled = true;
    
    try {
      const result = await llmHub.mongo.testConnection(config);
      if (result.success) { 
        if (statusEl) {
          statusEl.textContent = i18n.t('mongo.testSuccess');
          statusEl.style.color = '#22c55e';
        }
        toast(i18n.t('mongo.connectionSuccess')); 
      } else { 
        if (statusEl) {
          statusEl.textContent = `❌ ${result.error}`;
          statusEl.style.color = '#ef4444';
        }
        toast(`${i18n.t('mongo.connectionFailed')}: ${result.error}`); 
      }
    } catch (e) { 
      if (statusEl) {
        statusEl.textContent = `❌ ${e}`;
        statusEl.style.color = '#ef4444';
      }
      toast(`${i18n.t('mongo.connectionFailed')}: ${e}`); 
    } finally {
      if (testBtn) testBtn.disabled = false;
    }
  }

  private saveConnection(): void {
    const config = this.getFormConfig();
    if (!config.name) { toast(i18n.t('mongo.enterConnName')); return; }

    if (this.editingConfigId) {
      const index = this.connections.findIndex(c => c.id === this.editingConfigId);
      if (index !== -1) this.connections[index] = config;
    } else {
      this.connections.push(config);
    }

    this.saveConnections();
    this.renderConnectionList();
    this.hideConnectionModal();
    toast(i18n.t('mongo.configSaved'));
  }

  private editConnection(id: string): void {
    const config = this.connections.find(c => c.id === id);
    if (config) this.showConnectionModal(config);
  }

  private deleteConnection(id: string): void {
    if (!confirm(i18n.t('mongo.confirmDelete'))) return;

    if (this.activeConnections.has(id)) {
      const connectionId = this.activeConnections.get(id)!;
      llmHub.mongo.disconnect(connectionId).catch(console.error);
      this.activeConnections.delete(id);
    }

    this.connections = this.connections.filter(c => c.id !== id);
    this.saveConnections();
    this.renderConnectionList();

    if (this.currentConfigId === id) {
      this.currentConfigId = null;
      const collectionsPanel = this.querySelector('#collectionsPanel');
      if (collectionsPanel) collectionsPanel.style.display = 'none';
      this.setStatus(i18n.t('mongo.notConnected'));
    }

    toast(i18n.t('mongo.configDeleted'));
  }

  private async connectToMongo(configId: string): Promise<void> {
    const config = this.connections.find(c => c.id === configId);
    if (!config) return;

    this.currentConfigId = configId;
    this.renderConnectionList();

    if (this.activeConnections.has(configId)) {
      await this.loadDatabases();
      return;
    }

    this.setStatus(`${i18n.t('mongo.connecting')} ${config.name}...`, 'loading');

    try {
      const result = await llmHub.mongo.connect(config);
      if (result.success && result.connectionId) {
        this.activeConnections.set(configId, result.connectionId);
        this.renderConnectionList();
        await this.loadDatabases();
        this.setStatus(`${i18n.t('mongo.connected')}: ${config.name}`, 'connected');
        toast(`${i18n.t('mongo.connectedTo')} ${config.name}`);
      } else {
        toast(`${i18n.t('mongo.connectionFailed')}: ${result.error}`);
        this.setStatus(i18n.t('mongo.connectionFailed'), 'error');
      }
    } catch (e) {
      toast(`${i18n.t('mongo.connectionFailed')}: ${e}`);
      this.setStatus(i18n.t('mongo.connectionFailed'), 'error');
    }
  }

  private async loadDatabases(): Promise<void> {
    if (!this.currentConfigId) return;
    const connectionId = this.activeConnections.get(this.currentConfigId);
    if (!connectionId) return;

    const collectionsPanel = this.querySelector('#collectionsPanel');
    const treeContainer = this.querySelector('#treeContainer');
    if (!collectionsPanel || !treeContainer) return;

    collectionsPanel.style.display = 'flex';
    treeContainer.innerHTML = '<div class="empty-hint">Loading...</div>';

    try {
      const result = await llmHub.mongo.listDatabases(connectionId);
      if (result.success && result.databases) {
        this.databases = result.databases.map(name => ({
          name,
          collections: [],
          expanded: false,
        }));
        this.renderTree();
      } else {
        treeContainer.innerHTML = `<div class="empty-hint">Load failed: ${result.error}</div>`;
      }
    } catch (e) {
      treeContainer.innerHTML = `<div class="empty-hint">Load failed: ${e}</div>`;
    }
  }

  private renderTree(): void {
    const treeContainer = this.querySelector('#treeContainer');
    if (!treeContainer) return;

    const searchText = (this.querySelector('#collectionSearchInput') as HTMLInputElement)?.value.toLowerCase() || '';

    if (this.databases.length === 0) {
      treeContainer.innerHTML = '<div class="empty-hint">No databases</div>';
      return;
    }

    const filteredDatabases = this.databases.filter(db => {
      if (!searchText) return true;
      if (db.name.toLowerCase().includes(searchText)) return true;
      return db.collections.some(c => c.toLowerCase().includes(searchText));
    });

    treeContainer.innerHTML = filteredDatabases.map(db => {
      const filteredCollections = searchText 
        ? db.collections.filter(c => c.toLowerCase().includes(searchText) || db.name.toLowerCase().includes(searchText))
        : db.collections;

      return `
        <div class="tree-item" data-database="${this.escapeHtml(db.name)}">
          <div class="tree-node database-node">
            <span class="tree-toggle ${db.expanded ? 'expanded' : ''}">▶</span>
            <span class="tree-icon database">🗄️</span>
            <span class="tree-label">${this.escapeHtml(db.name)}</span>
            ${db.collections.length > 0 ? `<span class="tree-count">${db.collections.length}</span>` : ''}
          </div>
          <div class="tree-children ${db.expanded ? 'expanded' : ''}">
            ${filteredCollections.map(col => `
              <div class="tree-item" data-collection="${this.escapeHtml(col)}">
                <div class="tree-node collection-node">
                  <span class="tree-toggle" style="visibility: hidden;">▶</span>
                  <span class="tree-icon collection">📄</span>
                  <span class="tree-label">${this.escapeHtml(col)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    // 绑定事件
    treeContainer.querySelectorAll('.database-node').forEach(node => {
      node.addEventListener('click', async (e) => {
        const item = (node as HTMLElement).closest('.tree-item') as HTMLElement;
        const dbName = item.dataset.database!;
        const db = this.databases.find(d => d.name === dbName);
        if (!db) return;

        // 切换展开状态
        db.expanded = !db.expanded;

        // 如果展开且没有加载过集合，则加载
        if (db.expanded && db.collections.length === 0) {
          await this.loadCollections(dbName);
        }

        this.renderTree();
      });
    });

    treeContainer.querySelectorAll('.collection-node').forEach(node => {
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        const collectionItem = (node as HTMLElement).closest('.tree-item[data-collection]') as HTMLElement;
        const databaseItem = collectionItem.closest('.tree-item[data-database]') as HTMLElement;
        const collection = collectionItem.dataset.collection!;
        const database = databaseItem.dataset.database!;
        this.openCollectionTab(database, collection);
      });
    });
  }

  private async loadCollections(database: string): Promise<void> {
    if (!this.currentConfigId) return;
    const connectionId = this.activeConnections.get(this.currentConfigId);
    if (!connectionId) return;

    try {
      const result = await llmHub.mongo.listCollections(connectionId, database);
      if (result.success && result.collections) {
        const db = this.databases.find(d => d.name === database);
        if (db) {
          db.collections = result.collections;
        }
      }
    } catch (e) {
      console.error('Failed to load collections:', e);
    }
  }

  private filterTree(): void {
    this.renderTree();
  }

  private refreshDatabases(): void {
    this.databases = [];
    this.loadDatabases();
  }

  private openCollectionTab(database: string, collection: string): void {
    if (!this.currentConfigId) return;
    const tabId = `col_${this.currentConfigId}_${database}_${collection}`;
    const existingTab = this.tabs.find(t => t.id === tabId);
    if (existingTab) { this.switchTab(tabId); return; }

    const tab: TabInfo = {
      id: tabId,
      type: 'collection',
      title: `${database}.${collection}`.length > 25 ? `...${collection}` : `${database}.${collection}`,
      connectionId: this.currentConfigId,
      database,
      collection,
    };
    this.tabs.push(tab);
    this.renderTabs();
    this.createCollectionPanel(tab);
    this.switchTab(tabId);
  }

  private openShellTab(): void {
    if (!this.currentConfigId) return;
    const config = this.connections.find(c => c.id === this.currentConfigId);
    const tabId = `shell_${this.currentConfigId}`;
    const existingTab = this.tabs.find(t => t.id === tabId);
    if (existingTab) { this.switchTab(tabId); return; }

    const tab: TabInfo = { id: tabId, type: 'shell', title: `Shell - ${config?.name || 'MongoDB'}`, connectionId: this.currentConfigId };
    this.tabs.push(tab);
    this.renderTabs();
    this.createShellPanel(tab);
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
    this.collectionStates.delete(tabId);
    this.renderTabs();

    if (this.activeTabId === tabId) {
      const newActiveTab = this.tabs[Math.max(0, index - 1)];
      if (newActiveTab) this.switchTab(newActiveTab.id);
    }
  }

  private async createCollectionPanel(tab: TabInfo): Promise<void> {
    const panels = this.querySelector('.content-panels');
    if (!panels || !tab.connectionId || !tab.database || !tab.collection) return;

    const connectionId = this.activeConnections.get(tab.connectionId);
    if (!connectionId) return;

    const panel = document.createElement('div');
    panel.className = 'content-panel';
    panel.dataset.panel = tab.id;
    panel.innerHTML = `<div class="empty-hint">${i18n.t('common.loading')}</div>`;
    panels.appendChild(panel);

    // 初始化状态
    this.collectionStates.set(tab.id, {
      filter: '{}',
      sort: '{}',
      page: 1,
      pageSize: 20,
      total: 0,
      documents: [],
    });

    // 加载统计信息
    let statsText = '';
    try {
      const statsRes = await llmHub.mongo.getCollectionStats(connectionId, tab.database, tab.collection);
      if (statsRes.success && statsRes.stats) {
        const { count, size } = statsRes.stats;
        statsText = `${count} docs · ${this.formatSize(size)}`;
      }
    } catch (e) {
      console.error('Failed to get stats:', e);
    }

    panel.innerHTML = `
      <div class="collection-panel">
        <div class="collection-header">
          <div class="collection-info">
            <div class="collection-name">${this.escapeHtml(tab.database)}.${this.escapeHtml(tab.collection)}</div>
            <div class="collection-meta">${statsText}</div>
          </div>
          <div class="collection-actions">
            <button class="collection-action-btn secondary shell-btn">Shell</button>
            <button class="collection-action-btn secondary indexes-btn">Indexes</button>
            <button class="collection-action-btn primary add-doc-btn">+ ${i18n.t('mongo.newDocument')}</button>
          </div>
        </div>
        <div class="query-section">
          <div class="query-row">
            <span class="query-label">Filter:</span>
            <input type="text" class="query-input filter-input" placeholder='{"field": "value"}' value="{}">
            <button class="query-btn execute-query-btn">${i18n.t('mongo.query')}</button>
          </div>
          <div class="query-row">
            <span class="query-label">Sort:</span>
            <input type="text" class="query-input sort-input" placeholder='{"_id": -1}' value="{}">
          </div>
        </div>
        <div class="documents-section"></div>
        <div class="pagination">
          <button class="pagination-btn prev-btn" disabled>Prev</button>
          <span class="pagination-info">Page 1</span>
          <button class="pagination-btn next-btn" disabled>Next</button>
        </div>
      </div>
    `;

    this.bindCollectionPanelEvents(panel, tab, connectionId);
    await this.loadDocuments(tab.id);
  }

  private bindCollectionPanelEvents(panel: HTMLElement, tab: TabInfo, connectionId: string): void {
    panel.querySelector('.shell-btn')?.addEventListener('click', () => this.openShellTab());
    
    panel.querySelector('.indexes-btn')?.addEventListener('click', async () => {
      const result = await llmHub.mongo.getIndexes(connectionId, tab.database!, tab.collection!);
      if (result.success && result.indexes) {
        const indexInfo = result.indexes.map(idx => `${idx.name}: ${JSON.stringify(idx.key)}`).join('\n');
        alert(`Indexes:\n\n${indexInfo || 'No indexes'}`);
      } else {
        toast(`Get indexes failed: ${result.error}`);
      }
    });

    panel.querySelector('.add-doc-btn')?.addEventListener('click', () => {
      this.editingDocTabId = tab.id;
      this.showAddDocModal();
    });

    panel.querySelector('.execute-query-btn')?.addEventListener('click', () => {
      const state = this.collectionStates.get(tab.id);
      if (state) {
        state.filter = (panel.querySelector('.filter-input') as HTMLInputElement).value;
        state.sort = (panel.querySelector('.sort-input') as HTMLInputElement).value;
        state.page = 1;
        this.loadDocuments(tab.id);
      }
    });

    panel.querySelector('.filter-input')?.addEventListener('keypress', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        panel.querySelector('.execute-query-btn')?.dispatchEvent(new Event('click'));
      }
    });

    panel.querySelector('.prev-btn')?.addEventListener('click', () => {
      const state = this.collectionStates.get(tab.id);
      if (state && state.page > 1) {
        state.page--;
        this.loadDocuments(tab.id);
      }
    });

    panel.querySelector('.next-btn')?.addEventListener('click', () => {
      const state = this.collectionStates.get(tab.id);
      if (state && state.page * state.pageSize < state.total) {
        state.page++;
        this.loadDocuments(tab.id);
      }
    });
  }

  private async loadDocuments(tabId: string): Promise<void> {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab || !tab.connectionId || !tab.database || !tab.collection) return;

    const connectionId = this.activeConnections.get(tab.connectionId);
    if (!connectionId) return;

    const state = this.collectionStates.get(tabId);
    if (!state) return;

    const panel = this.querySelector(`.content-panel[data-panel="${tabId}"]`);
    if (!panel) return;

    const documentsSection = panel.querySelector('.documents-section');
    if (!documentsSection) return;

    documentsSection.innerHTML = '<div class="empty-hint">Loading...</div>';

    try {
      const skip = (state.page - 1) * state.pageSize;
      const result = await llmHub.mongo.findDocuments(
        connectionId, tab.database, tab.collection,
        state.filter, state.sort, skip, state.pageSize
      );

      if (result.success) {
        state.documents = result.documents || [];
        state.total = result.total || 0;
        this.renderDocuments(tabId);
      } else {
        documentsSection.innerHTML = `<div class="empty-hint">Query failed: ${result.error}</div>`;
      }
    } catch (e) {
      documentsSection.innerHTML = `<div class="empty-hint">Query failed: ${e}</div>`;
    }
  }

  private renderDocuments(tabId: string): void {
    const state = this.collectionStates.get(tabId);
    if (!state) return;

    const panel = this.querySelector(`.content-panel[data-panel="${tabId}"]`);
    if (!panel) return;

    const documentsSection = panel.querySelector('.documents-section');
    if (!documentsSection) return;

    if (state.documents.length === 0) {
      documentsSection.innerHTML = '<div class="empty-hint">No documents</div>';
    } else {
      documentsSection.innerHTML = state.documents.map(doc => {
        const id = doc._id?.$oid || doc._id || 'unknown';
        return `
          <div class="document-card" data-id="${this.escapeHtml(String(id))}">
            <div class="document-header">
              <span class="document-id">_id: ${this.escapeHtml(String(id))}</span>
              <div class="document-actions">
                <button class="doc-action-btn edit-doc-btn">Edit</button>
                <button class="doc-action-btn delete delete-doc-btn">Delete</button>
              </div>
            </div>
            <div class="document-body">
              <div class="document-json">${this.formatJson(doc)}</div>
            </div>
          </div>
        `;
      }).join('');

      documentsSection.querySelectorAll('.document-card').forEach(card => {
        const docId = (card as HTMLElement).dataset.id!;
        const doc = state.documents.find(d => {
          const id = d._id?.$oid || d._id;
          return String(id) === docId;
        });

        card.querySelector('.edit-doc-btn')?.addEventListener('click', () => {
          if (doc) {
            this.editingDocId = docId;
            this.editingDocTabId = tabId;
            this.showEditDocModal(doc);
          }
        });

        card.querySelector('.delete-doc-btn')?.addEventListener('click', async () => {
          if (!confirm('Are you sure you want to delete this document?')) return;
          await this.deleteDocument(tabId, docId);
        });
      });
    }

    const paginationInfo = panel.querySelector('.pagination-info');
    const prevBtn = panel.querySelector('.prev-btn') as HTMLButtonElement;
    const nextBtn = panel.querySelector('.next-btn') as HTMLButtonElement;

    if (paginationInfo) {
      const totalPages = Math.ceil(state.total / state.pageSize) || 1;
      paginationInfo.textContent = `Page ${state.page} / ${totalPages} (${state.total} total)`;
    }
    if (prevBtn) prevBtn.disabled = state.page <= 1;
    if (nextBtn) nextBtn.disabled = state.page * state.pageSize >= state.total;
  }

  private showAddDocModal(): void {
    const modal = this.querySelector('#addDocModal');
    const textarea = this.querySelector('#newDocContent') as HTMLTextAreaElement;
    if (modal && textarea) {
      textarea.value = '{\n  \n}';
      modal.style.display = 'flex';
    }
  }

  private hideAddDocModal(): void {
    const modal = this.querySelector('#addDocModal');
    if (modal) modal.style.display = 'none';
    this.editingDocTabId = null;
  }

  private async insertDocument(): Promise<void> {
    if (!this.editingDocTabId) return;

    const tab = this.tabs.find(t => t.id === this.editingDocTabId);
    if (!tab || !tab.connectionId || !tab.database || !tab.collection) return;

    const connectionId = this.activeConnections.get(tab.connectionId);
    if (!connectionId) return;

    const content = (this.querySelector('#newDocContent') as HTMLTextAreaElement).value;

    try {
      JSON.parse(content); // 验证 JSON
    } catch (e) {
      toast(i18n.t('mongo.invalidJson'));
      return;
    }

    try {
      const result = await llmHub.mongo.insertDocument(connectionId, tab.database, tab.collection, content);
      if (result.success) {
        toast('Document inserted');
        this.hideAddDocModal();
        await this.loadDocuments(this.editingDocTabId);
      } else {
        toast(`Insert failed: ${result.error}`);
      }
    } catch (e) {
      toast(`Insert failed: ${e}`);
    }
  }

  private showEditDocModal(doc: any): void {
    const modal = this.querySelector('#editDocModal');
    const textarea = this.querySelector('#editDocContent') as HTMLTextAreaElement;
    if (modal && textarea) {
      textarea.value = JSON.stringify(doc, null, 2);
      modal.style.display = 'flex';
    }
  }

  private hideEditDocModal(): void {
    const modal = this.querySelector('#editDocModal');
    if (modal) modal.style.display = 'none';
    this.editingDocId = null;
    this.editingDocTabId = null;
  }

  private async saveEditedDocument(): Promise<void> {
    if (!this.editingDocId || !this.editingDocTabId) return;

    const tab = this.tabs.find(t => t.id === this.editingDocTabId);
    if (!tab || !tab.connectionId || !tab.database || !tab.collection) return;

    const connectionId = this.activeConnections.get(tab.connectionId);
    if (!connectionId) return;

    const content = (this.querySelector('#editDocContent') as HTMLTextAreaElement).value;

    try {
      JSON.parse(content);
    } catch (e) {
      toast('Invalid JSON format');
      return;
    }

    try {
      const result = await llmHub.mongo.updateDocument(connectionId, tab.database, tab.collection, this.editingDocId, content);
      if (result.success) {
        toast('Document updated');
        this.hideEditDocModal();
        await this.loadDocuments(this.editingDocTabId);
      } else {
        toast(`Update failed: ${result.error}`);
      }
    } catch (e) {
      toast(`Update failed: ${e}`);
    }
  }

  private async deleteDocument(tabId: string, docId: string): Promise<void> {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab || !tab.connectionId || !tab.database || !tab.collection) return;

    const connectionId = this.activeConnections.get(tab.connectionId);
    if (!connectionId) return;

    try {
      const result = await llmHub.mongo.deleteDocument(connectionId, tab.database, tab.collection, docId);
      if (result.success) {
        toast('Document deleted');
        await this.loadDocuments(tabId);
      } else {
        toast(`Delete failed: ${result.error}`);
      }
    } catch (e) {
      toast(`Delete failed: ${e}`);
    }
  }

  private createShellPanel(tab: TabInfo): void {
    const panels = this.querySelector('.content-panels');
    if (!panels || !tab.connectionId) return;

    const connectionId = this.activeConnections.get(tab.connectionId);
    if (!connectionId) return;

    const panel = document.createElement('div');
    panel.className = 'content-panel';
    panel.dataset.panel = tab.id;
    panel.innerHTML = `
      <div class="shell-panel">
        <div class="shell-output"><div class="shell-line info">Enter MongoDB command (JSON format), press Enter to execute</div></div>
        <div class="shell-input-wrap">
          <input type="text" class="shell-input" placeholder='db.runCommand({ping: 1})'>
          <button class="shell-run-btn">${i18n.t('mongo.execute')}</button>
        </div>
      </div>
    `;
    panels.appendChild(panel);

    const output = panel.querySelector('.shell-output')!;
    const input = panel.querySelector('.shell-input') as HTMLInputElement;
    const runBtn = panel.querySelector('.shell-run-btn')!;
    const history: string[] = [];
    let historyIndex = -1;
    let currentDb = 'admin';

    const executeCommand = async () => {
      const command = input.value.trim();
      if (!command) return;

      history.unshift(command);
      historyIndex = -1;
      input.value = '';

      output.innerHTML += `<div class="shell-line command">${this.escapeHtml(command)}</div>`;

      // 解析 use 命令
      const useMatch = command.match(/^use\s+(\w+)$/i);
      if (useMatch) {
        currentDb = useMatch[1];
        output.innerHTML += `<div class="shell-line result">switched to db ${currentDb}</div>`;
        output.scrollTop = output.scrollHeight;
        return;
      }

      try {
        const result = await llmHub.mongo.runCommand(connectionId, currentDb, command);
        if (result.success) {
          const resultStr = JSON.stringify(result.result, null, 2);
          output.innerHTML += `<div class="shell-line result">${this.escapeHtml(resultStr)}</div>`;
        } else {
          output.innerHTML += `<div class="shell-line error">${this.escapeHtml(result.error || 'Error')}</div>`;
        }
      } catch (e) {
        output.innerHTML += `<div class="shell-line error">${this.escapeHtml(String(e))}</div>`;
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

  private formatJson(obj: any): string {
    const json = JSON.stringify(obj, null, 2);
    return json
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/: (null)/g, ': <span class="json-null">$1</span>');
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
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
