/**
 * 数据库管理工具 - 支持 MySQL、PostgreSQL、SQLite
 */

import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { getTemplate } from './template';
import { toast } from '../../components/Toast';
import { i18n } from '../../core/i18n';
import type { DBConnectionConfig, TableColumn } from '../../types';

interface TabInfo {
  id: string;
  type: 'welcome' | 'query' | 'table' | 'structure';
  title: string;
  connectionId?: string;
  database?: string;
  table?: string;
}

export class DatabaseTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'database',
    title: i18n.t('tool.database'),
    category: ToolCategory.DEVELOPER,
    icon: '🗄️',
    description: i18n.t('tool.databaseDesc'),
    keywords: ['database', 'mysql', 'postgresql', 'sqlite', 'sql', 'query'],
  };

  readonly config = DatabaseTool.config;

  private connections: DBConnectionConfig[] = [];
  private activeConnections: Map<string, string> = new Map(); // configId -> connectionId
  private tabs: TabInfo[] = [{ id: 'welcome', type: 'welcome', title: i18n.t('db.welcome') }];
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
    // 添加连接按钮
    this.addEventListener(this.querySelector('#addConnectionBtn'), 'click', () => this.showConnectionModal());
    this.addEventListener(this.querySelector('#welcomeAddBtn'), 'click', () => this.showConnectionModal());
    
    // 弹窗事件
    this.addEventListener(this.querySelector('#closeModalBtn'), 'click', () => this.hideConnectionModal());
    this.addEventListener(this.querySelector('#testConnBtn'), 'click', () => this.testConnection());
    this.addEventListener(this.querySelector('#saveConnBtn'), 'click', () => this.saveConnection());
    
    // 数据库类型切换
    this.addEventListener(this.querySelector('#connType'), 'change', (e) => {
      const type = (e.target as HTMLSelectElement).value;
      this.toggleConnectionFields(type as 'mysql' | 'postgresql' | 'sqlite');
    });
    
    // 刷新树
    this.addEventListener(this.querySelector('#refreshTreeBtn'), 'click', () => this.refreshTree());
    
    // 点击弹窗外部关闭
    this.addEventListener(this.querySelector('#connectionModal'), 'click', (e) => {
      if ((e.target as HTMLElement).id === 'connectionModal') {
        this.hideConnectionModal();
      }
    });
  }

  // ==================== 连接管理 ====================

  private loadConnections(): void {
    try {
      const saved = localStorage.getItem('db_connections');
      if (saved) {
        this.connections = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load connections:', e);
    }
  }

  private saveConnections(): void {
    try {
      localStorage.setItem('db_connections', JSON.stringify(this.connections));
    } catch (e) {
      console.error('Failed to save connections:', e);
    }
  }

  private renderConnectionList(): void {
    const list = this.querySelector('#connectionList');
    if (!list) return;

    if (this.connections.length === 0) {
      list.innerHTML = `<div class="empty-hint">${i18n.t('db.noConnections')}</div>`;
      return;
    }

    list.innerHTML = this.connections.map(conn => {
      const isConnected = this.activeConnections.has(conn.id!);
      const typeIcon = conn.type === 'mysql' ? '🐬' : conn.type === 'postgresql' ? '🐘' : '📁';
      const detail = conn.type === 'sqlite' ? conn.sqlitePath : `${conn.host}:${conn.port}`;
      
      return `
        <div class="connection-item ${isConnected ? 'connected' : ''}" data-id="${conn.id}">
          <div class="conn-icon">${typeIcon}</div>
          <div class="conn-info">
            <div class="conn-name">${this.escapeHtml(conn.name)}</div>
            <div class="conn-detail">${this.escapeHtml(detail || '')}</div>
          </div>
          <div class="conn-actions">
            <button class="conn-action-btn edit" data-action="edit" title="${i18n.t('common.edit')}">✏️</button>
            <button class="conn-action-btn delete" data-action="delete" title="${i18n.t('common.delete')}">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    // 绑定连接项事件
    list.querySelectorAll('.connection-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const action = target.dataset.action;
        const id = (item as HTMLElement).dataset.id!;
        
        if (action === 'edit') {
          e.stopPropagation();
          this.editConnection(id);
        } else if (action === 'delete') {
          e.stopPropagation();
          this.deleteConnection(id);
        } else {
          this.connectToDatabase(id);
        }
      });
    });
  }

  private showConnectionModal(config?: DBConnectionConfig): void {
    const modal = this.querySelector('#connectionModal');
    const title = this.querySelector('#modalTitle');
    if (!modal || !title) return;

    this.editingConfigId = config?.id || null;
    title.textContent = config ? i18n.t('db.editConnection') : i18n.t('db.addDbConnection');

    // 填充表单
    (this.querySelector('#connName') as HTMLInputElement).value = config?.name || '';
    (this.querySelector('#connType') as HTMLSelectElement).value = config?.type || 'mysql';
    (this.querySelector('#connHost') as HTMLInputElement).value = config?.host || 'localhost';
    (this.querySelector('#connPort') as HTMLInputElement).value = String(config?.port || 3306);
    (this.querySelector('#connUser') as HTMLInputElement).value = config?.user || 'root';
    (this.querySelector('#connPassword') as HTMLInputElement).value = config?.password || '';
    (this.querySelector('#connDatabase') as HTMLInputElement).value = config?.database || '';
    (this.querySelector('#connSqlitePath') as HTMLInputElement).value = config?.sqlitePath || '';

    this.toggleConnectionFields(config?.type || 'mysql');
    modal.style.display = 'flex';
  }

  private hideConnectionModal(): void {
    const modal = this.querySelector('#connectionModal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.editingConfigId = null;
  }

  private toggleConnectionFields(type: 'mysql' | 'postgresql' | 'sqlite'): void {
    const isSqlite = type === 'sqlite';
    const hostGroup = this.querySelector('#hostGroup');
    const portGroup = this.querySelector('#portGroup');
    const userGroup = this.querySelector('#userGroup');
    const passwordGroup = this.querySelector('#passwordGroup');
    const databaseGroup = this.querySelector('#databaseGroup');
    const sqlitePathGroup = this.querySelector('#sqlitePathGroup');

    if (hostGroup) hostGroup.style.display = isSqlite ? 'none' : 'block';
    if (portGroup) portGroup.style.display = isSqlite ? 'none' : 'block';
    if (userGroup) userGroup.style.display = isSqlite ? 'none' : 'block';
    if (passwordGroup) passwordGroup.style.display = isSqlite ? 'none' : 'block';
    if (databaseGroup) databaseGroup.style.display = isSqlite ? 'none' : 'block';
    if (sqlitePathGroup) sqlitePathGroup.style.display = isSqlite ? 'block' : 'none';

    // 更新默认端口
    if (!isSqlite) {
      const portInput = this.querySelector('#connPort') as HTMLInputElement;
      if (portInput && !portInput.value) {
        portInput.value = type === 'mysql' ? '3306' : '5432';
      }
    }
  }

  private getFormConfig(): DBConnectionConfig {
    const type = (this.querySelector('#connType') as HTMLSelectElement).value as 'mysql' | 'postgresql' | 'sqlite';
    
    return {
      id: this.editingConfigId || `conn_${Date.now()}`,
      name: (this.querySelector('#connName') as HTMLInputElement).value.trim(),
      type,
      host: type !== 'sqlite' ? (this.querySelector('#connHost') as HTMLInputElement).value.trim() : undefined,
      port: type !== 'sqlite' ? parseInt((this.querySelector('#connPort') as HTMLInputElement).value) || 3306 : undefined,
      user: type !== 'sqlite' ? (this.querySelector('#connUser') as HTMLInputElement).value.trim() : undefined,
      password: type !== 'sqlite' ? (this.querySelector('#connPassword') as HTMLInputElement).value : undefined,
      database: type !== 'sqlite' ? (this.querySelector('#connDatabase') as HTMLInputElement).value.trim() : undefined,
      sqlitePath: type === 'sqlite' ? (this.querySelector('#connSqlitePath') as HTMLInputElement).value.trim() : undefined,
    };
  }

  private async testConnection(): Promise<void> {
    const config = this.getFormConfig();
    
    if (!config.name) {
      toast(i18n.t('db.enterConnName'));
      return;
    }

    if (config.type === 'sqlite' && !config.sqlitePath) {
      toast(i18n.t('db.sqlitePath'));
      return;
    }

    if (config.type !== 'sqlite' && !config.host) {
      toast(i18n.t('db.host'));
      return;
    }

    const statusEl = this.querySelector('#connTestStatus');
    const testBtn = this.querySelector('#testConnBtn') as HTMLButtonElement;
    
    if (statusEl) {
      statusEl.textContent = i18n.t('db.testing');
      statusEl.style.color = '#f59e0b';
    }
    if (testBtn) testBtn.disabled = true;

    try {
      const result = await llmHub.db.testConnection(config);
      if (result.success) {
        if (statusEl) {
          statusEl.textContent = i18n.t('db.testSuccess');
          statusEl.style.color = '#22c55e';
        }
        toast(i18n.t('db.connectionSuccess'));
      } else {
        if (statusEl) {
          statusEl.textContent = `❌ ${result.error}`;
          statusEl.style.color = '#ef4444';
        }
        toast(`${i18n.t('db.connectionFailed')}: ${result.error}`);
      }
    } catch (e) {
      if (statusEl) {
        statusEl.textContent = `❌ ${e}`;
        statusEl.style.color = '#ef4444';
      }
      toast(`${i18n.t('db.connectionFailed')}: ${e}`);
    } finally {
      if (testBtn) testBtn.disabled = false;
    }
  }

  private saveConnection(): void {
    const config = this.getFormConfig();
    
    if (!config.name) {
      toast(i18n.t('db.enterConnName'));
      return;
    }

    if (config.type === 'sqlite' && !config.sqlitePath) {
      toast(i18n.t('db.sqlitePath'));
      return;
    }

    if (config.type !== 'sqlite' && !config.host) {
      toast(i18n.t('db.host'));
      return;
    }

    if (this.editingConfigId) {
      const index = this.connections.findIndex(c => c.id === this.editingConfigId);
      if (index !== -1) {
        this.connections[index] = config;
      }
    } else {
      this.connections.push(config);
    }

    this.saveConnections();
    this.renderConnectionList();
    this.hideConnectionModal();
    toast(i18n.t('db.configSaved'));
  }

  private editConnection(id: string): void {
    const config = this.connections.find(c => c.id === id);
    if (config) {
      this.showConnectionModal(config);
    }
  }

  private deleteConnection(id: string): void {
    if (!confirm(i18n.t('db.confirmDelete'))) {
      return;
    }

    if (this.activeConnections.has(id)) {
      const connectionId = this.activeConnections.get(id)!;
      llmHub.db.disconnect(connectionId).catch(console.error);
      this.activeConnections.delete(id);
    }

    this.connections = this.connections.filter(c => c.id !== id);
    this.saveConnections();
    this.renderConnectionList();
    
    const treePanel = this.querySelector('#treePanel');
    if (treePanel) {
      treePanel.style.display = 'none';
    }
    this.setStatus(i18n.t('db.notConnected'));
    
    toast(i18n.t('db.configDeleted'));
  }

  // ==================== 数据库连接和浏览 ====================

  private async connectToDatabase(configId: string): Promise<void> {
    const config = this.connections.find(c => c.id === configId);
    if (!config) return;

    // 高亮选中项
    this.querySelectorAll('.connection-item').forEach(item => {
      item.classList.remove('active');
      if ((item as HTMLElement).dataset.id === configId) {
        item.classList.add('active');
      }
    });

    // 如果已连接，直接显示数据库列表
    if (this.activeConnections.has(configId)) {
      await this.loadDatabases(configId);
      return;
    }

    this.setStatus(`${i18n.t('db.connecting')} ${config.name}...`, 'loading');

    try {
      const result = await llmHub.db.connect(config);
      if (result.success && result.connectionId) {
        this.activeConnections.set(configId, result.connectionId);
        this.renderConnectionList();
        await this.loadDatabases(configId);
        this.setStatus(`${i18n.t('db.connected')}: ${config.name}`, 'connected');
        toast(`${i18n.t('db.connectedTo')} ${config.name}`);
      } else {
        toast(`${i18n.t('db.connectionFailed')}: ${result.error}`);
        this.setStatus(i18n.t('db.connectionFailed'), 'error');
      }
    } catch (e) {
      toast(`${i18n.t('db.connectionFailed')}: ${e}`);
      this.setStatus(i18n.t('db.connectionFailed'), 'error');
    }
  }

  private async loadDatabases(configId: string): Promise<void> {
    const connectionId = this.activeConnections.get(configId);
    if (!connectionId) return;

    const treePanel = this.querySelector('#treePanel');
    const treeContainer = this.querySelector('#treeContainer');
    const treePanelTitle = this.querySelector('#treePanelTitle');
    
    if (!treePanel || !treeContainer || !treePanelTitle) return;

    treePanel.style.display = 'flex';
    treePanelTitle.textContent = i18n.t('db.database');
    treeContainer.innerHTML = '<div class="empty-hint">Loading...</div>';

    try {
      const result = await llmHub.db.getDatabases(connectionId);
      if (result.success && result.databases) {
        this.renderDatabaseTree(configId, result.databases);
      } else {
        treeContainer.innerHTML = `<div class="empty-hint">Load failed: ${result.error}</div>`;
      }
    } catch (e) {
      treeContainer.innerHTML = `<div class="empty-hint">Load failed: ${e}</div>`;
    }
  }

  private renderDatabaseTree(configId: string, databases: string[]): void {
    const treeContainer = this.querySelector('#treeContainer');
    if (!treeContainer) return;

    if (databases.length === 0) {
      treeContainer.innerHTML = '<div class="empty-hint">No databases</div>';
      return;
    }

    treeContainer.innerHTML = databases.map(db => `
      <div class="tree-item" data-type="database" data-config="${configId}" data-database="${db}">
        <span class="tree-expand">▶</span>
        <span class="tree-icon">📁</span>
        <span class="tree-label">${this.escapeHtml(db)}</span>
      </div>
      <div class="tree-children" data-parent="${db}" style="display: none;"></div>
    `).join('');

    // 绑定数据库点击事件
    treeContainer.querySelectorAll('.tree-item[data-type="database"]').forEach(item => {
      item.addEventListener('click', async () => {
        const database = (item as HTMLElement).dataset.database!;
        const expand = item.querySelector('.tree-expand');
        const children = treeContainer.querySelector(`.tree-children[data-parent="${database}"]`) as HTMLElement;
        
        if (expand?.classList.contains('expanded')) {
          expand.classList.remove('expanded');
          if (children) children.style.display = 'none';
        } else {
          expand?.classList.add('expanded');
          if (children) {
            children.style.display = 'block';
            await this.loadTables(configId, database, children);
          }
        }
      });
    });
  }

  private async loadTables(configId: string, database: string, container: HTMLElement): Promise<void> {
    const connectionId = this.activeConnections.get(configId);
    if (!connectionId) return;

    container.innerHTML = '<div class="empty-hint" style="padding-left: 20px;">Loading...</div>';

    try {
      const result = await llmHub.db.getTables(connectionId, database);
      if (result.success && result.tables) {
        this.renderTableTree(configId, database, result.tables, container);
      } else {
        container.innerHTML = '<div class="empty-hint" style="padding-left: 20px;">Load failed</div>';
      }
    } catch (e) {
      container.innerHTML = '<div class="empty-hint" style="padding-left: 20px;">Load failed</div>';
    }
  }

  private renderTableTree(configId: string, database: string, tables: string[], container: HTMLElement): void {
    if (tables.length === 0) {
      container.innerHTML = '<div class="empty-hint" style="padding-left: 20px;">No tables</div>';
      return;
    }

    container.innerHTML = tables.map(table => `
      <div class="tree-item" data-type="table" data-config="${configId}" data-database="${database}" data-table="${table}">
        <span class="tree-expand" style="visibility: hidden;">▶</span>
        <span class="tree-icon">📋</span>
        <span class="tree-label">${this.escapeHtml(table)}</span>
      </div>
    `).join('');

    // 绑定表点击事件
    container.querySelectorAll('.tree-item[data-type="table"]').forEach(item => {
      item.addEventListener('click', () => {
        const table = (item as HTMLElement).dataset.table!;
        this.openTableTab(configId, database, table);
      });
    });
  }

  private refreshTree(): void {
    const activeItem = this.querySelector('.connection-item.active');
    if (activeItem) {
      const configId = (activeItem as HTMLElement).dataset.id!;
      this.loadDatabases(configId);
    }
  }

  // ==================== 标签页管理 ====================

  private openTableTab(configId: string, database: string, table: string): void {
    const tabId = `table_${configId}_${database}_${table}`;
    
    // 检查是否已存在
    const existingTab = this.tabs.find(t => t.id === tabId);
    if (existingTab) {
      this.switchTab(tabId);
      return;
    }

    // 创建新标签
    const tab: TabInfo = {
      id: tabId,
      type: 'table',
      title: table,
      connectionId: configId,
      database,
      table,
    };

    this.tabs.push(tab);
    this.renderTabs();
    this.createTablePanel(tab);
    this.switchTab(tabId);
  }

  private openQueryTab(configId: string, database: string): void {
    const tabId = `query_${Date.now()}`;
    
    const tab: TabInfo = {
      id: tabId,
      type: 'query',
      title: `${i18n.t('db.query')} - ${database}`,
      connectionId: configId,
      database,
    };

    this.tabs.push(tab);
    this.renderTabs();
    this.createQueryPanel(tab);
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

    // 绑定标签点击事件
    tabBar.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.dataset.close) {
          e.stopPropagation();
          this.closeTab((tab as HTMLElement).dataset.tab!);
        } else {
          this.switchTab((tab as HTMLElement).dataset.tab!);
        }
      });
    });
  }

  private switchTab(tabId: string): void {
    this.activeTabId = tabId;
    
    // 更新标签样式
    this.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', (tab as HTMLElement).dataset.tab === tabId);
    });

    // 更新面板显示
    this.querySelectorAll('.content-panel').forEach(panel => {
      panel.classList.toggle('active', (panel as HTMLElement).dataset.panel === tabId);
    });
  }

  private closeTab(tabId: string): void {
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    // 移除面板
    const panel = this.querySelector(`.content-panel[data-panel="${tabId}"]`);
    if (panel) {
      panel.remove();
    }

    // 移除标签
    this.tabs.splice(index, 1);
    this.renderTabs();

    // 切换到其他标签
    if (this.activeTabId === tabId) {
      const newActiveTab = this.tabs[Math.max(0, index - 1)];
      if (newActiveTab) {
        this.switchTab(newActiveTab.id);
      }
    }
  }

  // ==================== 表数据面板 ====================

  private createTablePanel(tab: TabInfo): void {
    const panels = this.querySelector('.content-panels');
    if (!panels) return;

    const panel = document.createElement('div');
    panel.className = 'content-panel';
    panel.dataset.panel = tab.id;
    panel.innerHTML = `
      <div class="query-panel">
        <div class="query-editor">
          <textarea class="query-textarea" placeholder="${i18n.t('db.enterSql')}"></textarea>
          <div class="query-actions">
            <button class="query-btn primary run-query">${i18n.t('db.executeQuery')}</button>
            <button class="query-btn secondary view-structure">${i18n.t('db.viewStructure')}</button>
            <button class="query-btn secondary view-data">${i18n.t('db.data')}</button>
          </div>
        </div>
        <div class="result-area">
          <div class="result-header">
            <span class="result-info">Click "${i18n.t('db.data')}" or execute query</span>
            <div class="result-actions"></div>
          </div>
          <div class="result-table-wrap">
            <table class="result-table">
              <thead></thead>
              <tbody></tbody>
            </table>
          </div>
          <div class="pagination" style="display: none;">
            <button class="pagination-btn prev-page">Prev</button>
            <span class="pagination-info">${i18n.t('db.page')} 1</span>
            <button class="pagination-btn next-page">Next</button>
          </div>
        </div>
      </div>
    `;

    panels.appendChild(panel);

    // 绑定事件
    const runQueryBtn = panel.querySelector('.run-query');
    const viewStructureBtn = panel.querySelector('.view-structure');
    const viewDataBtn = panel.querySelector('.view-data');
    const prevPageBtn = panel.querySelector('.prev-page');
    const nextPageBtn = panel.querySelector('.next-page');

    let currentPage = 1;
    const pageSize = 50;

    runQueryBtn?.addEventListener('click', async () => {
      const textarea = panel.querySelector('.query-textarea') as HTMLTextAreaElement;
      const sql = textarea.value.trim();
      if (!sql) {
        toast(i18n.t('db.enterSql'));
        return;
      }
      await this.executeQuery(tab, sql, panel);
    });

    viewStructureBtn?.addEventListener('click', async () => {
      await this.loadTableStructure(tab, panel);
    });

    viewDataBtn?.addEventListener('click', async () => {
      currentPage = 1;
      await this.loadTableData(tab, panel, currentPage, pageSize);
    });

    prevPageBtn?.addEventListener('click', async () => {
      if (currentPage > 1) {
        currentPage--;
        await this.loadTableData(tab, panel, currentPage, pageSize);
      }
    });

    nextPageBtn?.addEventListener('click', async () => {
      currentPage++;
      await this.loadTableData(tab, panel, currentPage, pageSize);
    });

    // 默认加载数据
    this.loadTableData(tab, panel, 1, pageSize);
  }

  private createQueryPanel(tab: TabInfo): void {
    const panels = this.querySelector('.content-panels');
    if (!panels) return;

    const panel = document.createElement('div');
    panel.className = 'content-panel';
    panel.dataset.panel = tab.id;
    panel.innerHTML = `
      <div class="query-panel">
        <div class="query-editor">
          <textarea class="query-textarea" placeholder="${i18n.t('db.enterSql')}"></textarea>
          <div class="query-actions">
            <button class="query-btn primary run-query">${i18n.t('db.executeQuery')}</button>
          </div>
        </div>
        <div class="result-area">
          <div class="result-header">
            <span class="result-info">Execute query to view results</span>
          </div>
          <div class="result-table-wrap">
            <table class="result-table">
              <thead></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    panels.appendChild(panel);

    const runQueryBtn = panel.querySelector('.run-query');
    runQueryBtn?.addEventListener('click', async () => {
      const textarea = panel.querySelector('.query-textarea') as HTMLTextAreaElement;
      const sql = textarea.value.trim();
      if (!sql) {
        toast(i18n.t('db.enterSql'));
        return;
      }
      await this.executeQuery(tab, sql, panel);
    });
  }

  private async loadTableStructure(tab: TabInfo, panel: HTMLElement): Promise<void> {
    const connectionId = this.activeConnections.get(tab.connectionId!);
    if (!connectionId || !tab.database || !tab.table) return;

    const resultInfo = panel.querySelector('.result-info');
    if (resultInfo) resultInfo.textContent = 'Loading structure...';

    try {
      const result = await llmHub.db.getTableStructure(connectionId, tab.database, tab.table);
      if (result.success && result.columns) {
        this.renderStructureTable(result.columns, panel);
        if (resultInfo) resultInfo.textContent = `${i18n.t('db.structure')}: ${result.columns.length} columns`;
      } else {
        if (resultInfo) resultInfo.textContent = `Load failed: ${result.error}`;
      }
    } catch (e) {
      if (resultInfo) resultInfo.textContent = `Load failed: ${e}`;
    }
  }

  private renderStructureTable(columns: TableColumn[], panel: HTMLElement): void {
    const thead = panel.querySelector('.result-table thead');
    const tbody = panel.querySelector('.result-table tbody');
    const pagination = panel.querySelector('.pagination') as HTMLElement;
    
    if (!thead || !tbody) return;
    if (pagination) pagination.style.display = 'none';

    thead.innerHTML = `
      <tr>
        <th>${i18n.t('db.column')}</th>
        <th>${i18n.t('db.type')}</th>
        <th>${i18n.t('db.nullable')}</th>
        <th>${i18n.t('db.key')}</th>
        <th>${i18n.t('db.default')}</th>
        <th>${i18n.t('db.extra')}</th>
      </tr>
    `;

    tbody.innerHTML = columns.map(col => `
      <tr>
        <td>${this.escapeHtml(col.name)}</td>
        <td>${this.escapeHtml(col.type)}</td>
        <td>${col.nullable ? 'YES' : 'NO'}</td>
        <td>${this.escapeHtml(col.key || '')}</td>
        <td>${col.default !== null ? this.escapeHtml(String(col.default)) : 'NULL'}</td>
        <td>${this.escapeHtml(col.extra || '')}</td>
      </tr>
    `).join('');
  }

  private async loadTableData(tab: TabInfo, panel: HTMLElement, page: number, pageSize: number): Promise<void> {
    const connectionId = this.activeConnections.get(tab.connectionId!);
    if (!connectionId || !tab.database || !tab.table) return;

    const resultInfo = panel.querySelector('.result-info');
    if (resultInfo) resultInfo.textContent = 'Loading data...';

    try {
      const result = await llmHub.db.getTableData(connectionId, tab.database, tab.table, page, pageSize);
      if (result.success && result.data) {
        this.renderDataTable(result.data, panel, tab, page, pageSize, result.total || 0);
        if (resultInfo) resultInfo.textContent = `${i18n.t('db.total')} ${result.total || 0} ${i18n.t('db.rows')}`;
      } else {
        if (resultInfo) resultInfo.textContent = `Load failed: ${result.error}`;
      }
    } catch (e) {
      if (resultInfo) resultInfo.textContent = `Load failed: ${e}`;
    }
  }

  private renderDataTable(data: any[], panel: HTMLElement, tab: TabInfo, page: number, pageSize: number, total: number): void {
    const thead = panel.querySelector('.result-table thead');
    const tbody = panel.querySelector('.result-table tbody');
    const pagination = panel.querySelector('.pagination') as HTMLElement;
    const pageInfo = panel.querySelector('.pagination-info');
    const prevBtn = panel.querySelector('.prev-page') as HTMLButtonElement;
    const nextBtn = panel.querySelector('.next-page') as HTMLButtonElement;
    
    if (!thead || !tbody) return;

    if (data.length === 0) {
      thead.innerHTML = '';
      tbody.innerHTML = '<tr><td colspan="100" style="text-align: center; color: #64748b;">No data</td></tr>';
      if (pagination) pagination.style.display = 'none';
      return;
    }

    const columns = Object.keys(data[0]);
    
    thead.innerHTML = `<tr>${columns.map(col => `<th>${this.escapeHtml(col)}</th>`).join('')}</tr>`;
    
    tbody.innerHTML = data.map(row => `
      <tr>
        ${columns.map(col => {
          const value = row[col];
          const displayValue = value === null ? '<span style="color: #64748b;">NULL</span>' : this.escapeHtml(String(value));
          return `<td class="editable" data-column="${col}" data-value="${this.escapeHtml(String(value ?? ''))}">${displayValue}</td>`;
        }).join('')}
      </tr>
    `).join('');

    // 分页
    if (pagination && total > pageSize) {
      pagination.style.display = 'flex';
      const totalPages = Math.ceil(total / pageSize);
      if (pageInfo) pageInfo.textContent = `${i18n.t('db.page')} ${page} / ${totalPages}`;
      if (prevBtn) prevBtn.disabled = page <= 1;
      if (nextBtn) nextBtn.disabled = page >= totalPages;
    } else if (pagination) {
      pagination.style.display = 'none';
    }

    // 绑定单元格编辑事件
    tbody.querySelectorAll('td.editable').forEach(cell => {
      cell.addEventListener('dblclick', () => {
        this.startCellEdit(cell as HTMLElement, tab);
      });
    });
  }

  private startCellEdit(cell: HTMLElement, tab: TabInfo): void {
    if (cell.classList.contains('editing')) return;

    const column = cell.dataset.column!;
    const originalValue = cell.dataset.value || '';
    
    cell.classList.add('editing');
    cell.innerHTML = `<input type="text" value="${this.escapeHtml(originalValue)}">`;
    
    const input = cell.querySelector('input')!;
    input.focus();
    input.select();

    const finishEdit = async (save: boolean) => {
      const newValue = input.value;
      cell.classList.remove('editing');
      
      if (save && newValue !== originalValue) {
        // TODO: 需要获取主键信息来更新记录
        // 这里简化处理，实际需要知道主键
        cell.innerHTML = this.escapeHtml(newValue);
        cell.dataset.value = newValue;
        toast(i18n.t('db.cellEditNeedsPrimaryKey'));
      } else {
        cell.innerHTML = originalValue === '' ? '<span style="color: #64748b;">NULL</span>' : this.escapeHtml(originalValue);
      }
    };

    input.addEventListener('blur', () => finishEdit(true));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        finishEdit(true);
      } else if (e.key === 'Escape') {
        finishEdit(false);
      }
    });
  }

  private async executeQuery(tab: TabInfo, sql: string, panel: HTMLElement): Promise<void> {
    const connectionId = this.activeConnections.get(tab.connectionId!);
    if (!connectionId || !tab.database) return;

    const resultInfo = panel.querySelector('.result-info');
    if (resultInfo) resultInfo.textContent = 'Executing...';
    this.setStatus('Executing query...', 'loading');

    try {
      const result = await llmHub.db.executeQuery(connectionId, tab.database, sql);
      if (result.success) {
        if (result.data && result.data.length > 0) {
          this.renderQueryResult(result.data, panel);
          if (resultInfo) resultInfo.textContent = `Returned ${result.data.length} ${i18n.t('db.rows')}`;
        } else if (result.affectedRows !== undefined) {
          if (resultInfo) resultInfo.textContent = i18n.t('db.affectedRows').replace('{count}', String(result.affectedRows));
          const tbody = panel.querySelector('.result-table tbody');
          if (tbody) tbody.innerHTML = '<tr><td style="text-align: center; color: #22c55e;">Success</td></tr>';
        } else {
          if (resultInfo) resultInfo.textContent = 'Success';
        }
        this.setStatus('Query completed');
      } else {
        if (resultInfo) resultInfo.textContent = `Failed: ${result.error}`;
        this.setStatus('Query failed', 'error');
      }
    } catch (e) {
      if (resultInfo) resultInfo.textContent = `Failed: ${e}`;
      this.setStatus('Query failed', 'error');
    }
  }

  private renderQueryResult(data: any[], panel: HTMLElement): void {
    const thead = panel.querySelector('.result-table thead');
    const tbody = panel.querySelector('.result-table tbody');
    const pagination = panel.querySelector('.pagination') as HTMLElement;
    
    if (!thead || !tbody) return;
    if (pagination) pagination.style.display = 'none';

    if (data.length === 0) {
      thead.innerHTML = '';
      tbody.innerHTML = '<tr><td style="text-align: center; color: #64748b;">No data</td></tr>';
      return;
    }

    const columns = Object.keys(data[0]);
    
    thead.innerHTML = `<tr>${columns.map(col => `<th>${this.escapeHtml(col)}</th>`).join('')}</tr>`;
    
    tbody.innerHTML = data.map(row => `
      <tr>
        ${columns.map(col => {
          const value = row[col];
          const displayValue = value === null ? '<span style="color: #64748b;">NULL</span>' : this.escapeHtml(String(value));
          return `<td>${displayValue}</td>`;
        }).join('')}
      </tr>
    `).join('');
  }

  // ==================== 工具方法 ====================

  private setStatus(text: string, type: 'normal' | 'loading' | 'error' | 'connected' = 'normal'): void {
    const statusText = this.querySelector('#statusText');
    const statusDot = this.querySelector('#statusDot');
    if (statusText) {
      statusText.textContent = text;
    }
    if (statusDot) {
      statusDot.className = 'status-dot';
      if (type === 'connected') {
        statusDot.classList.add('connected');
      } else if (type === 'loading') {
        statusDot.classList.add('loading');
      } else if (type === 'error') {
        statusDot.classList.add('error');
      }
    }
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
