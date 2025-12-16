export const template = `
<div class="terminal-wrap">
  <div class="terminal-container">
    <!-- 左侧：连接列表 -->
    <div class="terminal-sidebar">
      <!-- 连接管理 -->
      <div class="connection-panel">
        <div class="panel-header">
          <h3>SSH 连接</h3>
          <button class="add-conn-btn" id="addServerBtn" title="添加连接">+</button>
        </div>
        <div class="connection-list" id="serverList">
          <div class="empty-hint">暂无连接配置</div>
        </div>
      </div>
      
      <!-- 状态栏 -->
      <div class="sidebar-status" id="sidebarStatus">
        <span class="status-dot" id="statusDot"></span>
        <span class="status-text" id="statusText">就绪</span>
      </div>
    </div>
    
    <!-- 右侧：主内容区 -->
    <div class="terminal-main">
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
            <div class="welcome-icon">🖥️</div>
            <h2>SSH 终端</h2>
            <p>安全连接到远程服务器</p>
            <div class="feature-list">
              <div class="feature-item">
                <span class="feature-icon">🔐</span>
                <span>支持密码和私钥认证</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📋</span>
                <span>管理多个服务器连接</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">⚡</span>
                <span>多标签页终端会话</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📜</span>
                <span>命令历史记录</span>
              </div>
            </div>
            <button class="start-btn" id="welcomeAddBtn">+ 添加服务器连接</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 连接配置弹窗 -->
    <div class="modal-overlay" id="serverModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="modalTitle">添加服务器</h3>
          <button class="modal-close" id="closeModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>连接名称</label>
            <input type="text" id="serverName" placeholder="例如：生产服务器">
          </div>
          <div class="form-group">
            <label>主机地址</label>
            <input type="text" id="serverHost" placeholder="192.168.1.100 或 example.com">
          </div>
          <div class="form-row">
            <div class="form-group" style="flex: 1;">
              <label>端口</label>
              <input type="number" id="serverPort" placeholder="22" value="22">
            </div>
            <div class="form-group" style="flex: 2;">
              <label>用户名</label>
              <input type="text" id="serverUser" placeholder="root" value="root">
            </div>
          </div>
          <div class="form-group">
            <label>认证方式</label>
            <select id="authType">
              <option value="password">密码</option>
              <option value="key">私钥</option>
            </select>
          </div>
          <div class="form-group" id="passwordGroup">
            <label>密码</label>
            <input type="password" id="serverPassword" placeholder="输入密码">
          </div>
          <div class="form-group" id="keyGroup" style="display: none;">
            <label>私钥内容</label>
            <textarea id="serverKey" placeholder="粘贴私钥内容..." rows="4"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <span class="conn-test-status" id="connTestStatus"></span>
          <button class="btn-secondary" id="testConnBtn">测试连接</button>
          <button class="btn-primary" id="saveConnBtn">保存</button>
        </div>
      </div>
    </div>
  </div>
</div>
`;
