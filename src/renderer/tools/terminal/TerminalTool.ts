/**
 * SSH 终端工具 - 真实终端体验
 */

import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { getTemplate } from './template';
import { toast } from '../../components/Toast';
import { i18n } from '../../core/i18n';
import type { ServerConfig } from '../../types';

interface TabInfo {
  id: string;
  type: 'welcome' | 'terminal';
  title: string;
  serverId?: string;
  sessionId?: string;
}

interface TerminalState {
  currentInput: string;
  cursorPos: number;
  history: string[];
  historyIndex: number;
  currentDir: string;  // 当前工作目录
}

export class TerminalTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'terminal',
    title: i18n.t('tool.terminal'),
    category: ToolCategory.TERMINAL,
    icon: '🖥️',
    description: i18n.t('tool.terminalDesc'),
    keywords: ['terminal', 'ssh', 'server', 'shell'],
  };

  readonly config = TerminalTool.config;

  private servers: ServerConfig[] = [];
  private activeSessions: Map<string, string> = new Map(); // serverId -> sessionId
  private tabs: TabInfo[] = [{ id: 'welcome', type: 'welcome', title: i18n.t('terminal.welcome') }];
  private activeTabId = 'welcome';
  private editingServerId: string | null = null;
  private terminalStates: Map<string, TerminalState> = new Map();

  render(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = getTemplate();
    return container.firstElementChild as HTMLElement;
  }

  protected onMounted(): void {
    this.loadServers();
    this.renderServerList();
  }

  protected bindEvents(): void {
    // 添加连接按钮
    this.addEventListener(this.querySelector('#addServerBtn'), 'click', () => this.showServerModal());
    this.addEventListener(this.querySelector('#welcomeAddBtn'), 'click', () => this.showServerModal());
    
    // 弹窗事件
    this.addEventListener(this.querySelector('#closeModalBtn'), 'click', () => this.hideServerModal());
    this.addEventListener(this.querySelector('#testConnBtn'), 'click', () => this.testConnection());
    this.addEventListener(this.querySelector('#saveConnBtn'), 'click', () => this.saveServer());
    
    // 认证方式切换
    this.addEventListener(this.querySelector('#authType'), 'change', (e) => {
      const authType = (e.target as HTMLSelectElement).value;
      this.toggleAuthFields(authType as 'password' | 'key');
    });
    
    // 点击弹窗外部关闭
    this.addEventListener(this.querySelector('#serverModal'), 'click', (e) => {
      if ((e.target as HTMLElement).id === 'serverModal') {
        this.hideServerModal();
      }
    });
  }

  // ==================== 服务器管理 ====================

  private loadServers(): void {
    try {
      const saved = localStorage.getItem('ssh_servers');
      if (saved) {
        this.servers = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load servers:', e);
    }
  }

  private saveServers(): void {
    try {
      localStorage.setItem('ssh_servers', JSON.stringify(this.servers));
    } catch (e) {
      console.error('Failed to save servers:', e);
    }
  }

  private renderServerList(): void {
    const list = this.querySelector('#serverList');
    if (!list) return;

    if (this.servers.length === 0) {
      list.innerHTML = `<div class="empty-hint">${i18n.t('terminal.noConnections')}</div>`;
      return;
    }

    list.innerHTML = this.servers.map(server => {
      const isConnected = this.activeSessions.has(server.id!);
      
      return `
        <div class="connection-item ${isConnected ? 'connected' : ''}" data-id="${server.id}">
          <div class="conn-icon">🖥️</div>
          <div class="conn-info">
            <div class="conn-name">${this.escapeHtml(server.name)}</div>
            <div class="conn-detail">${this.escapeHtml(server.username)}@${this.escapeHtml(server.host)}:${server.port}</div>
          </div>
          <div class="conn-actions">
            <button class="conn-action-btn edit" data-action="edit" title="${i18n.t('common.edit')}">✏️</button>
            <button class="conn-action-btn delete" data-action="delete" title="${i18n.t('common.delete')}">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    // 绑定服务器项事件
    list.querySelectorAll('.connection-item').forEach(item => {
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
        } else {
          this.connectToServer(id);
        }
      });
    });
  }

  private showServerModal(server?: ServerConfig): void {
    const modal = this.querySelector('#serverModal');
    const title = this.querySelector('#modalTitle');
    if (!modal || !title) return;

    this.editingServerId = server?.id || null;
    title.textContent = server ? i18n.t('terminal.editServerTitle') : i18n.t('terminal.addServerTitle');

    // 填充表单（用户名默认 root）
    (this.querySelector('#serverName') as HTMLInputElement).value = server?.name || '';
    (this.querySelector('#serverHost') as HTMLInputElement).value = server?.host || '';
    (this.querySelector('#serverPort') as HTMLInputElement).value = String(server?.port || 22);
    (this.querySelector('#serverUser') as HTMLInputElement).value = server?.username || 'root';
    (this.querySelector('#authType') as HTMLSelectElement).value = server?.authType || 'password';
    (this.querySelector('#serverPassword') as HTMLInputElement).value = server?.password || '';
    (this.querySelector('#serverKey') as HTMLTextAreaElement).value = server?.privateKey || '';

    this.toggleAuthFields(server?.authType || 'password');
    modal.style.display = 'flex';
  }

  private hideServerModal(): void {
    const modal = this.querySelector('#serverModal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.editingServerId = null;
    
    // 清除测试状态
    const statusEl = this.querySelector('#connTestStatus');
    if (statusEl) statusEl.textContent = '';
  }

  private toggleAuthFields(authType: 'password' | 'key'): void {
    const passwordGroup = this.querySelector('#passwordGroup');
    const keyGroup = this.querySelector('#keyGroup');

    if (passwordGroup) passwordGroup.style.display = authType === 'password' ? 'block' : 'none';
    if (keyGroup) keyGroup.style.display = authType === 'key' ? 'block' : 'none';
  }

  private getFormConfig(): ServerConfig {
    const authType = (this.querySelector('#authType') as HTMLSelectElement).value as 'password' | 'key';
    
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

  private async testConnection(): Promise<void> {
    const config = this.getFormConfig();
    
    if (!config.name || !config.host || !config.username) {
      toast(i18n.t('terminal.fillCompleteInfo'));
      return;
    }

    if (config.authType === 'password' && !config.password) {
      toast(i18n.t('terminal.enterPassword'));
      return;
    }

    if (config.authType === 'key' && !config.privateKey) {
      toast(i18n.t('terminal.enterPrivateKey'));
      return;
    }

    const statusEl = this.querySelector('#connTestStatus');
    const testBtn = this.querySelector('#testConnBtn') as HTMLButtonElement;
    
    if (statusEl) {
      statusEl.textContent = i18n.t('terminal.testing');
      statusEl.style.color = '#f59e0b';
    }
    if (testBtn) testBtn.disabled = true;

    try {
      const result = await llmHub.terminal.testConnection(config);
      if (result.success) {
        if (statusEl) {
          statusEl.textContent = i18n.t('terminal.testSuccess');
          statusEl.style.color = '#22c55e';
        }
        toast(i18n.t('terminal.connectionSuccess'));
      } else {
        if (statusEl) {
          statusEl.textContent = `❌ ${result.error}`;
          statusEl.style.color = '#ef4444';
        }
        toast(`${i18n.t('terminal.connectionFailed')}: ${result.error}`);
      }
    } catch (e) {
      if (statusEl) {
        statusEl.textContent = `❌ ${e}`;
        statusEl.style.color = '#ef4444';
      }
      toast(`${i18n.t('terminal.connectionFailed')}: ${e}`);
    } finally {
      if (testBtn) testBtn.disabled = false;
    }
  }

  private saveServer(): void {
    const config = this.getFormConfig();
    
    if (!config.name || !config.host || !config.username) {
      toast(i18n.t('terminal.fillCompleteInfo'));
      return;
    }

    if (config.authType === 'password' && !config.password) {
      toast(i18n.t('terminal.enterPassword'));
      return;
    }

    if (config.authType === 'key' && !config.privateKey) {
      toast(i18n.t('terminal.enterPrivateKey'));
      return;
    }

    if (this.editingServerId) {
      // 更新现有服务器
      const index = this.servers.findIndex(s => s.id === this.editingServerId);
      if (index !== -1) {
        this.servers[index] = config;
      }
    } else {
      // 添加新服务器
      this.servers.push(config);
    }

    this.saveServers();
    this.renderServerList();
    this.hideServerModal();
    toast(i18n.t('terminal.configSaved'));
  }

  private editServer(id: string): void {
    const server = this.servers.find(s => s.id === id);
    if (server) {
      this.showServerModal(server);
    }
  }

  private deleteServer(id: string): void {
    if (!confirm(i18n.t('terminal.confirmDelete'))) {
      return;
    }

    // 断开连接
    if (this.activeSessions.has(id)) {
      const sessionId = this.activeSessions.get(id)!;
      llmHub.terminal.disconnect(sessionId).catch(console.error);
      this.activeSessions.delete(id);
    }

    this.servers = this.servers.filter(s => s.id !== id);
    this.saveServers();
    this.renderServerList();
    this.setStatus(i18n.t('terminal.ready'));
    
    toast(i18n.t('terminal.configDeleted'));
  }

  // ==================== 连接管理 ====================

  private async connectToServer(serverId: string): Promise<void> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) return;

    // 高亮选中项
    this.querySelectorAll('.connection-item').forEach(item => {
      item.classList.remove('active');
      if ((item as HTMLElement).dataset.id === serverId) {
        item.classList.add('active');
      }
    });

    // 如果已连接，直接切换到对应标签
    if (this.activeSessions.has(serverId)) {
      const tabId = `terminal_${serverId}`;
      const existingTab = this.tabs.find(t => t.id === tabId);
      if (existingTab) {
        this.switchTab(tabId);
        return;
      }
    }

    this.setStatus(`${i18n.t('terminal.connecting')} ${server.name}...`, 'loading');

    try {
      const result = await llmHub.terminal.connect(server);
      if (result.success && result.sessionId) {
        this.activeSessions.set(serverId, result.sessionId);
        this.renderServerList();
        this.openTerminalTab(server, result.sessionId);
        this.setStatus(`${i18n.t('terminal.connected')}: ${server.name}`, 'connected');
        toast(`${i18n.t('terminal.connectedTo')} ${server.name}`);
      } else {
        toast(`${i18n.t('terminal.connectionFailed')}: ${result.error}`);
        this.setStatus(i18n.t('terminal.connectionFailed'), 'error');
      }
    } catch (e) {
      toast(`${i18n.t('terminal.connectionFailed')}: ${e}`);
      this.setStatus(i18n.t('terminal.connectionFailed'), 'error');
    }
  }

  // ==================== 标签页管理 ====================

  private openTerminalTab(server: ServerConfig, sessionId: string): void {
    const tabId = `terminal_${server.id}`;
    
    // 检查是否已存在
    const existingTab = this.tabs.find(t => t.id === tabId);
    if (existingTab) {
      this.switchTab(tabId);
      return;
    }

    // 创建新标签
    const tab: TabInfo = {
      id: tabId,
      type: 'terminal',
      title: server.name,
      serverId: server.id,
      sessionId,
    };

    this.tabs.push(tab);
    this.renderTabs();
    this.createTerminalPanel(tab, server);
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

    // 聚焦终端
    const activePanel = this.querySelector(`.content-panel[data-panel="${tabId}"]`);
    if (activePanel) {
      const terminal = activePanel.querySelector('.terminal-body') as HTMLElement;
      if (terminal) {
        setTimeout(() => terminal.focus(), 100);
      }
    }
  }

  private closeTab(tabId: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    // 断开连接
    if (tab.sessionId) {
      llmHub.terminal.disconnect(tab.sessionId).catch(console.error);
      if (tab.serverId) {
        this.activeSessions.delete(tab.serverId);
        this.renderServerList();
      }
    }

    // 清理状态
    this.terminalStates.delete(tabId);

    // 移除面板
    const panel = this.querySelector(`.content-panel[data-panel="${tabId}"]`);
    if (panel) {
      panel.remove();
    }

    // 移除标签
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index !== -1) {
      this.tabs.splice(index, 1);
    }
    this.renderTabs();

    // 切换到其他标签
    if (this.activeTabId === tabId) {
      const newActiveTab = this.tabs[Math.max(0, index - 1)];
      if (newActiveTab) {
        this.switchTab(newActiveTab.id);
      }
    }

    this.setStatus(i18n.t('terminal.ready'));
  }

  // ==================== 终端面板 ====================

  private createTerminalPanel(tab: TabInfo, server: ServerConfig): void {
    const panels = this.querySelector('.content-panels');
    if (!panels) return;

    const hostShort = server.host.split('.')[0];
    const prompt = `${server.username}@${hostShort}:~$ `;

    const panel = document.createElement('div');
    panel.className = 'content-panel';
    panel.dataset.panel = tab.id;
    panel.innerHTML = `
      <div class="terminal-panel">
        <div class="terminal-header">
          <div class="terminal-title">
            <span class="user-host">${this.escapeHtml(server.username)}@${this.escapeHtml(server.host)}</span>
            <span class="separator">—</span>
            <span>bash</span>
          </div>
          <div class="terminal-actions">
            <button class="terminal-action-btn clear-btn" title="${i18n.t('terminal.clearScreen')} (Ctrl+L)">${i18n.t('terminal.clear')}</button>
            <button class="terminal-action-btn disconnect" title="${i18n.t('terminal.disconnect')}">${i18n.t('terminal.disconnectBtn')}</button>
          </div>
        </div>
        <div class="terminal-body" tabindex="0">
          <div class="terminal-content">
            <div class="output-line system">${i18n.t('terminal.connectedTo')} ${this.escapeHtml(server.name)} (${this.escapeHtml(server.host)}:${server.port})</div>
            <div class="output-line system">${i18n.t('terminal.inputHint')}</div>
          </div>
          <div class="input-line">
            <span class="prompt">${this.escapeHtml(prompt)}</span><span class="input-text"></span><span class="cursor"> </span>
          </div>
        </div>
      </div>
    `;

    panels.appendChild(panel);

    // 初始化终端状态
    this.terminalStates.set(tab.id, {
      currentInput: '',
      cursorPos: 0,
      history: [],
      historyIndex: -1,
      currentDir: '~',  // 初始目录
    });

    // 绑定事件
    const terminalBody = panel.querySelector('.terminal-body') as HTMLElement;
    const clearBtn = panel.querySelector('.clear-btn');
    const disconnectBtn = panel.querySelector('.disconnect');

    // 键盘输入 - keydown 处理特殊键
    terminalBody?.addEventListener('keydown', (e) => {
      this.handleKeyDown(e, tab, server, terminalBody);
    });

    // keypress 处理字符输入（备用，确保特殊字符如 / 能被捕获）
    terminalBody?.addEventListener('keypress', (e) => {
      // 如果 keydown 没有处理，这里作为备份
      const state = this.terminalStates.get(tab.id);
      if (!state) return;
      
      // 只处理可打印字符
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        state.currentInput = state.currentInput.slice(0, state.cursorPos) + e.key + state.currentInput.slice(state.cursorPos);
        state.cursorPos++;
        this.updateInputDisplay(terminalBody, state, server);
      }
    });

    // 点击聚焦
    terminalBody?.addEventListener('click', () => {
      terminalBody.focus();
    });

    // 清屏
    clearBtn?.addEventListener('click', () => {
      this.clearTerminal(tab.id, terminalBody, server);
    });

    // 断开连接
    disconnectBtn?.addEventListener('click', () => {
      this.closeTab(tab.id);
    });

    // 光标闪烁
    this.startCursorBlink(terminalBody);
  }

  private startCursorBlink(terminalBody: HTMLElement): void {
    const cursor = terminalBody.querySelector('.cursor') as HTMLElement;
    if (!cursor) return;

    let visible = true;
    const interval = setInterval(() => {
      if (!document.body.contains(terminalBody)) {
        clearInterval(interval);
        return;
      }
      visible = !visible;
      cursor.classList.toggle('blink-off', !visible);
    }, 530);
  }

  private handleKeyDown(e: KeyboardEvent, tab: TabInfo, server: ServerConfig, terminalBody: HTMLElement): void {
    const state = this.terminalStates.get(tab.id);
    if (!state) return;

    e.preventDefault();

    if (e.key === 'Enter') {
      // 执行命令
      const command = state.currentInput.trim();
      const prompt = this.getPrompt(server, state.currentDir);
      this.appendOutput(terminalBody, `${prompt}${state.currentInput}`, 'command');
      state.currentInput = '';
      state.cursorPos = 0;
      
      if (command) {
        state.history.push(command);
        state.historyIndex = state.history.length;
        this.executeCommand(tab, command, terminalBody, server);
      }
      
      this.updateInputDisplay(terminalBody, state, server);
    } else if (e.key === 'Backspace') {
      if (state.cursorPos > 0) {
        state.currentInput = state.currentInput.slice(0, state.cursorPos - 1) + state.currentInput.slice(state.cursorPos);
        state.cursorPos--;
        this.updateInputDisplay(terminalBody, state, server);
      }
    } else if (e.key === 'Delete') {
      if (state.cursorPos < state.currentInput.length) {
        state.currentInput = state.currentInput.slice(0, state.cursorPos) + state.currentInput.slice(state.cursorPos + 1);
        this.updateInputDisplay(terminalBody, state, server);
      }
    } else if (e.key === 'ArrowLeft') {
      if (state.cursorPos > 0) {
        state.cursorPos--;
        this.updateInputDisplay(terminalBody, state, server);
      }
    } else if (e.key === 'ArrowRight') {
      if (state.cursorPos < state.currentInput.length) {
        state.cursorPos++;
        this.updateInputDisplay(terminalBody, state, server);
      }
    } else if (e.key === 'ArrowUp') {
      // 历史命令向上
      if (state.historyIndex > 0) {
        state.historyIndex--;
        state.currentInput = state.history[state.historyIndex] || '';
        state.cursorPos = state.currentInput.length;
        this.updateInputDisplay(terminalBody, state, server);
      }
    } else if (e.key === 'ArrowDown') {
      // 历史命令向下
      if (state.historyIndex < state.history.length) {
        state.historyIndex++;
        state.currentInput = state.history[state.historyIndex] || '';
        state.cursorPos = state.currentInput.length;
        this.updateInputDisplay(terminalBody, state, server);
      }
    } else if (e.key === 'Home') {
      state.cursorPos = 0;
      this.updateInputDisplay(terminalBody, state, server);
    } else if (e.key === 'End') {
      state.cursorPos = state.currentInput.length;
      this.updateInputDisplay(terminalBody, state, server);
    } else if (e.key === 'l' && e.ctrlKey) {
      // Ctrl+L 清屏
      this.clearTerminal(tab.id, terminalBody, server);
    } else if (e.key === 'c' && e.ctrlKey) {
      // Ctrl+C 取消当前输入
      const prompt = this.getPrompt(server, state.currentDir);
      this.appendOutput(terminalBody, `${prompt}${state.currentInput}^C`, 'command');
      state.currentInput = '';
      state.cursorPos = 0;
      this.updateInputDisplay(terminalBody, state, server);
    } else if (e.key === 'u' && e.ctrlKey) {
      // Ctrl+U 清除当前行
      state.currentInput = '';
      state.cursorPos = 0;
      this.updateInputDisplay(terminalBody, state, server);
    } else if (e.key === 'a' && e.ctrlKey) {
      // Ctrl+A 移到行首
      state.cursorPos = 0;
      this.updateInputDisplay(terminalBody, state, server);
    } else if (e.key === 'e' && e.ctrlKey) {
      // Ctrl+E 移到行尾
      state.cursorPos = state.currentInput.length;
      this.updateInputDisplay(terminalBody, state, server);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // 普通字符输入
      state.currentInput = state.currentInput.slice(0, state.cursorPos) + e.key + state.currentInput.slice(state.cursorPos);
      state.cursorPos++;
      this.updateInputDisplay(terminalBody, state, server);
    }
  }

  private updateInputDisplay(terminalBody: HTMLElement, state: TerminalState, server: ServerConfig): void {
    const inputText = terminalBody.querySelector('.input-text');
    const cursor = terminalBody.querySelector('.cursor') as HTMLElement;
    const promptEl = terminalBody.querySelector('.prompt');
    
    // 更新提示符
    if (promptEl) {
      promptEl.textContent = this.getPrompt(server, state.currentDir);
    }
    
    if (inputText) {
      const before = state.currentInput.slice(0, state.cursorPos);
      const after = state.currentInput.slice(state.cursorPos);
      inputText.textContent = before;
      
      // 光标显示
      if (cursor) {
        // 光标显示当前位置的字符，如果没有则显示空格
        const cursorChar = after.length > 0 ? after[0] : ' ';
        cursor.textContent = cursorChar;
        cursor.innerHTML = cursorChar === ' ' ? '&nbsp;' : this.escapeHtml(cursorChar);
        
        // 创建或更新光标后的文字
        let afterSpan = terminalBody.querySelector('.after-cursor') as HTMLElement;
        if (!afterSpan) {
          afterSpan = document.createElement('span');
          afterSpan.className = 'after-cursor';
          cursor.parentNode?.insertBefore(afterSpan, cursor.nextSibling);
        }
        afterSpan.textContent = after.slice(1);
      }
    }

    // 滚动到底部
    terminalBody.scrollTop = terminalBody.scrollHeight;
  }

  private getPrompt(server: ServerConfig, currentDir: string): string {
    const hostShort = server.host.split('.')[0];
    return `${server.username}@${hostShort}:${currentDir}$ `;
  }

  private appendOutput(terminalBody: HTMLElement, text: string, type: 'normal' | 'command' | 'error' | 'system' = 'normal'): void {
    const content = terminalBody.querySelector('.terminal-content');
    if (!content) return;

    const line = document.createElement('div');
    line.className = 'output-line';
    
    if (type === 'command') {
      // 命令行：提示符绿色，命令橙色
      const dollarIndex = text.indexOf('$ ');
      if (dollarIndex !== -1) {
        const prompt = text.slice(0, dollarIndex + 2);
        const cmd = text.slice(dollarIndex + 2);
        line.innerHTML = `<span class="prompt-text">${this.escapeHtml(prompt)}</span><span class="cmd-text">${this.escapeHtml(cmd)}</span>`;
      } else {
        line.textContent = text;
        line.classList.add('command');
      }
    } else if (type === 'normal') {
      // 解析 ls -l 输出：目录显示蓝色
      // 目录行以 d 开头，如 drwxr-xr-x
      if (/^d[rwx-]{9}/.test(text)) {
        // 目录行：最后一个字段是目录名，显示蓝色
        const parts = text.split(/\s+/);
        if (parts.length >= 9) {
          const dirName = parts.slice(8).join(' ');
          const prefix = parts.slice(0, 8).join(' ') + ' ';
          line.innerHTML = `${this.escapeHtml(prefix)}<span class="dir-name">${this.escapeHtml(dirName)}</span>`;
        } else {
          line.textContent = text;
        }
      } else {
        line.textContent = text;
      }
    } else {
      line.textContent = text;
      line.classList.add(type);
    }
    
    content.appendChild(line);

    // 滚动到底部
    terminalBody.scrollTop = terminalBody.scrollHeight;
  }

  private async executeCommand(tab: TabInfo, command: string, terminalBody: HTMLElement, server: ServerConfig): Promise<void> {
    // 处理本地命令
    if (command === 'clear' || command === 'cls') {
      this.clearTerminal(tab.id, terminalBody, server);
      return;
    }

    const state = this.terminalStates.get(tab.id);

    // 执行远程命令
    try {
      const result = await llmHub.terminal.execute(tab.sessionId!, command);
      if (result.success && result.output !== undefined) {
        if (result.output) {
          const lines = result.output.split('\n');
          lines.forEach(line => {
            this.appendOutput(terminalBody, line, 'normal');
          });
        }
      } else if (result.error) {
        this.appendOutput(terminalBody, result.error, 'error');
      }

      // 执行命令后获取当前目录
      if (state) {
        await this.updateCurrentDir(tab, state, terminalBody, server);
      }
    } catch (e) {
      this.appendOutput(terminalBody, `${i18n.t('terminal.executeFailed')}: ${e}`, 'error');
    }
  }

  private async updateCurrentDir(tab: TabInfo, state: TerminalState, terminalBody: HTMLElement, server: ServerConfig): Promise<void> {
    try {
      const result = await llmHub.terminal.execute(tab.sessionId!, 'pwd');
      if (result.success && result.output) {
        const dir = result.output.trim();
        // 将 /root 替换为 ~，其他路径保持原样
        const homeDir = `/home/${server.username}`;
        if (dir === `/root` || dir === homeDir) {
          state.currentDir = '~';
        } else if (dir.startsWith(`/root/`)) {
          state.currentDir = '~' + dir.slice(5);
        } else if (dir.startsWith(homeDir + '/')) {
          state.currentDir = '~' + dir.slice(homeDir.length);
        } else {
          state.currentDir = dir;
        }
        this.updateInputDisplay(terminalBody, state, server);
      }
    } catch (e) {
      // 忽略错误，保持当前目录不变
    }
  }

  private clearTerminal(tabId: string, terminalBody: HTMLElement, server: ServerConfig): void {
    const content = terminalBody.querySelector('.terminal-content');
    if (content) {
      content.innerHTML = '';
    }
    
    // 重置输入
    const state = this.terminalStates.get(tabId);
    if (state) {
      state.currentInput = '';
      state.cursorPos = 0;
      this.updateInputDisplay(terminalBody, state, server);
    }
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
