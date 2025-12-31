import { i18n } from '../../core/i18n';

export const getTemplate = () => `
<div class="terminal-wrap">
  <div class="terminal-container">
    <!-- 左侧：连接列表 -->
    <div class="terminal-sidebar">
      <!-- 连接管理 -->
      <div class="connection-panel">
        <div class="panel-header">
          <h3>${i18n.t('terminal.connections')}</h3>
          <button class="add-conn-btn" id="addServerBtn" title="${i18n.t('terminal.addConnection')}">+</button>
        </div>
        <div class="connection-list" id="serverList">
          <div class="empty-hint">${i18n.t('terminal.noConnections')}</div>
        </div>
      </div>
      
      <!-- 状态栏 -->
      <div class="sidebar-status" id="sidebarStatus">
        <span class="status-dot" id="statusDot"></span>
        <span class="status-text" id="statusText">${i18n.t('terminal.ready')}</span>
      </div>
    </div>
    
    <!-- 右侧：主内容区 -->
    <div class="terminal-main">
      <!-- 顶部标签栏 -->
      <div class="tab-bar" id="tabBar">
        <div class="tab active" data-tab="welcome">
          <span>${i18n.t('terminal.welcome')}</span>
        </div>
      </div>
      
      <!-- 内容区 -->
      <div class="content-panels">
        <!-- 欢迎页 -->
        <div class="content-panel active" data-panel="welcome">
          <div class="welcome-content">
            <div class="welcome-icon">🖥️</div>
            <h2>${i18n.t('terminal.title')}</h2>
            <p>${i18n.t('terminal.description')}</p>
            <div class="feature-list">
              <div class="feature-item">
                <span class="feature-icon">🔐</span>
                <span>${i18n.t('terminal.feature1')}</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📋</span>
                <span>${i18n.t('terminal.feature2')}</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">⚡</span>
                <span>${i18n.t('terminal.feature3')}</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📜</span>
                <span>${i18n.t('terminal.feature4')}</span>
              </div>
            </div>
            <button class="start-btn" id="welcomeAddBtn">${i18n.t('terminal.addServer')}</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 连接配置弹窗 -->
    <div class="modal-overlay" id="serverModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="modalTitle">${i18n.t('terminal.addServerTitle')}</h3>
          <button class="modal-close" id="closeModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>${i18n.t('terminal.connName')}</label>
            <input type="text" id="serverName" placeholder="${i18n.t('terminal.connNamePlaceholder')}">
          </div>
          <div class="form-group">
            <label>${i18n.t('terminal.host')}</label>
            <input type="text" id="serverHost" placeholder="${i18n.t('terminal.hostPlaceholder')}">
          </div>
          <div class="form-row">
            <div class="form-group" style="flex: 1;">
              <label>${i18n.t('terminal.port')}</label>
              <input type="number" id="serverPort" placeholder="22" value="22">
            </div>
            <div class="form-group" style="flex: 2;">
              <label>${i18n.t('terminal.username')}</label>
              <input type="text" id="serverUser" placeholder="root" value="root">
            </div>
          </div>
          <div class="form-group">
            <label>${i18n.t('terminal.authType')}</label>
            <select id="authType">
              <option value="password">${i18n.t('terminal.password')}</option>
              <option value="key">${i18n.t('terminal.privateKey')}</option>
            </select>
          </div>
          <div class="form-group" id="passwordGroup">
            <label>${i18n.t('terminal.password')}</label>
            <input type="password" id="serverPassword" placeholder="${i18n.t('terminal.passwordPlaceholder')}">
          </div>
          <div class="form-group" id="keyGroup" style="display: none;">
            <label>${i18n.t('terminal.privateKey')}</label>
            <textarea id="serverKey" placeholder="${i18n.t('terminal.privateKeyPlaceholder')}" rows="4"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <span class="conn-test-status" id="connTestStatus"></span>
          <button class="btn-secondary" id="testConnBtn">${i18n.t('terminal.testConnection')}</button>
          <button class="btn-primary" id="saveConnBtn">${i18n.t('terminal.save')}</button>
        </div>
      </div>
    </div>
  </div>
</div>
`;
