/**
 * 文件同步检测工具
 * 比对 Git 仓库与服务器文件的差异
 */

import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { getTemplate } from './template';
import { toast } from '../../components/Toast';
import { i18n } from '../../core/i18n';

// Sync IPC 接口
declare const llmHub: {
  sync: {
    testConnection: (config: ServerConfig) => Promise<{ success: boolean; error?: string }>;
    checkSync: (project: ProjectConfig, servers: ServerConfig[]) => Promise<SyncResult>;
    getFileContent: (sessionId: string, filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
    cloneRepo: (gitUrl: string, branch: string, token?: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  };
};

interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  password?: string;
  privateKey?: string;
}

interface PathMapping {
  serverId: string;
  serverName: string;
  serverPath: string;
  gitSubdir: string;
}

interface ProjectConfig {
  id: string;
  name: string;
  gitUrl: string;
  gitBranch: string;
  gitToken?: string;
  mappings: PathMapping[];
  ignorePattern: string;
  checkContent: boolean;
}

interface FileDiff {
  path: string;
  status: 'synced' | 'modified' | 'added' | 'deleted';
  gitSize?: number;
  serverSize?: number;
}

interface ServerSyncResult {
  serverId: string;
  serverName: string;
  status: 'success' | 'error';
  error?: string;
  files: FileDiff[];
}

interface SyncResult {
  projectId: string;
  timestamp: number;
  servers: ServerSyncResult[];
}

export class SyncTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'sync',
    title: i18n.t('tool.sync'),
    category: ToolCategory.TERMINAL,
    icon: '🔄',
    description: i18n.t('tool.syncDesc'),
    keywords: ['sync', 'git', 'server', 'diff', 'deploy'],
  };

  readonly config = SyncTool.config;

  private projects: ProjectConfig[] = [];
  private servers: ServerConfig[] = [];
  private activeProjectId: string | null = null;
  private editingProjectId: string | null = null;
  private editingServerId: string | null = null;
  private tempMappings: PathMapping[] = [];
  private syncResults: Map<string, SyncResult> = new Map();
  private activeServerTabId: string | null = null;

  render(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = getTemplate();
    return container.firstElementChild as HTMLElement;
  }

  protected onMounted(): void {
    this.loadData();
    this.renderProjectList();
    this.renderServerList();
  }

  protected bindEvents(): void {
    // 添加项目按钮
    this.bindClick('#addProjectBtn', () => this.showProjectModal());
    this.bindClick('#welcomeAddBtn', () => this.showProjectModal());
    
    // 添加服务器按钮
    this.bindClick('#addServerBtn', () => this.showServerModal());
    
    // 项目弹窗
    this.bindClick('#closeProjectModalBtn', () => this.hideProjectModal());
    this.bindClick('#cancelProjectBtn', () => this.hideProjectModal());
    this.bindClick('#saveProjectBtn', () => this.saveProject());
    this.bindClick('#addMappingBtn', () => this.showMappingModal());
    
    // 服务器弹窗
    this.bindClick('#closeServerModalBtn', () => this.hideServerModal());
    this.bindClick('#testServerBtn', () => this.testServerConnection());
    this.bindClick('#saveServerBtn', () => this.saveServer());
    
    // 认证方式切换
    this.addEventListener(this.querySelector('#serverAuthType'), 'change', (e) => {
      const authType = (e.target as HTMLSelectElement).value;
      this.toggleAuthFields(authType as 'password' | 'key');
    });
    
    // 映射弹窗
    this.bindClick('#closeMappingModalBtn', () => this.hideMappingModal());
    this.bindClick('#cancelMappingBtn', () => this.hideMappingModal());
    this.bindClick('#saveMappingBtn', () => this.saveMapping());
    
    // 工具栏
    this.bindClick('#refreshBtn', () => this.refresh());
    this.bindClick('#syncCheckBtn', () => this.startSyncCheck());
    
    // 差异查看器
    this.bindClick('#closeDiffBtn', () => this.closeDiffViewer());
    
    // 点击弹窗外部关闭
    ['#projectModal', '#serverModal', '#mappingModal'].forEach(id => {
      this.addEventListener(this.querySelector(id), 'click', (e) => {
        if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
          this.hideAllModals();
        }
      });
    });
  }

  private bindClick(selector: string, handler: () => void): void {
    this.addEventListener(this.querySelector(selector), 'click', handler);
  }

  // ==================== 数据管理 ====================

  private loadData(): void {
    try {
      const savedProjects = localStorage.getItem('sync_projects');
      const savedServers = localStorage.getItem('sync_servers');
      if (savedProjects) this.projects = JSON.parse(savedProjects);
      if (savedServers) this.servers = JSON.parse(savedServers);
    } catch (e) {
      console.error('Failed to load sync data:', e);
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem('sync_projects', JSON.stringify(this.projects));
      localStorage.setItem('sync_servers', JSON.stringify(this.servers));
    } catch (e) {
      console.error('Failed to save sync data:', e);
    }
  }

  // ==================== 项目管理 ====================

  private renderProjectList(): void {
    const list = this.querySelector('#projectList');
    if (!list) return;

    if (this.projects.length === 0) {
      list.innerHTML = `<div class="empty-hint">${i18n.t('sync.noProjects')}</div>`;
      return;
    }

    list.innerHTML = this.projects.map(project => `
      <div class="project-item ${this.activeProjectId === project.id ? 'active' : ''}" data-id="${project.id}">
        <div class="item-icon">📁</div>
        <div class="item-info">
          <div class="item-name">${this.escapeHtml(project.name)}</div>
          <div class="item-detail">${project.mappings.length} ${i18n.t('sync.serverMappings')}</div>
        </div>
        <div class="item-actions">
          <button class="item-action-btn edit" data-action="edit" title="${i18n.t('common.edit')}">✏️</button>
          <button class="item-action-btn delete" data-action="delete" title="${i18n.t('common.delete')}">🗑️</button>
        </div>
      </div>
    `).join('');

    // 绑定事件
    list.querySelectorAll('.project-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const action = target.dataset.action;
        const id = (item as HTMLElement).dataset.id!;
        
        if (action === 'edit') {
          e.stopPropagation();
          this.editProject(id);
        } else if (action === 'delete') {
          e.stopPropagation();
          this.deleteProject(id);
        } else {
          this.selectProject(id);
        }
      });
    });
  }

  private selectProject(id: string): void {
    this.activeProjectId = id;
    this.renderProjectList();
    
    const project = this.projects.find(p => p.id === id);
    if (project) {
      this.updateToolbarTitle(project.name);
      
      // 显示已有的检测结果或欢迎页
      const result = this.syncResults.get(id);
      if (result) {
        this.showSyncResult(result);
      } else {
        this.showWelcomePanel();
      }
    }
  }

  private showProjectModal(project?: ProjectConfig): void {
    const modal = this.querySelector('#projectModal');
    const title = this.querySelector('#projectModalTitle');
    if (!modal || !title) return;

    this.editingProjectId = project?.id || null;
    title.textContent = project ? i18n.t('sync.editProject') : i18n.t('sync.addProject');

    // 填充表单
    (this.querySelector('#projectName') as HTMLInputElement).value = project?.name || '';
    (this.querySelector('#gitUrl') as HTMLInputElement).value = project?.gitUrl || '';
    (this.querySelector('#gitBranch') as HTMLInputElement).value = project?.gitBranch || 'master';
    (this.querySelector('#gitToken') as HTMLInputElement).value = project?.gitToken || '';
    (this.querySelector('#ignorePattern') as HTMLInputElement).value = project?.ignorePattern || 'node_modules|\\.git|dist|\\.DS_Store';
    (this.querySelector('#checkContent') as HTMLInputElement).checked = project?.checkContent ?? true;

    // 加载映射
    this.tempMappings = project?.mappings ? [...project.mappings] : [];
    this.renderMappingList();

    modal.style.display = 'flex';
  }

  private hideProjectModal(): void {
    const modal = this.querySelector('#projectModal');
    if (modal) modal.style.display = 'none';
    this.editingProjectId = null;
    this.tempMappings = [];
  }

  private saveProject(): void {
    const name = (this.querySelector('#projectName') as HTMLInputElement).value.trim();
    const gitUrl = (this.querySelector('#gitUrl') as HTMLInputElement).value.trim();
    const gitBranch = (this.querySelector('#gitBranch') as HTMLInputElement).value.trim() || 'master';
    const gitToken = (this.querySelector('#gitToken') as HTMLInputElement).value.trim();
    const ignorePattern = (this.querySelector('#ignorePattern') as HTMLInputElement).value.trim();
    const checkContent = (this.querySelector('#checkContent') as HTMLInputElement).checked;

    if (!name || !gitUrl) {
      toast(i18n.t('sync.fillProjectInfo'));
      return;
    }

    if (this.tempMappings.length === 0) {
      toast(i18n.t('sync.addAtLeastOneMapping'));
      return;
    }

    const project: ProjectConfig = {
      id: this.editingProjectId || `project_${Date.now()}`,
      name,
      gitUrl,
      gitBranch,
      gitToken: gitToken || undefined,
      mappings: this.tempMappings,
      ignorePattern,
      checkContent,
    };

    if (this.editingProjectId) {
      const index = this.projects.findIndex(p => p.id === this.editingProjectId);
      if (index !== -1) this.projects[index] = project;
    } else {
      this.projects.push(project);
    }

    this.saveData();
    this.renderProjectList();
    this.hideProjectModal();
    toast(i18n.t('sync.projectSaved'));
  }

  private editProject(id: string): void {
    const project = this.projects.find(p => p.id === id);
    if (project) this.showProjectModal(project);
  }

  private deleteProject(id: string): void {
    if (!confirm(i18n.t('sync.confirmDeleteProject'))) return;
    
    this.projects = this.projects.filter(p => p.id !== id);
    this.syncResults.delete(id);
    if (this.activeProjectId === id) {
      this.activeProjectId = null;
      this.showWelcomePanel();
    }
    this.saveData();
    this.renderProjectList();
    toast(i18n.t('sync.projectDeleted'));
  }

  // ==================== 服务器管理 ====================

  private renderServerList(): void {
    const list = this.querySelector('#serverList');
    if (!list) return;

    if (this.servers.length === 0) {
      list.innerHTML = `<div class="empty-hint">${i18n.t('sync.noServers')}</div>`;
      return;
    }

    list.innerHTML = this.servers.map(server => `
      <div class="server-item" data-id="${server.id}">
        <div class="item-icon">🖥️</div>
        <div class="item-info">
          <div class="item-name">${this.escapeHtml(server.name)}</div>
          <div class="item-detail">${this.escapeHtml(server.username)}@${this.escapeHtml(server.host)}:${server.port}</div>
        </div>
        <div class="item-actions">
          <button class="item-action-btn edit" data-action="edit" title="${i18n.t('common.edit')}">✏️</button>
          <button class="item-action-btn delete" data-action="delete" title="${i18n.t('common.delete')}">🗑️</button>
        </div>
      </div>
    `).join('');

    // 绑定事件
    list.querySelectorAll('.server-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const action = target.dataset.action;
        const id = (item as HTMLElement).dataset.id!;
        
        if (action === 'edit') {
          e.stopPropagation();
          this.editServer(id);
        } else if (action === 'delete') {
          e.stopPropagation();
          this.deleteServer(id);
        }
      });
    });
  }

  private showServerModal(server?: ServerConfig): void {
    const modal = this.querySelector('#serverModal');
    const title = this.querySelector('#serverModalTitle');
    if (!modal || !title) return;

    this.editingServerId = server?.id || null;
    title.textContent = server ? i18n.t('sync.editServer') : i18n.t('sync.addServer');

    // 填充表单
    (this.querySelector('#serverName') as HTMLInputElement).value = server?.name || '';
    (this.querySelector('#serverHost') as HTMLInputElement).value = server?.host || '';
    (this.querySelector('#serverPort') as HTMLInputElement).value = String(server?.port || 22);
    (this.querySelector('#serverUser') as HTMLInputElement).value = server?.username || 'root';
    (this.querySelector('#serverAuthType') as HTMLSelectElement).value = server?.authType || 'password';
    (this.querySelector('#serverPassword') as HTMLInputElement).value = server?.password || '';
    (this.querySelector('#serverKey') as HTMLTextAreaElement).value = server?.privateKey || '';

    this.toggleAuthFields(server?.authType || 'password');
    
    const statusEl = this.querySelector('#serverTestStatus');
    if (statusEl) statusEl.textContent = '';

    modal.style.display = 'flex';
  }

  private hideServerModal(): void {
    const modal = this.querySelector('#serverModal');
    if (modal) modal.style.display = 'none';
    this.editingServerId = null;
  }

  private toggleAuthFields(authType: 'password' | 'key'): void {
    const passwordGroup = this.querySelector('#serverPasswordGroup');
    const keyGroup = this.querySelector('#serverKeyGroup');
    if (passwordGroup) passwordGroup.style.display = authType === 'password' ? 'block' : 'none';
    if (keyGroup) keyGroup.style.display = authType === 'key' ? 'block' : 'none';
  }

  private async testServerConnection(): Promise<void> {
    const config = this.getServerFormData();
    if (!config.name || !config.host || !config.username) {
      toast(i18n.t('sync.fillServerInfo'));
      return;
    }

    const statusEl = this.querySelector('#serverTestStatus');
    const testBtn = this.querySelector('#testServerBtn') as HTMLButtonElement;
    
    if (statusEl) {
      statusEl.textContent = i18n.t('sync.testing');
      statusEl.style.color = '#f59e0b';
    }
    if (testBtn) testBtn.disabled = true;

    try {
      const result = await llmHub.sync.testConnection(config);
      if (result.success) {
        if (statusEl) {
          statusEl.textContent = i18n.t('sync.testSuccess');
          statusEl.style.color = '#22c55e';
        }
        toast(i18n.t('sync.connectionSuccess'));
      } else {
        if (statusEl) {
          statusEl.textContent = `❌ ${result.error}`;
          statusEl.style.color = '#ef4444';
        }
        toast(`${i18n.t('sync.connectionFailed')}: ${result.error}`);
      }
    } catch (e) {
      if (statusEl) {
        statusEl.textContent = `❌ ${e}`;
        statusEl.style.color = '#ef4444';
      }
      toast(`${i18n.t('sync.connectionFailed')}: ${e}`);
    } finally {
      if (testBtn) testBtn.disabled = false;
    }
  }

  private getServerFormData(): ServerConfig {
    const authType = (this.querySelector('#serverAuthType') as HTMLSelectElement).value as 'password' | 'key';
    return {
      id: this.editingServerId || `server_${Date.now()}`,
      name: (this.querySelector('#serverName') as HTMLInputElement).value.trim(),
      host: (this.querySelector('#serverHost') as HTMLInputElement).value.trim(),
      port: parseInt((this.querySelector('#serverPort') as HTMLInputElement).value) || 22,
      username: (this.querySelector('#serverUser') as HTMLInputElement).value.trim(),
      authType,
      password: authType === 'password' ? (this.querySelector('#serverPassword') as HTMLInputElement).value : undefined,
      privateKey: authType === 'key' ? (this.querySelector('#serverKey') as HTMLTextAreaElement).value : undefined,
    };
  }

  private saveServer(): void {
    const server = this.getServerFormData();
    
    if (!server.name || !server.host || !server.username) {
      toast(i18n.t('sync.fillServerInfo'));
      return;
    }

    if (server.authType === 'password' && !server.password) {
      toast(i18n.t('sync.enterPassword'));
      return;
    }

    if (server.authType === 'key' && !server.privateKey) {
      toast(i18n.t('sync.enterPrivateKey'));
      return;
    }

    if (this.editingServerId) {
      const index = this.servers.findIndex(s => s.id === this.editingServerId);
      if (index !== -1) this.servers[index] = server;
    } else {
      this.servers.push(server);
    }

    this.saveData();
    this.renderServerList();
    this.hideServerModal();
    toast(i18n.t('sync.serverSaved'));
  }

  private editServer(id: string): void {
    const server = this.servers.find(s => s.id === id);
    if (server) this.showServerModal(server);
  }

  private deleteServer(id: string): void {
    if (!confirm(i18n.t('sync.confirmDeleteServer'))) return;
    
    this.servers = this.servers.filter(s => s.id !== id);
    
    // 从所有项目映射中移除该服务器
    this.projects.forEach(project => {
      project.mappings = project.mappings.filter(m => m.serverId !== id);
    });
    
    this.saveData();
    this.renderServerList();
    this.renderProjectList();
    toast(i18n.t('sync.serverDeleted'));
  }

  // ==================== 映射管理 ====================

  private renderMappingList(): void {
    const list = this.querySelector('#mappingList');
    if (!list) return;

    if (this.tempMappings.length === 0) {
      list.innerHTML = `<div class="mapping-empty">${i18n.t('sync.noMapping')}</div>`;
      return;
    }

    list.innerHTML = this.tempMappings.map((mapping, index) => `
      <div class="mapping-item" data-index="${index}">
        <div class="mapping-info">
          <div class="mapping-server">${this.escapeHtml(mapping.serverName)}</div>
          <div class="mapping-path">${this.escapeHtml(mapping.serverPath)}${mapping.gitSubdir ? ` ← ${mapping.gitSubdir}` : ''}</div>
        </div>
        <button class="mapping-remove" data-action="remove">×</button>
      </div>
    `).join('');

    // 绑定移除事件
    list.querySelectorAll('.mapping-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = (e.target as HTMLElement).closest('.mapping-item') as HTMLElement;
        const index = parseInt(item.dataset.index!);
        this.tempMappings.splice(index, 1);
        this.renderMappingList();
      });
    });
  }

  private showMappingModal(): void {
    const modal = this.querySelector('#mappingModal');
    const serverSelect = this.querySelector('#mappingServer') as HTMLSelectElement;
    if (!modal || !serverSelect) return;

    // 填充服务器选项
    serverSelect.innerHTML = `<option value="">${i18n.t('sync.selectServerPlaceholder')}</option>` +
      this.servers.map(s => `<option value="${s.id}">${this.escapeHtml(s.name)} (${s.host})</option>`).join('');

    (this.querySelector('#mappingPath') as HTMLInputElement).value = '';
    (this.querySelector('#mappingGitSubdir') as HTMLInputElement).value = '';

    modal.style.display = 'flex';
  }

  private hideMappingModal(): void {
    const modal = this.querySelector('#mappingModal');
    if (modal) modal.style.display = 'none';
  }

  private saveMapping(): void {
    const serverId = (this.querySelector('#mappingServer') as HTMLSelectElement).value;
    const serverPath = (this.querySelector('#mappingPath') as HTMLInputElement).value.trim();
    const gitSubdir = (this.querySelector('#mappingGitSubdir') as HTMLInputElement).value.trim();

    if (!serverId) {
      toast(i18n.t('sync.pleaseSelectServer'));
      return;
    }

    if (!serverPath) {
      toast(i18n.t('sync.fillServerPath'));
      return;
    }

    const server = this.servers.find(s => s.id === serverId);
    if (!server) {
      toast(i18n.t('sync.serverNotExist'));
      return;
    }

    // 检查是否已存在相同映射
    const exists = this.tempMappings.some(m => m.serverId === serverId && m.serverPath === serverPath);
    if (exists) {
      toast(i18n.t('sync.mappingExists'));
      return;
    }

    this.tempMappings.push({
      serverId,
      serverName: server.name,
      serverPath,
      gitSubdir,
    });

    this.renderMappingList();
    this.hideMappingModal();
  }

  // ==================== 同步检测 ====================

  private async startSyncCheck(): Promise<void> {
    if (!this.activeProjectId) {
      toast(i18n.t('sync.selectProjectFirst'));
      return;
    }

    const project = this.projects.find(p => p.id === this.activeProjectId);
    if (!project) return;

    // 获取相关服务器配置
    const serverIds = [...new Set(project.mappings.map(m => m.serverId))];
    const servers = this.servers.filter(s => serverIds.includes(s.id));

    if (servers.length === 0) {
      toast(i18n.t('sync.noServerFound'));
      return;
    }

    this.showProgressPanel();
    this.setStatus(i18n.t('sync.detecting'), 'loading');

    try {
      const result = await llmHub.sync.checkSync(project, servers);
      this.syncResults.set(project.id, result);
      this.showSyncResult(result);
      this.setStatus(i18n.t('sync.detectComplete'), 'success');
      toast(i18n.t('sync.syncDetectComplete'));
    } catch (e) {
      toast(`${i18n.t('sync.detectFailed')}: ${e}`);
      this.setStatus(i18n.t('sync.detectFailed'), 'error');
      this.showWelcomePanel();
    }
  }

  private showProgressPanel(): void {
    this.querySelector('#welcomePanel')!.style.display = 'none';
    this.querySelector('#resultPanel')!.style.display = 'none';
    this.querySelector('#progressPanel')!.style.display = 'flex';
  }

  private showWelcomePanel(): void {
    this.querySelector('#welcomePanel')!.style.display = 'flex';
    this.querySelector('#resultPanel')!.style.display = 'none';
    this.querySelector('#progressPanel')!.style.display = 'none';
  }

  private showSyncResult(result: SyncResult): void {
    this.querySelector('#welcomePanel')!.style.display = 'none';
    this.querySelector('#progressPanel')!.style.display = 'none';
    this.querySelector('#resultPanel')!.style.display = 'flex';

    const project = this.projects.find(p => p.id === result.projectId);
    if (!project) return;

    // 更新项目信息
    this.querySelector('#resultProjectName')!.textContent = project.name;
    this.querySelector('#resultGitUrl')!.textContent = project.gitUrl;

    // 计算汇总
    let synced = 0, modified = 0, added = 0, deleted = 0;
    result.servers.forEach(server => {
      server.files.forEach(file => {
        switch (file.status) {
          case 'synced': synced++; break;
          case 'modified': modified++; break;
          case 'added': added++; break;
          case 'deleted': deleted++; break;
        }
      });
    });

    this.querySelector('#syncedCount')!.textContent = String(synced);
    this.querySelector('#modifiedCount')!.textContent = String(modified);
    this.querySelector('#addedCount')!.textContent = String(added);
    this.querySelector('#deletedCount')!.textContent = String(deleted);

    // 渲染服务器标签页
    this.renderServerTabs(result.servers);

    // 默认选中第一个服务器
    if (result.servers.length > 0) {
      this.activeServerTabId = result.servers[0].serverId;
      this.renderDiffList(result.servers[0]);
    }
  }

  private renderServerTabs(servers: ServerSyncResult[]): void {
    const tabs = this.querySelector('#serverTabs');
    if (!tabs) return;

    tabs.innerHTML = servers.map(server => {
      const hasError = server.status === 'error';
      const hasDiff = server.files.some(f => f.status !== 'synced');
      let statusClass = 'synced';
      if (hasError) statusClass = 'error';
      else if (hasDiff) statusClass = 'diff';

      return `
        <div class="server-tab ${this.activeServerTabId === server.serverId ? 'active' : ''}" data-id="${server.serverId}">
          <span class="tab-status ${statusClass}"></span>
          <span>${this.escapeHtml(server.serverName)}</span>
        </div>
      `;
    }).join('');

    // 绑定点击事件
    tabs.querySelectorAll('.server-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const id = (tab as HTMLElement).dataset.id!;
        this.activeServerTabId = id;
        
        // 更新标签样式
        tabs.querySelectorAll('.server-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // 渲染差异列表
        const server = servers.find(s => s.serverId === id);
        if (server) this.renderDiffList(server);
      });
    });
  }

  private renderDiffList(server: ServerSyncResult): void {
    const list = this.querySelector('#diffList');
    if (!list) return;

    if (server.status === 'error') {
      list.innerHTML = `<div class="diff-empty" style="color: #ef4444;">❌ ${this.escapeHtml(server.error || i18n.t('sync.connectionFailed'))}</div>`;
      return;
    }

    const modified = server.files.filter(f => f.status === 'modified');
    const added = server.files.filter(f => f.status === 'added');
    const deleted = server.files.filter(f => f.status === 'deleted');

    if (modified.length === 0 && added.length === 0 && deleted.length === 0) {
      list.innerHTML = `<div class="diff-empty" style="color: #22c55e;">✅ ${i18n.t('sync.allFilesSynced')}</div>`;
      return;
    }

    let html = '';

    if (modified.length > 0) {
      html += this.renderDiffGroup('modified', i18n.t('sync.modified'), '📝', modified);
    }

    if (added.length > 0) {
      html += this.renderDiffGroup('added', i18n.t('sync.gitAdded'), '➕', added);
    }

    if (deleted.length > 0) {
      html += this.renderDiffGroup('deleted', i18n.t('sync.serverExtra'), '➖', deleted);
    }

    list.innerHTML = html;

    // 绑定文件点击事件
    list.querySelectorAll('.diff-file').forEach(file => {
      file.addEventListener('click', () => {
        const path = (file as HTMLElement).dataset.path!;
        this.showFileDiff(path);
      });
    });
  }

  private renderDiffGroup(type: string, label: string, icon: string, files: FileDiff[]): string {
    return `
      <div class="diff-group ${type}">
        <div class="diff-group-header">
          <span class="group-icon">${icon}</span>
          <span>${label}</span>
          <span class="group-count">${files.length}</span>
        </div>
        ${files.map(file => `
          <div class="diff-file ${file.status}" data-path="${this.escapeHtml(file.path)}">
            <span class="file-icon">📄</span>
            <span class="file-path">${this.escapeHtml(file.path)}</span>
            ${file.gitSize !== undefined ? `<span class="file-size">${this.formatSize(file.gitSize)}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  private showFileDiff(path: string): void {
    // TODO: 实现文件内容对比
    const viewer = this.querySelector('#diffViewer');
    if (!viewer) return;

    this.querySelector('#diffFilePath')!.textContent = path;
    this.querySelector('#gitContent')!.textContent = '// Git 版本内容加载中...';
    this.querySelector('#serverContent')!.textContent = '// 服务器版本内容加载中...';

    viewer.style.display = 'flex';
  }

  private closeDiffViewer(): void {
    const viewer = this.querySelector('#diffViewer');
    if (viewer) viewer.style.display = 'none';
  }

  // ==================== 工具方法 ====================

  private refresh(): void {
    if (this.activeProjectId) {
      this.startSyncCheck();
    }
  }

  private hideAllModals(): void {
    this.hideProjectModal();
    this.hideServerModal();
    this.hideMappingModal();
  }

  private updateToolbarTitle(title: string): void {
    const el = this.querySelector('#toolbarTitle');
    if (el) el.textContent = title;
  }

  private setStatus(text: string, type: 'normal' | 'loading' | 'error' | 'success' = 'normal'): void {
    const statusText = this.querySelector('#statusText');
    const statusDot = this.querySelector('#statusDot');
    if (statusText) statusText.textContent = text;
    if (statusDot) {
      statusDot.className = 'status-dot';
      if (type !== 'normal') statusDot.classList.add(type);
    }
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
