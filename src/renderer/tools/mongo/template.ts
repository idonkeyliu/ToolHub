export const template = `
<div class="mongo-wrap">
  <div class="mongo-container">
    <!-- 左侧：连接列表和集合浏览 -->
    <div class="mongo-sidebar">
      <!-- 连接管理 -->
      <div class="connection-panel">
        <div class="panel-header">
          <h3>MongoDB 连接</h3>
          <button class="add-conn-btn" id="addConnectionBtn" title="添加连接">+</button>
        </div>
        <div class="connection-list" id="connectionList">
          <div class="empty-hint">暂无连接配置</div>
        </div>
      </div>
      
      <!-- 数据库/集合浏览面板 -->
      <div class="collections-panel" id="collectionsPanel" style="display: none;">
        <div class="panel-header">
          <h3 id="collectionsPanelTitle">数据库</h3>
          <div class="panel-actions">
            <button class="action-btn" id="refreshCollectionsBtn" title="刷新">↻</button>
          </div>
        </div>
        <!-- 搜索框 -->
        <div class="search-box">
          <input type="text" id="collectionSearchInput" placeholder="搜索数据库/集合">
          <button class="search-btn" id="collectionSearchBtn">🔍</button>
        </div>
        <!-- 数据库/集合树 -->
        <div class="tree-container" id="treeContainer">
          <div class="empty-hint">选择连接后显示数据库列表</div>
        </div>
      </div>
      
      <!-- 状态栏 -->
      <div class="sidebar-status" id="sidebarStatus">
        <span class="status-dot" id="statusDot"></span>
        <span class="status-text" id="statusText">就绪</span>
      </div>
    </div>
    
    <!-- 右侧：主内容区 -->
    <div class="mongo-main">
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
            <div class="welcome-icon">🍃</div>
            <h2>MongoDB 管理工具</h2>
            <p>高效管理 MongoDB 数据库</p>
            <div class="feature-list">
              <div class="feature-item">
                <span class="feature-icon">📝</span>
                <span>管理多个 MongoDB 连接配置</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🗂️</span>
                <span>浏览数据库和集合</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📄</span>
                <span>查看和编辑文档</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🔍</span>
                <span>支持查询和聚合操作</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📊</span>
                <span>索引管理和统计信息</span>
              </div>
            </div>
            <button class="start-btn" id="welcomeAddBtn">+ 添加 MongoDB 连接</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 连接配置弹窗 -->
    <div class="modal-overlay" id="connectionModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="modalTitle">添加 MongoDB 连接</h3>
          <button class="modal-close" id="closeModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>连接名称</label>
            <input type="text" id="connName" placeholder="例如：本地开发">
          </div>
          <div class="form-group">
            <label>连接方式</label>
            <select id="connMode">
              <option value="standard">标准连接</option>
              <option value="uri">连接字符串 (URI)</option>
            </select>
          </div>
          <div id="standardConnFields">
            <div class="form-group">
              <label>主机地址</label>
              <input type="text" id="connHost" placeholder="localhost" value="localhost">
            </div>
            <div class="form-group">
              <label>端口</label>
              <input type="number" id="connPort" placeholder="27017" value="27017">
            </div>
            <div class="form-group">
              <label>用户名（可选）</label>
              <input type="text" id="connUser" placeholder="留空表示无认证">
            </div>
            <div class="form-group">
              <label>密码（可选）</label>
              <input type="password" id="connPassword" placeholder="留空表示无密码">
            </div>
            <div class="form-group">
              <label>认证数据库</label>
              <input type="text" id="connAuthDB" placeholder="admin" value="admin">
            </div>
          </div>
          <div id="uriConnFields" style="display: none;">
            <div class="form-group">
              <label>连接字符串</label>
              <textarea id="connUri" placeholder="mongodb://username:password@host:port/database?options"></textarea>
            </div>
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
    
    <!-- 新增文档弹窗 -->
    <div class="modal-overlay" id="addDocModal" style="display: none;">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3>新增文档</h3>
          <button class="modal-close" id="closeAddDocModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>文档 (JSON 格式)</label>
            <textarea id="newDocContent" placeholder='{"field": "value"}'></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="cancelAddDocBtn">取消</button>
          <button class="btn-primary" id="confirmAddDocBtn">插入</button>
        </div>
      </div>
    </div>
    
    <!-- 编辑文档弹窗 -->
    <div class="modal-overlay" id="editDocModal" style="display: none;">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3>编辑文档</h3>
          <button class="modal-close" id="closeEditDocModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>文档 (JSON 格式)</label>
            <textarea id="editDocContent"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="cancelEditDocBtn">取消</button>
          <button class="btn-primary" id="confirmEditDocBtn">保存</button>
        </div>
      </div>
    </div>
  </div>
</div>
`;
