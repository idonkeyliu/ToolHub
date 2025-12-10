/**
 * 数据库管理工具 - 支持 MySQL、PostgreSQL、SQLite
 */

import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { template } from './template';

declare function toast(msg: string): void;

// 数据库 IPC 接口
declare const llmHub: {
  db: {
    testConnection: (config: DBConnectionConfig) => Promise<{ success: boolean; error?: string }>;
    connect: (config: DBConnectionConfig) => Promise<{ success: boolean; connectionId?: string; error?: string }>;
    disconnect: (connectionId: string) => Promise<{ success: boolean; error?: string }>;
    getDatabases: (connectionId: string) => Promise<{ success: boolean; databases?: string[]; error?: string }>;
    getTables: (connectionId: string, database: string) => Promise<{ success: boolean; tables?: string[]; error?: string }>;
    getTableStructure: (connectionId: string, database: string, table: string) => Promise<{ success: boolean; columns?: TableColumn[]; error?: string }>;
    getTableData: (connectionId: string, database: string, table: string, page: number, pageSize: number) => Promise<{ success: boolean; data?: any[]; total?: number; error?: string }>;
    executeQuery: (connectionId: string, database: string, sql: string) => Promise<{ success: boolean; data?: any[]; affectedRows?: number; error?: string }>;
    updateRecord: (connectionId: string, database: string, table: string, primaryKey: string, primaryValue: any, column: string, value: any) => Promise<{ success: boolean; error?: string }>;
  };
};

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

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default: any;
  extra: string;
}

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
    title: '数据库',
    category: ToolCategory.DEVELOPER,
    icon: '🗄️',
    description: '数据库管理工具，支持 MySQL、PostgreSQL、SQLite',
    keywords: ['数据库', 'database', 'mysql', 'postgresql', 'sqlite', 'sql', '查询'],
  };

  readonly config = DatabaseTool.config;

  private connections: DBConnectionConfig[] = [];
  private activeConnections: Map<string, string> = new Map(); // configId -> connectionId
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
      list.innerHTML = '<div class="empty-hint">暂无连接配置</div>';
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
            <button class="conn-action-btn edit" data-action="edit" title="编辑">✏️</button>
            <button class="conn-action-btn delete" data-action="delete" title="删除">🗑️</button>
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
    title.textContent = config ? '编辑数据库连接' : '添加数据库连接';

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
      toast('请输入连接名称');
      return;
    }

    if (config.type === 'sqlite' && !config.sqlitePath) {
      toast('请输入数据库文件路径');
      return;
    }

    if (config.type !== 'sqlite' && !config.host) {
      toast('请输入主机地址');
      return;
    }

    this.setStatus('正在测试连接...', 'loading');

    try {
      const result = await llmHub.db.testConnection(config);
      if (result.success) {
        toast('连接成功！');
        this.setStatus('连接测试成功');
      } else {
        toast(`连接失败: ${result.error}`);
        this.setStatus('连接测试失败', 'error');
      }
    } catch (e) {
      toast(`连接失败: ${e}`);
      this.setStatus('连接测试失败', 'error');
    }
  }

  private saveConnection(): void {
    const config = this.getFormConfig();
    
    if (!config.name) {
      toast('请输入连接名称');
      return;
    }

    if (config.type === 'sqlite' && !config.sqlitePath) {
      toast('请输入数据库文件路径');
      return;
    }

    if (config.type !== 'sqlite' && !config.host) {
      toast('请输入主机地址');
      return;
    }

    if (this.editingConfigId) {
      // 更新现有连接
      const index = this.connections.findIndex(c => c.id === this.editingConfigId);
      if (index !== -1) {
        this.connections[index] = config;
      }
    } else {
      // 添加新连接
      this.connections.push(config);
    }

    this.saveConnections();
    this.renderConnectionList();
    this.hideConnectionModal();
    toast('连接配置已保存');
  }

  private editConnection(id: string): void {
    const config = this.connections.find(c => c.id === id);
    if (config) {
      this.showConnectionModal(config);
    }
  }

  private deleteConnection(id: string): void {
    if (!confirm('确定要删除这个连接配置吗？')) {
      return;
    }

    // 断开连接
    if (this.activeConnections.has(id)) {
      const connectionId = this.activeConnections.get(id)!;
      llmHub.db.disconnect(connectionId).catch(console.error);
      this.activeConnections.delete(id);
    }

    this.connections = this.connections.filter(c => c.id !== id);
    this.saveConnections();
    this.renderConnectionList();
    
    // 隐藏树形面板
    const treePanel = this.querySelector('#treePanel');
    if (treePanel) {
      treePanel.style.display = 'none';
    }
    
    toast('连接配置已删除');
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

    this.setStatus(`正在连接 ${config.name}...`, 'loading');

    try {
      const result = await llmHub.db.connect(config);
      if (result.success && result.connectionId) {
        this.activeConnections.set(configId, result.connectionId);
        this.renderConnectionList();
        await this.loadDatabases(configId);
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

  private async loadDatabases(configId: string): Promise<void> {
    const connectionId = this.activeConnections.get(configId);
    if (!connectionId) return;

    const treePanel = this.querySelector('#treePanel');
    const treeContainer = this.querySelector('#treeContainer');
    const treePanelTitle = this.querySelector('#treePanelTitle');
    
    if (!treePanel || !treeContainer || !treePanelTitle) return;

    treePanel.style.display = 'flex';
    treePanelTitle.textContent = '数据库';
    treeContainer.innerHTML = '<div class="empty-hint">加载中...</div>';

    try {
      const result = await llmHub.db.getDatabases(connectionId);
      if (result.success && result.databases) {
        this.renderDatabaseTree(configId, result.databases);
      } else {
        treeContainer.innerHTML = `<div class="empty-hint">加载失败: ${result.error}</div>`;
      }
    } catch (e) {
      treeContainer.innerHTML = `<div class="empty-hint">加载失败: ${e}</div>`;
    }
  }

  private renderDatabaseTree(configId: string, databases: string[]): void {
    const treeContainer = this.querySelector('#treeContainer');
    if (!treeContainer) return;

    if (databases.length === 0) {
      treeContainer.innerHTML = '<div class="empty-hint">没有数据库</div>';
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

    container.innerHTML = '<div class="empty-hint" style="padding-left: 20px;">加载中...</div>';

    try {
      const result = await llmHub.db.getTables(connectionId, database);
      if (result.success && result.tables) {
        this.renderTableTree(configId, database, result.tables, container);
      } else {
        container.innerHTML = `<div class="empty-hint" style="padding-left: 20px;">加载失败</div>`;
      }
    } catch (e) {
      container.innerHTML = `<div class="empty-hint" style="padding-left: 20px;">加载失败</div>`;
    }
  }

  private renderTableTree(configId: string, database: string, tables: string[], container: HTMLElement): void {
    if (tables.length === 0) {
      container.innerHTML = '<div class="empty-hint" style="padding-left: 20px;">没有表</div>';
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
      title: `查询 - ${database}`,
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
          <textarea class="query-textarea" placeholder="输入 SQL 查询语句..."></textarea>
          <div class="query-actions">
            <button class="query-btn primary run-query">▶ 执行查询</button>
            <button class="query-btn secondary view-structure">查看表结构</button>
            <button class="query-btn secondary view-data">查看数据</button>
          </div>
        </div>
        <div class="result-area">
          <div class="result-header">
            <span class="result-info">点击"查看数据"或执行查询</span>
            <div class="result-actions"></div>
          </div>
          <div class="result-table-wrap">
            <table class="result-table">
              <thead></thead>
              <tbody></tbody>
            </table>
          </div>
          <div class="pagination" style="display: none;">
            <button class="pagination-btn prev-page">上一页</button>
            <span class="pagination-info">第 1 页</span>
            <button class="pagination-btn next-page">下一页</button>
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
        toast('请输入 SQL 语句');
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
          <textarea class="query-textarea" placeholder="输入 SQL 查询语句..."></textarea>
          <div class="query-actions">
            <button class="query-btn primary run-query">▶ 执行查询</button>
          </div>
        </div>
        <div class="result-area">
          <div class="result-header">
            <span class="result-info">执行查询查看结果</span>
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
        toast('请输入 SQL 语句');
        return;
      }
      await this.executeQuery(tab, sql, panel);
    });
  }

  private async loadTableStructure(tab: TabInfo, panel: HTMLElement): Promise<void> {
    const connectionId = this.activeConnections.get(tab.connectionId!);
    if (!connectionId || !tab.database || !tab.table) return;

    const resultInfo = panel.querySelector('.result-info');
    if (resultInfo) resultInfo.textContent = '加载表结构...';

    try {
      const result = await llmHub.db.getTableStructure(connectionId, tab.database, tab.table);
      if (result.success && result.columns) {
        this.renderStructureTable(result.columns, panel);
        if (resultInfo) resultInfo.textContent = `表结构: ${result.columns.length} 个字段`;
      } else {
        if (resultInfo) resultInfo.textContent = `加载失败: ${result.error}`;
      }
    } catch (e) {
      if (resultInfo) resultInfo.textContent = `加载失败: ${e}`;
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
        <th>字段名</th>
        <th>类型</th>
        <th>可空</th>
        <th>键</th>
        <th>默认值</th>
        <th>额外</th>
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
    if (resultInfo) resultInfo.textContent = '加载数据...';

    try {
      const result = await llmHub.db.getTableData(connectionId, tab.database, tab.table, page, pageSize);
      if (result.success && result.data) {
        this.renderDataTable(result.data, panel, tab, page, pageSize, result.total || 0);
        if (resultInfo) resultInfo.textContent = `共 ${result.total || 0} 条记录`;
      } else {
        if (resultInfo) resultInfo.textContent = `加载失败: ${result.error}`;
      }
    } catch (e) {
      if (resultInfo) resultInfo.textContent = `加载失败: ${e}`;
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
      tbody.innerHTML = '<tr><td colspan="100" style="text-align: center; color: #64748b;">没有数据</td></tr>';
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
      if (pageInfo) pageInfo.textContent = `第 ${page} / ${totalPages} 页`;
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
        toast('单元格编辑功能需要主键支持，暂未实现完整更新');
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
    if (resultInfo) resultInfo.textContent = '执行中...';
    this.setStatus('执行查询...', 'loading');

    try {
      const result = await llmHub.db.executeQuery(connectionId, tab.database, sql);
      if (result.success) {
        if (result.data && result.data.length > 0) {
          this.renderQueryResult(result.data, panel);
          if (resultInfo) resultInfo.textContent = `返回 ${result.data.length} 条记录`;
        } else if (result.affectedRows !== undefined) {
          if (resultInfo) resultInfo.textContent = `影响 ${result.affectedRows} 行`;
          const tbody = panel.querySelector('.result-table tbody');
          if (tbody) tbody.innerHTML = '<tr><td style="text-align: center; color: #22c55e;">执行成功</td></tr>';
        } else {
          if (resultInfo) resultInfo.textContent = '执行成功';
        }
        this.setStatus('查询完成');
      } else {
        if (resultInfo) resultInfo.textContent = `执行失败: ${result.error}`;
        this.setStatus('查询失败', 'error');
      }
    } catch (e) {
      if (resultInfo) resultInfo.textContent = `执行失败: ${e}`;
      this.setStatus('查询失败', 'error');
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
      tbody.innerHTML = '<tr><td style="text-align: center; color: #64748b;">没有数据</td></tr>';
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
