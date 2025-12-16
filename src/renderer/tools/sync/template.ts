export const template = `
<div class="sync-wrap">
  <div class="sync-container">
    <!-- 左侧：配置管理 -->
    <div class="sync-sidebar">
      <!-- 项目配置 -->
      <div class="config-panel">
        <div class="panel-header">
          <h3>同步项目</h3>
          <button class="add-btn" id="addProjectBtn" title="添加项目">+</button>
        </div>
        <div class="project-list" id="projectList">
          <div class="empty-hint">暂无同步项目</div>
        </div>
      </div>
      
      <!-- 服务器列表 -->
      <div class="config-panel">
        <div class="panel-header">
          <h3>服务器</h3>
          <button class="add-btn" id="addServerBtn" title="添加服务器">+</button>
        </div>
        <div class="server-list" id="serverList">
          <div class="empty-hint">暂无服务器</div>
        </div>
      </div>
      
      <!-- 状态栏 -->
      <div class="sidebar-status">
        <span class="status-dot" id="statusDot"></span>
        <span class="status-text" id="statusText">就绪</span>
      </div>
    </div>
    
    <!-- 右侧：主内容区 -->
    <div class="sync-main">
      <!-- 顶部工具栏 -->
      <div class="sync-toolbar">
        <div class="toolbar-left">
          <span class="toolbar-title" id="toolbarTitle">文件同步检测</span>
        </div>
        <div class="toolbar-right">
          <button class="toolbar-btn" id="refreshBtn" title="刷新">🔄 刷新</button>
          <button class="toolbar-btn primary" id="syncCheckBtn" title="开始检测">▶️ 开始检测</button>
        </div>
      </div>
      
      <!-- 内容区 -->
      <div class="sync-content">
        <!-- 欢迎页 -->
        <div class="welcome-panel" id="welcomePanel">
          <div class="welcome-icon">🔄</div>
          <h2>文件同步检测</h2>
          <p>比对 Git 仓库与服务器文件的差异</p>
          <div class="feature-list">
            <div class="feature-item">
              <span class="feature-icon">📁</span>
              <span>支持多 Git 仓库配置</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🖥️</span>
              <span>支持多服务器同时检测</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🗺️</span>
              <span>灵活的路径映射配置</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📊</span>
              <span>可视化差异展示</span>
            </div>
          </div>
          <button class="start-btn" id="welcomeAddBtn">+ 创建同步项目</button>
        </div>
        
        <!-- 检测结果面板 -->
        <div class="result-panel" id="resultPanel" style="display: none;">
          <!-- 项目信息 -->
          <div class="result-header">
            <div class="project-info">
              <span class="project-name" id="resultProjectName">项目名称</span>
              <span class="project-git" id="resultGitUrl">git@example.com:repo.git</span>
            </div>
            <div class="result-summary">
              <div class="summary-item synced">
                <span class="summary-count" id="syncedCount">0</span>
                <span class="summary-label">已同步</span>
              </div>
              <div class="summary-item modified">
                <span class="summary-count" id="modifiedCount">0</span>
                <span class="summary-label">已修改</span>
              </div>
              <div class="summary-item added">
                <span class="summary-count" id="addedCount">0</span>
                <span class="summary-label">新增</span>
              </div>
              <div class="summary-item deleted">
                <span class="summary-count" id="deletedCount">0</span>
                <span class="summary-label">已删除</span>
              </div>
            </div>
          </div>
          
          <!-- 服务器标签页 -->
          <div class="server-tabs" id="serverTabs"></div>
          
          <!-- 文件差异列表 -->
          <div class="diff-list" id="diffList">
            <div class="diff-empty">选择一个服务器查看差异</div>
          </div>
          
          <!-- 文件内容对比 -->
          <div class="diff-viewer" id="diffViewer" style="display: none;">
            <div class="diff-viewer-header">
              <span class="diff-file-path" id="diffFilePath">/path/to/file</span>
              <button class="close-diff-btn" id="closeDiffBtn">×</button>
            </div>
            <div class="diff-viewer-content">
              <div class="diff-pane git-pane">
                <div class="diff-pane-header">Git 版本</div>
                <div class="diff-pane-content" id="gitContent"></div>
              </div>
              <div class="diff-pane server-pane">
                <div class="diff-pane-header">服务器版本</div>
                <div class="diff-pane-content" id="serverContent"></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 检测进度 -->
        <div class="progress-panel" id="progressPanel" style="display: none;">
          <div class="progress-icon">⏳</div>
          <div class="progress-title">正在检测...</div>
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
          </div>
          <div class="progress-text" id="progressText">准备中...</div>
        </div>
      </div>
    </div>
    
    <!-- 添加项目弹窗 -->
    <div class="modal-overlay" id="projectModal" style="display: none;">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3 id="projectModalTitle">添加同步项目</h3>
          <button class="modal-close" id="closeProjectModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-section">
            <h4>基本信息</h4>
            <div class="form-group">
              <label>项目名称</label>
              <input type="text" id="projectName" placeholder="例如：前端项目">
            </div>
            <div class="form-group">
              <label>Git 仓库地址</label>
              <input type="text" id="gitUrl" placeholder="git@github.com:user/repo.git 或 https://...">
            </div>
            <div class="form-row">
              <div class="form-group" style="flex: 1;">
                <label>分支</label>
                <input type="text" id="gitBranch" placeholder="master" value="master">
              </div>
              <div class="form-group" style="flex: 2;">
                <label>Git 认证（可选）</label>
                <input type="text" id="gitToken" placeholder="Personal Access Token">
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h4>服务器路径映射</h4>
            <div class="mapping-list" id="mappingList">
              <div class="mapping-empty">请添加服务器路径映射</div>
            </div>
            <button class="add-mapping-btn" id="addMappingBtn">+ 添加映射</button>
          </div>
          
          <div class="form-section">
            <h4>检测选项</h4>
            <div class="form-row">
              <div class="form-group" style="flex: 1;">
                <label>忽略文件（正则）</label>
                <input type="text" id="ignorePattern" placeholder="node_modules|\.git|dist" value="node_modules|\.git|dist|\.DS_Store">
              </div>
            </div>
            <div class="form-check">
              <input type="checkbox" id="checkContent" checked>
              <label for="checkContent">检测文件内容差异（否则只检测文件存在性）</label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="cancelProjectBtn">取消</button>
          <button class="btn-primary" id="saveProjectBtn">保存</button>
        </div>
      </div>
    </div>
    
    <!-- 添加服务器弹窗 -->
    <div class="modal-overlay" id="serverModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="serverModalTitle">添加服务器</h3>
          <button class="modal-close" id="closeServerModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>服务器名称</label>
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
            <select id="serverAuthType">
              <option value="password">密码</option>
              <option value="key">私钥</option>
            </select>
          </div>
          <div class="form-group" id="serverPasswordGroup">
            <label>密码</label>
            <input type="password" id="serverPassword" placeholder="输入密码">
          </div>
          <div class="form-group" id="serverKeyGroup" style="display: none;">
            <label>私钥内容</label>
            <textarea id="serverKey" placeholder="粘贴私钥内容..." rows="4"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <span class="conn-test-status" id="serverTestStatus"></span>
          <button class="btn-secondary" id="testServerBtn">测试连接</button>
          <button class="btn-primary" id="saveServerBtn">保存</button>
        </div>
      </div>
    </div>
    
    <!-- 添加映射弹窗 -->
    <div class="modal-overlay" id="mappingModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>添加路径映射</h3>
          <button class="modal-close" id="closeMappingModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>选择服务器</label>
            <select id="mappingServer">
              <option value="">-- 请选择服务器 --</option>
            </select>
          </div>
          <div class="form-group">
            <label>服务器部署路径</label>
            <input type="text" id="mappingPath" placeholder="/data/www/project">
          </div>
          <div class="form-group">
            <label>Git 子目录（可选）</label>
            <input type="text" id="mappingGitSubdir" placeholder="留空表示仓库根目录">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="cancelMappingBtn">取消</button>
          <button class="btn-primary" id="saveMappingBtn">添加</button>
        </div>
      </div>
    </div>
  </div>
</div>
`;
