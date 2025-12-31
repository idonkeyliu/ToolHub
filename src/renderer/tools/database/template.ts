import { i18n } from '../../core/i18n';

export const getTemplate = () => `
<div class="database-wrap">
  <div class="database-container">
    <!-- 左侧：连接列表和数据库浏览 -->
    <div class="database-sidebar">
      <!-- 连接管理 -->
      <div class="connection-panel">
        <div class="panel-header">
          <h3>${i18n.t('db.connections')}</h3>
          <button class="add-conn-btn" id="addConnectionBtn" title="${i18n.t('db.addConnection')}">+</button>
        </div>
        <div class="connection-list" id="connectionList">
          <div class="empty-hint">${i18n.t('db.noConnections')}</div>
        </div>
      </div>
      
      <!-- 数据库/表树形结构 -->
      <div class="tree-panel" id="treePanel" style="display: none;">
        <div class="panel-header">
          <h3 id="treePanelTitle">${i18n.t('db.database')}</h3>
          <button class="refresh-btn" id="refreshTreeBtn" title="${i18n.t('db.refresh')}">↻</button>
        </div>
        <div class="tree-container" id="treeContainer"></div>
      </div>
      
      <!-- 状态栏（移到左侧边栏底部） -->
      <div class="sidebar-status" id="sidebarStatus">
        <span class="status-dot" id="statusDot"></span>
        <span class="status-text" id="statusText">${i18n.t('db.ready')}</span>
      </div>
    </div>
    
    <!-- 右侧：主内容区 -->
    <div class="database-main">
      <!-- 顶部标签栏 -->
      <div class="tab-bar" id="tabBar">
        <div class="tab active" data-tab="welcome">
          <span>${i18n.t('db.welcome')}</span>
        </div>
      </div>
      
      <!-- 内容区 -->
      <div class="content-panels">
        <!-- 欢迎页 -->
        <div class="content-panel active" data-panel="welcome">
          <div class="welcome-content">
            <div class="welcome-icon">🗄️</div>
            <h2>${i18n.t('db.toolTitle')}</h2>
            <p>${i18n.t('db.toolDesc')}</p>
            <div class="feature-list">
              <div class="feature-item">
                <span class="feature-icon">📝</span>
                <span>${i18n.t('db.feature1')}</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🔍</span>
                <span>${i18n.t('db.feature2')}</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">⚡</span>
                <span>${i18n.t('db.feature3')}</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">✏️</span>
                <span>${i18n.t('db.feature4')}</span>
              </div>
            </div>
            <button class="start-btn" id="welcomeAddBtn">+ ${i18n.t('db.addDbConnection')}</button>
          </div>
        </div>
        
        <!-- 查询面板模板（动态创建） -->
      </div>
    </div>
    
    <!-- 连接配置弹窗 -->
    <div class="modal-overlay" id="connectionModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="modalTitle">${i18n.t('db.addDbConnection')}</h3>
          <button class="modal-close" id="closeModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>${i18n.t('db.connName')}</label>
            <input type="text" id="connName" placeholder="${i18n.t('db.connNamePlaceholder')}">
          </div>
          <div class="form-group">
            <label>${i18n.t('db.dbType')}</label>
            <select id="connType">
              <option value="mysql">MySQL</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="sqlite">SQLite</option>
            </select>
          </div>
          <div class="form-group" id="hostGroup">
            <label>${i18n.t('db.host')}</label>
            <input type="text" id="connHost" placeholder="localhost">
          </div>
          <div class="form-group" id="portGroup">
            <label>${i18n.t('db.port')}</label>
            <input type="number" id="connPort" placeholder="3306">
          </div>
          <div class="form-group" id="userGroup">
            <label>${i18n.t('db.username')}</label>
            <input type="text" id="connUser" placeholder="root">
          </div>
          <div class="form-group" id="passwordGroup">
            <label>${i18n.t('db.password')}</label>
            <input type="password" id="connPassword" placeholder="${i18n.t('db.password')}">
          </div>
          <div class="form-group" id="databaseGroup">
            <label>${i18n.t('db.defaultDb')}</label>
            <input type="text" id="connDatabase" placeholder="${i18n.t('db.defaultDbPlaceholder')}">
          </div>
          <div class="form-group" id="sqlitePathGroup" style="display: none;">
            <label>${i18n.t('db.sqlitePath')}</label>
            <input type="text" id="connSqlitePath" placeholder="/path/to/database.db">
          </div>
        </div>
        <div class="modal-footer">
          <span class="conn-test-status" id="connTestStatus"></span>
          <button class="btn-secondary" id="testConnBtn">${i18n.t('db.testConnection')}</button>
          <button class="btn-primary" id="saveConnBtn">${i18n.t('db.save')}</button>
        </div>
      </div>
    </div>
    
    </div>
  </div>
</div>
`;

// 保持向后兼容
export const template = getTemplate();
