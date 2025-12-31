import { i18n } from '../../core/i18n';

export const getTemplate = () => `
<div class="redis-wrap">
  <div class="redis-container">
    <!-- 左侧：连接列表和键浏览 -->
    <div class="redis-sidebar">
      <!-- 连接管理 -->
      <div class="connection-panel">
        <div class="panel-header">
          <h3>${i18n.t('redis.connections')}</h3>
          <button class="add-conn-btn" id="addConnectionBtn" title="${i18n.t('redis.addConnection')}">+</button>
        </div>
        <div class="connection-list" id="connectionList">
          <div class="empty-hint">${i18n.t('redis.noConnections')}</div>
        </div>
      </div>
      
      <!-- 键浏览面板 -->
      <div class="keys-panel" id="keysPanel" style="display: none;">
        <div class="panel-header">
          <h3 id="keysPanelTitle">${i18n.t('redis.keyList')}</h3>
          <div class="panel-actions">
            <button class="action-btn" id="addKeyBtn" title="${i18n.t('redis.addKey')}">+</button>
            <button class="action-btn" id="refreshKeysBtn" title="${i18n.t('redis.refresh')}">↻</button>
          </div>
        </div>
        <!-- 搜索框 -->
        <div class="search-box">
          <input type="text" id="keySearchInput" placeholder="${i18n.t('redis.searchKeys')}">
          <button class="search-btn" id="keySearchBtn">🔍</button>
        </div>
        <!-- 数据库选择 -->
        <div class="db-selector">
          <label>${i18n.t('redis.selectDb')}:</label>
          <select id="dbSelect">
            ${Array.from({length: 16}, (_, i) => `<option value="${i}">DB ${i}</option>`).join('')}
          </select>
          <span class="key-count" id="keyCount">0 keys</span>
        </div>
        <!-- 键列表 -->
        <div class="keys-container" id="keysContainer">
          <div class="empty-hint">${i18n.t('redis.selectConnFirst')}</div>
        </div>
      </div>
      
      <!-- 状态栏 -->
      <div class="sidebar-status" id="sidebarStatus">
        <span class="status-dot" id="statusDot"></span>
        <span class="status-text" id="statusText">${i18n.t('redis.ready')}</span>
      </div>
    </div>
    
    <!-- 右侧：主内容区 -->
    <div class="redis-main">
      <!-- 顶部标签栏 -->
      <div class="tab-bar" id="tabBar">
        <div class="tab active" data-tab="welcome">
          <span>${i18n.t('redis.welcome')}</span>
        </div>
      </div>
      
      <!-- 内容区 -->
      <div class="content-panels">
        <!-- 欢迎页 -->
        <div class="content-panel active" data-panel="welcome">
          <div class="welcome-content">
            <div class="welcome-icon">🔴</div>
            <h2>${i18n.t('redis.toolTitle')}</h2>
            <p>${i18n.t('redis.toolDesc')}</p>
            <div class="feature-list">
              <div class="feature-item">
                <span class="feature-icon">📝</span>
                <span>${i18n.t('redis.feature1')}</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🔍</span>
                <span>${i18n.t('redis.feature2')}</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📊</span>
                <span>${i18n.t('redis.feature3')}</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">⚡</span>
                <span>${i18n.t('redis.feature4')}</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">⏰</span>
                <span>${i18n.t('redis.feature5')}</span>
              </div>
            </div>
            <button class="start-btn" id="welcomeAddBtn">+ ${i18n.t('redis.addRedisConnection')}</button>
          </div>
        </div>
        
        <!-- CLI 面板（动态创建） -->
      </div>
    </div>
    
    <!-- 连接配置弹窗 -->
    <div class="modal-overlay" id="connectionModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="modalTitle">${i18n.t('redis.addRedisConnection')}</h3>
          <button class="modal-close" id="closeModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>${i18n.t('redis.connName')}</label>
            <input type="text" id="connName" placeholder="${i18n.t('redis.connNamePlaceholder')}">
          </div>
          <div class="form-group">
            <label>${i18n.t('redis.host')}</label>
            <input type="text" id="connHost" placeholder="localhost" value="localhost">
          </div>
          <div class="form-group">
            <label>${i18n.t('redis.port')}</label>
            <input type="number" id="connPort" placeholder="6379" value="6379">
          </div>
          <div class="form-group">
            <label>${i18n.t('redis.password')}</label>
            <input type="password" id="connPassword" placeholder="${i18n.t('redis.passwordPlaceholder')}">
          </div>
          <div class="form-group">
            <label>${i18n.t('redis.defaultDb')}</label>
            <select id="connDatabase">
              ${Array.from({length: 16}, (_, i) => `<option value="${i}"${i === 0 ? ' selected' : ''}>DB ${i}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="connTLS"> ${i18n.t('redis.enableTLS')}
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <span class="conn-test-status" id="connTestStatus"></span>
          <button class="btn-secondary" id="testConnBtn">${i18n.t('redis.testConnection')}</button>
          <button class="btn-primary" id="saveConnBtn">${i18n.t('redis.save')}</button>
        </div>
      </div>
    </div>
    
    <!-- 新增键弹窗 -->
    <div class="modal-overlay" id="addKeyModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${i18n.t('redis.newKey')}</h3>
          <button class="modal-close" id="closeAddKeyModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>${i18n.t('redis.keyName')}</label>
            <input type="text" id="newKeyName" placeholder="key:name">
          </div>
          <div class="form-group">
            <label>${i18n.t('redis.keyType')}</label>
            <select id="newKeyType">
              <option value="string">String</option>
              <option value="hash">Hash</option>
              <option value="list">List</option>
              <option value="set">Set</option>
              <option value="zset">Sorted Set</option>
            </select>
          </div>
          <div class="form-group" id="newKeyValueGroup">
            <label>${i18n.t('redis.keyValue')}</label>
            <textarea id="newKeyValue" placeholder="${i18n.t('redis.enterValue')}"></textarea>
          </div>
          <div class="form-group">
            <label>${i18n.t('redis.ttl')}</label>
            <input type="number" id="newKeyTTL" value="-1">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="cancelAddKeyBtn">${i18n.t('redis.cancel')}</button>
          <button class="btn-primary" id="confirmAddKeyBtn">${i18n.t('redis.create')}</button>
        </div>
      </div>
    </div>
  </div>
</div>
`;

// 保持向后兼容
export const template = getTemplate();
