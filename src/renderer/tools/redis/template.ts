export const template = `
<div class="redis-wrap">
  <div class="redis-container">
    <!-- 左侧：连接列表和键浏览 -->
    <div class="redis-sidebar">
      <!-- 连接管理 -->
      <div class="connection-panel">
        <div class="panel-header">
          <h3>Redis 连接</h3>
          <button class="add-conn-btn" id="addConnectionBtn" title="添加连接">+</button>
        </div>
        <div class="connection-list" id="connectionList">
          <div class="empty-hint">暂无连接配置</div>
        </div>
      </div>
      
      <!-- 键浏览面板 -->
      <div class="keys-panel" id="keysPanel" style="display: none;">
        <div class="panel-header">
          <h3 id="keysPanelTitle">键列表</h3>
          <div class="panel-actions">
            <button class="action-btn" id="addKeyBtn" title="新增键">+</button>
            <button class="action-btn" id="refreshKeysBtn" title="刷新">↻</button>
          </div>
        </div>
        <!-- 搜索框 -->
        <div class="search-box">
          <input type="text" id="keySearchInput" placeholder="搜索键名 (支持 * 通配符)">
          <button class="search-btn" id="keySearchBtn">🔍</button>
        </div>
        <!-- 数据库选择 -->
        <div class="db-selector">
          <label>数据库:</label>
          <select id="dbSelect">
            ${Array.from({length: 16}, (_, i) => `<option value="${i}">DB ${i}</option>`).join('')}
          </select>
          <span class="key-count" id="keyCount">0 keys</span>
        </div>
        <!-- 键列表 -->
        <div class="keys-container" id="keysContainer">
          <div class="empty-hint">选择连接后显示键列表</div>
        </div>
      </div>
      
      <!-- 状态栏 -->
      <div class="sidebar-status" id="sidebarStatus">
        <span class="status-dot" id="statusDot"></span>
        <span class="status-text" id="statusText">就绪</span>
      </div>
    </div>
    
    <!-- 右侧：主内容区 -->
    <div class="redis-main">
      <!-- 顶部标签栏 -->
      <div class="tab-bar" id="tabBar">
        <div class="tab active" data-tab="welcome">
          <span>欢迎</span>
        </div>
      </div>
      
      <!-- 内容区 -->
      <div class="content-panels">
        <!-- 欢迎页 -->
        <div class="content-panel active" data-panel="welcome">
          <div class="welcome-content">
            <div class="welcome-icon">🔴</div>
            <h2>Redis 管理工具</h2>
            <p>高效管理 Redis 数据库</p>
            <div class="feature-list">
              <div class="feature-item">
                <span class="feature-icon">📝</span>
                <span>管理多个 Redis 连接配置</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🔍</span>
                <span>浏览和搜索键值数据</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📊</span>
                <span>支持 String/Hash/List/Set/ZSet</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">⚡</span>
                <span>执行 Redis 命令</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">⏰</span>
                <span>TTL 管理和监控</span>
              </div>
            </div>
            <button class="start-btn" id="welcomeAddBtn">+ 添加 Redis 连接</button>
          </div>
        </div>
        
        <!-- CLI 面板（动态创建） -->
      </div>
    </div>
    
    <!-- 连接配置弹窗 -->
    <div class="modal-overlay" id="connectionModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="modalTitle">添加 Redis 连接</h3>
          <button class="modal-close" id="closeModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>连接名称</label>
            <input type="text" id="connName" placeholder="例如：本地开发">
          </div>
          <div class="form-group">
            <label>主机地址</label>
            <input type="text" id="connHost" placeholder="localhost" value="localhost">
          </div>
          <div class="form-group">
            <label>端口</label>
            <input type="number" id="connPort" placeholder="6379" value="6379">
          </div>
          <div class="form-group">
            <label>密码（可选）</label>
            <input type="password" id="connPassword" placeholder="留空表示无密码">
          </div>
          <div class="form-group">
            <label>默认数据库</label>
            <select id="connDatabase">
              ${Array.from({length: 16}, (_, i) => `<option value="${i}"${i === 0 ? ' selected' : ''}>DB ${i}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="connTLS"> 启用 TLS/SSL
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <span class="conn-test-status" id="connTestStatus"></span>
          <button class="btn-secondary" id="testConnBtn">测试连接</button>
          <button class="btn-primary" id="saveConnBtn">保存</button>
        </div>
      </div>
    </div>
    
    <!-- 新增键弹窗 -->
    <div class="modal-overlay" id="addKeyModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>新增键</h3>
          <button class="modal-close" id="closeAddKeyModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>键名</label>
            <input type="text" id="newKeyName" placeholder="key:name">
          </div>
          <div class="form-group">
            <label>类型</label>
            <select id="newKeyType">
              <option value="string">String</option>
              <option value="hash">Hash</option>
              <option value="list">List</option>
              <option value="set">Set</option>
              <option value="zset">Sorted Set</option>
            </select>
          </div>
          <div class="form-group" id="newKeyValueGroup">
            <label>值</label>
            <textarea id="newKeyValue" placeholder="输入值"></textarea>
          </div>
          <div class="form-group">
            <label>TTL（秒，-1 表示永不过期）</label>
            <input type="number" id="newKeyTTL" value="-1">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="cancelAddKeyBtn">取消</button>
          <button class="btn-primary" id="confirmAddKeyBtn">创建</button>
        </div>
      </div>
    </div>
  </div>
</div>
`;
