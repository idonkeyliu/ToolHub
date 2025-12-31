import { i18n } from '../../core/i18n';

export const getTemplate = () => `
<div class="mongo-wrap">
  <div class="mongo-container">
    <!-- 左侧：连接列表和集合浏览 -->
    <div class="mongo-sidebar">
      <!-- 连接管理 -->
      <div class="connection-panel">
        <div class="panel-header">
          <h3>${i18n.t('mongo.connections')}</h3>
          <button class="add-conn-btn" id="addConnectionBtn" title="${i18n.t('mongo.addConnection')}">+</button>
        </div>
        <div class="connection-list" id="connectionList">
          <div class="empty-hint">${i18n.t('mongo.noConnections')}</div>
        </div>
      </div>
      
      <!-- 数据库/集合浏览面板 -->
      <div class="collections-panel" id="collectionsPanel" style="display: none;">
        <div class="panel-header">
          <h3 id="collectionsPanelTitle">${i18n.t('mongo.databases')}</h3>
          <div class="panel-actions">
            <button class="action-btn" id="refreshCollectionsBtn" title="${i18n.t('mongo.refresh')}">↻</button>
          </div>
        </div>
        <!-- 搜索框 -->
        <div class="search-box">
          <input type="text" id="collectionSearchInput" placeholder="${i18n.t('mongo.searchDbColl')}">
          <button class="search-btn" id="collectionSearchBtn">🔍</button>
        </div>
        <!-- 数据库/集合树 -->
        <div class="tree-container" id="treeContainer">
          <div class="empty-hint">${i18n.t('mongo.selectConnFirst')}</div>
        </div>
      </div>
      
      <!-- 状态栏 -->
      <div class="sidebar-status" id="sidebarStatus">
        <span class="status-dot" id="statusDot"></span>
        <span class="status-text" id="statusText">${i18n.t('mongo.ready')}</span>
      </div>
    </div>
    
    <!-- 右侧：主内容区 -->
    <div class="mongo-main">
      <!-- 顶部标签栏 -->
      <div class="tab-bar" id="tabBar">
        <div class="tab active" data-tab="welcome">
          <span>${i18n.t('mongo.welcome')}</span>
        </div>
      </div>
      
      <!-- 内容区 -->
      <div class="content-panels">
        <!-- 欢迎页 -->
        <div class="content-panel active" data-panel="welcome">
          <div class="welcome-content">
            <div class="welcome-icon">🍃</div>
            <h2>${i18n.t('mongo.toolTitle')}</h2>
            <p>${i18n.t('mongo.toolDesc')}</p>
            <div class="feature-list">
              <div class="feature-item">
                <span class="feature-icon">📝</span>
                <span>${i18n.t('mongo.feature1')}</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🗂️</span>
                <span>${i18n.t('mongo.feature2')}</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📄</span>
                <span>${i18n.t('mongo.feature3')}</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🔍</span>
                <span>${i18n.t('mongo.feature4')}</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📊</span>
                <span>${i18n.t('mongo.feature5')}</span>
              </div>
            </div>
            <button class="start-btn" id="welcomeAddBtn">+ ${i18n.t('mongo.addMongoConnection')}</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 连接配置弹窗 -->
    <div class="modal-overlay" id="connectionModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="modalTitle">${i18n.t('mongo.addMongoConnection')}</h3>
          <button class="modal-close" id="closeModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>${i18n.t('mongo.connName')}</label>
            <input type="text" id="connName" placeholder="${i18n.t('mongo.connNamePlaceholder')}">
          </div>
          <div class="form-group">
            <label>${i18n.t('mongo.connMode')}</label>
            <select id="connMode">
              <option value="standard">${i18n.t('mongo.standardConn')}</option>
              <option value="uri">${i18n.t('mongo.uriConn')}</option>
            </select>
          </div>
          <div id="standardConnFields">
            <div class="form-group">
              <label>${i18n.t('mongo.host')}</label>
              <input type="text" id="connHost" placeholder="localhost" value="localhost">
            </div>
            <div class="form-group">
              <label>${i18n.t('mongo.port')}</label>
              <input type="number" id="connPort" placeholder="27017" value="27017">
            </div>
            <div class="form-group">
              <label>${i18n.t('mongo.username')}</label>
              <input type="text" id="connUser" placeholder="${i18n.t('mongo.usernamePlaceholder')}">
            </div>
            <div class="form-group">
              <label>${i18n.t('mongo.password')}</label>
              <input type="password" id="connPassword" placeholder="${i18n.t('mongo.passwordPlaceholder')}">
            </div>
            <div class="form-group">
              <label>${i18n.t('mongo.authDb')}</label>
              <input type="text" id="connAuthDB" placeholder="admin" value="admin">
            </div>
          </div>
          <div id="uriConnFields" style="display: none;">
            <div class="form-group">
              <label>${i18n.t('mongo.connString')}</label>
              <textarea id="connUri" placeholder="mongodb://username:password@host:port/database?options"></textarea>
            </div>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="connTLS"> ${i18n.t('mongo.enableTLS')}
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <span class="conn-test-status" id="connTestStatus"></span>
          <button class="btn-secondary" id="testConnBtn">${i18n.t('mongo.testConnection')}</button>
          <button class="btn-primary" id="saveConnBtn">${i18n.t('mongo.save')}</button>
        </div>
      </div>
    </div>
    
    <!-- 新增文档弹窗 -->
    <div class="modal-overlay" id="addDocModal" style="display: none;">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3>${i18n.t('mongo.newDocument')}</h3>
          <button class="modal-close" id="closeAddDocModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>${i18n.t('mongo.docJson')}</label>
            <textarea id="newDocContent" placeholder='{"field": "value"}'></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="cancelAddDocBtn">${i18n.t('mongo.cancel')}</button>
          <button class="btn-primary" id="confirmAddDocBtn">${i18n.t('mongo.insert')}</button>
        </div>
      </div>
    </div>
    
    <!-- 编辑文档弹窗 -->
    <div class="modal-overlay" id="editDocModal" style="display: none;">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3>${i18n.t('mongo.editDocument')}</h3>
          <button class="modal-close" id="closeEditDocModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>${i18n.t('mongo.docJson')}</label>
            <textarea id="editDocContent"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="cancelEditDocBtn">${i18n.t('mongo.cancel')}</button>
          <button class="btn-primary" id="confirmEditDocBtn">${i18n.t('mongo.save')}</button>
        </div>
      </div>
    </div>
  </div>
</div>
`;

// 保持向后兼容
export const template = getTemplate();
