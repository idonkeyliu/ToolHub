import { i18n } from '../../core/i18n';

export const getTemplate = () => `
<div class="sync-wrap">
  <div class="sync-container">
    <!-- 左侧：配置管理 -->
    <div class="sync-sidebar">
      <!-- 项目配置 -->
      <div class="config-panel">
        <div class="panel-header">
          <h3>${i18n.t('sync.projects')}</h3>
          <button class="add-btn" id="addProjectBtn" title="${i18n.t('sync.addProject')}">+</button>
        </div>
        <div class="project-list" id="projectList">
          <div class="empty-hint">${i18n.t('sync.noProjects')}</div>
        </div>
      </div>
      
      <!-- 服务器列表 -->
      <div class="config-panel">
        <div class="panel-header">
          <h3>${i18n.t('sync.servers')}</h3>
          <button class="add-btn" id="addServerBtn" title="${i18n.t('sync.addServer')}">+</button>
        </div>
        <div class="server-list" id="serverList">
          <div class="empty-hint">${i18n.t('sync.noServers')}</div>
        </div>
      </div>
      
      <!-- 状态栏 -->
      <div class="sidebar-status">
        <span class="status-dot" id="statusDot"></span>
        <span class="status-text" id="statusText">${i18n.t('sync.ready')}</span>
      </div>
    </div>
    
    <!-- 右侧：主内容区 -->
    <div class="sync-main">
      <!-- 顶部工具栏 -->
      <div class="sync-toolbar">
        <div class="toolbar-left">
          <span class="toolbar-title" id="toolbarTitle">${i18n.t('sync.title')}</span>
        </div>
        <div class="toolbar-right">
          <button class="toolbar-btn" id="refreshBtn" title="${i18n.t('sync.refresh')}">${i18n.t('sync.refresh')}</button>
          <button class="toolbar-btn primary" id="syncCheckBtn" title="${i18n.t('sync.startCheck')}">${i18n.t('sync.startCheck')}</button>
        </div>
      </div>
      
      <!-- 内容区 -->
      <div class="sync-content">
        <!-- 欢迎页 -->
        <div class="welcome-panel" id="welcomePanel">
          <div class="welcome-icon">🔄</div>
          <h2>${i18n.t('sync.title')}</h2>
          <p>${i18n.t('sync.description')}</p>
          <div class="feature-list">
            <div class="feature-item">
              <span class="feature-icon">📁</span>
              <span>${i18n.t('sync.feature1')}</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🖥️</span>
              <span>${i18n.t('sync.feature2')}</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🗺️</span>
              <span>${i18n.t('sync.feature3')}</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📊</span>
              <span>${i18n.t('sync.feature4')}</span>
            </div>
          </div>
          <button class="start-btn" id="welcomeAddBtn">${i18n.t('sync.createProject')}</button>
        </div>
        
        <!-- 检测结果面板 -->
        <div class="result-panel" id="resultPanel" style="display: none;">
          <!-- 项目信息 -->
          <div class="result-header">
            <div class="project-info">
              <span class="project-name" id="resultProjectName">${i18n.t('sync.projectName')}</span>
              <span class="project-git" id="resultGitUrl">git@example.com:repo.git</span>
            </div>
            <div class="result-summary">
              <div class="summary-item synced">
                <span class="summary-count" id="syncedCount">0</span>
                <span class="summary-label">${i18n.t('sync.synced')}</span>
              </div>
              <div class="summary-item modified">
                <span class="summary-count" id="modifiedCount">0</span>
                <span class="summary-label">${i18n.t('sync.modified')}</span>
              </div>
              <div class="summary-item added">
                <span class="summary-count" id="addedCount">0</span>
                <span class="summary-label">${i18n.t('sync.added')}</span>
              </div>
              <div class="summary-item deleted">
                <span class="summary-count" id="deletedCount">0</span>
                <span class="summary-label">${i18n.t('sync.deleted')}</span>
              </div>
            </div>
          </div>
          
          <!-- 服务器标签页 -->
          <div class="server-tabs" id="serverTabs"></div>
          
          <!-- 文件差异列表 -->
          <div class="diff-list" id="diffList">
            <div class="diff-empty">${i18n.t('sync.selectServer')}</div>
          </div>
          
          <!-- 文件内容对比 -->
          <div class="diff-viewer" id="diffViewer" style="display: none;">
            <div class="diff-viewer-header">
              <span class="diff-file-path" id="diffFilePath">/path/to/file</span>
              <button class="close-diff-btn" id="closeDiffBtn">×</button>
            </div>
            <div class="diff-viewer-content">
              <div class="diff-pane git-pane">
                <div class="diff-pane-header">${i18n.t('sync.gitVersion')}</div>
                <div class="diff-pane-content" id="gitContent"></div>
              </div>
              <div class="diff-pane server-pane">
                <div class="diff-pane-header">${i18n.t('sync.serverVersion')}</div>
                <div class="diff-pane-content" id="serverContent"></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 检测进度 -->
        <div class="progress-panel" id="progressPanel" style="display: none;">
          <div class="progress-icon">⏳</div>
          <div class="progress-title">${i18n.t('sync.checking')}</div>
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
          </div>
          <div class="progress-text" id="progressText">${i18n.t('sync.preparing')}</div>
        </div>
      </div>
    </div>
    
    <!-- 添加项目弹窗 -->
    <div class="modal-overlay" id="projectModal" style="display: none;">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3 id="projectModalTitle">${i18n.t('sync.addProject')}</h3>
          <button class="modal-close" id="closeProjectModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-section">
            <h4>${i18n.t('sync.projectName')}</h4>
            <div class="form-group">
              <label>${i18n.t('sync.projectName')}</label>
              <input type="text" id="projectName" placeholder="${i18n.t('sync.projectNamePlaceholder')}">
            </div>
            <div class="form-group">
              <label>${i18n.t('sync.gitUrl')}</label>
              <input type="text" id="gitUrl" placeholder="${i18n.t('sync.gitUrlPlaceholder')}">
            </div>
            <div class="form-row">
              <div class="form-group" style="flex: 1;">
                <label>${i18n.t('sync.branch')}</label>
                <input type="text" id="gitBranch" placeholder="master" value="master">
              </div>
              <div class="form-group" style="flex: 2;">
                <label>${i18n.t('sync.gitAuth')}</label>
                <input type="text" id="gitToken" placeholder="Personal Access Token">
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h4>${i18n.t('sync.pathMapping')}</h4>
            <div class="mapping-list" id="mappingList">
              <div class="mapping-empty">${i18n.t('sync.noMapping')}</div>
            </div>
            <button class="add-mapping-btn" id="addMappingBtn">${i18n.t('sync.addMapping')}</button>
          </div>
          
          <div class="form-section">
            <h4>${i18n.t('sync.checkOptions')}</h4>
            <div class="form-row">
              <div class="form-group" style="flex: 1;">
                <label>${i18n.t('sync.ignorePattern')}</label>
                <input type="text" id="ignorePattern" placeholder="node_modules|\.git|dist" value="node_modules|\.git|dist|\.DS_Store">
              </div>
            </div>
            <div class="form-check">
              <input type="checkbox" id="checkContent" checked>
              <label for="checkContent">${i18n.t('sync.checkContent')}</label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="cancelProjectBtn">${i18n.t('common.cancel')}</button>
          <button class="btn-primary" id="saveProjectBtn">${i18n.t('common.save')}</button>
        </div>
      </div>
    </div>
    
    <!-- 添加服务器弹窗 -->
    <div class="modal-overlay" id="serverModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="serverModalTitle">${i18n.t('sync.addServer')}</h3>
          <button class="modal-close" id="closeServerModalBtn">×</button>
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
            <select id="serverAuthType">
              <option value="password">${i18n.t('terminal.password')}</option>
              <option value="key">${i18n.t('terminal.privateKey')}</option>
            </select>
          </div>
          <div class="form-group" id="serverPasswordGroup">
            <label>${i18n.t('terminal.password')}</label>
            <input type="password" id="serverPassword" placeholder="${i18n.t('terminal.passwordPlaceholder')}">
          </div>
          <div class="form-group" id="serverKeyGroup" style="display: none;">
            <label>${i18n.t('terminal.privateKey')}</label>
            <textarea id="serverKey" placeholder="${i18n.t('terminal.privateKeyPlaceholder')}" rows="4"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <span class="conn-test-status" id="serverTestStatus"></span>
          <button class="btn-secondary" id="testServerBtn">${i18n.t('terminal.testConnection')}</button>
          <button class="btn-primary" id="saveServerBtn">${i18n.t('common.save')}</button>
        </div>
      </div>
    </div>
    
    <!-- 添加映射弹窗 -->
    <div class="modal-overlay" id="mappingModal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${i18n.t('sync.pathMapping')}</h3>
          <button class="modal-close" id="closeMappingModalBtn">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>${i18n.t('sync.selectServerLabel')}</label>
            <select id="mappingServer">
              <option value="">${i18n.t('sync.selectServerPlaceholder')}</option>
            </select>
          </div>
          <div class="form-group">
            <label>${i18n.t('sync.serverPath')}</label>
            <input type="text" id="mappingPath" placeholder="/data/www/project">
          </div>
          <div class="form-group">
            <label>${i18n.t('sync.gitSubdir')}</label>
            <input type="text" id="mappingGitSubdir" placeholder="${i18n.t('sync.gitSubdirPlaceholder')}">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="cancelMappingBtn">${i18n.t('common.cancel')}</button>
          <button class="btn-primary" id="saveMappingBtn">${i18n.t('common.add')}</button>
        </div>
      </div>
    </div>
  </div>
</div>
`;
