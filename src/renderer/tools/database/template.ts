export const template = `
<div class="database-wrap">
  <div class="database-container">
    <!-- 左侧：连接列表和数据库浏览 -->
    <div class="database-sidebar">
      <!-- 连接管理 -->
      <div class="connection-panel">
        <div class="panel-header">
          <h3>数据库连接</h3>
          <button class="add-conn-btn" id="addConnectionBtn" title="添加连接">+</button>
        </div>
        <div class="connection-list" id="connectionList">
          <div class="empty-hint">暂无连接配置</div>
        </div>
      </div>
      
      <!-- 数据库/表树形结构 -->
      <div class="tree-panel" id="treePanel" style="display: none;">
        <div class="panel-header">
          <h3 id="treePanelTitle">数据库</h3>
          <button class="refresh-btn" id="refreshTreeBtn" title="刷新">↻</button>
        </div>
        <div class="tree-container" id="treeContainer"></div>
      </div>
      
      <!-- 状态栏（移到左侧边栏底部） -->
      <div class="sidebar-status" id="sidebarStatus">
        <span class="status-dot" id="statusDot"></span>
        <span class="status-text" id="statusText">就绪</span>
      </div>
    </div>
    
    <!-- 右侧：主内容区 -->
    <div class="database-main">
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
            <div class="welcome-icon">🗄️</div>
            <h2>数据库管理工具</h2>
            <p>支持 MySQL、PostgreSQL、SQLite 数据库</p>
            <div class="feature-list">
              <div class="feature-item">
                <span class="feature-icon">📝</span>
                <span>管理多个数据库连接配置</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🔍</span>
                <span>浏览数据库、表结构和数据</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">⚡</span>
                <span>执行 SQL 查询语句</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">✏️</span>
                <span>编辑和修改表记录</span>
              </div>
            </div>
            <button class="start-btn" id="welcomeAddBtn">+ 添加数据库连接</button>
          </div>
        </div>
        
        <!-- 查询面板模板（动态创建） -->
      </div>
    </div>
    
    <!-- 连接配置弹窗 -->
    <div class="modal-overlay" id="connectionModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="modalTitle">添加数据库连接</h3>
          <button class="modal-close" id="closeModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>连接名称</label>
            <input type="text" id="connName" placeholder="例如：本地开发库">
          </div>
          <div class="form-group">
            <label>数据库类型</label>
            <select id="connType">
              <option value="mysql">MySQL</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="sqlite">SQLite</option>
            </select>
          </div>
          <div class="form-group" id="hostGroup">
            <label>主机地址</label>
            <input type="text" id="connHost" placeholder="localhost">
          </div>
          <div class="form-group" id="portGroup">
            <label>端口</label>
            <input type="number" id="connPort" placeholder="3306">
          </div>
          <div class="form-group" id="userGroup">
            <label>用户名</label>
            <input type="text" id="connUser" placeholder="root">
          </div>
          <div class="form-group" id="passwordGroup">
            <label>密码</label>
            <input type="password" id="connPassword" placeholder="密码">
          </div>
          <div class="form-group" id="databaseGroup">
            <label>默认数据库（可选）</label>
            <input type="text" id="connDatabase" placeholder="留空则显示所有数据库">
          </div>
          <div class="form-group" id="sqlitePathGroup" style="display: none;">
            <label>数据库文件路径</label>
            <input type="text" id="connSqlitePath" placeholder="/path/to/database.db">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="testConnBtn">测试连接</button>
          <button class="btn-primary" id="saveConnBtn">保存</button>
        </div>
      </div>
    </div>
    
    </div>
  </div>
</div>
`;
