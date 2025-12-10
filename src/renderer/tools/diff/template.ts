/**
 * Diff 工具模板
 */

export const template = `
<div class="diff-wrap">
  <div class="diff-toolbar">
    <div class="toolbar-left">
      <div class="view-mode-group">
        <button class="view-mode-btn active" data-mode="split" title="分栏视图">
          <span class="mode-icon">◫</span>
          <span>分栏</span>
        </button>
        <button class="view-mode-btn" data-mode="unified" title="统一视图">
          <span class="mode-icon">☰</span>
          <span>统一</span>
        </button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="diff-options">
        <label class="option-item">
          <input type="checkbox" id="ignoreWhitespace">
          <span>忽略空白</span>
        </label>
        <label class="option-item">
          <input type="checkbox" id="ignoreCase">
          <span>忽略大小写</span>
        </label>
        <label class="option-item">
          <input type="checkbox" id="wordWrap" checked>
          <span>自动换行</span>
        </label>
      </div>
    </div>
    <div class="toolbar-right">
      <div class="diff-stats" id="diffStats">
        <span class="stat-item added"><span class="stat-icon">+</span><span id="addedCount">0</span></span>
        <span class="stat-item removed"><span class="stat-icon">−</span><span id="removedCount">0</span></span>
        <span class="stat-item changed"><span class="stat-icon">~</span><span id="changedCount">0</span></span>
      </div>
      <button class="toolbar-btn" id="swapBtn" title="交换左右内容">
        <span>⇄</span>
        <span>交换</span>
      </button>
      <button class="toolbar-btn" id="clearBtn" title="清空内容">
        <span>🗑️</span>
        <span>清空</span>
      </button>
    </div>
  </div>
  
  <div class="diff-container" id="diffContainer">
    <!-- 分栏视图 -->
    <div class="split-view active" id="splitView">
      <div class="diff-panel left-panel">
        <div class="panel-header">
          <div class="panel-title">
            <span class="panel-icon">📄</span>
            <span class="panel-label">原始文本</span>
            <span class="panel-filename" id="leftFilename"></span>
          </div>
          <div class="panel-actions">
            <button class="panel-btn" id="loadLeftFileBtn" title="从文件加载">
              <span>📁</span>
            </button>
            <button class="panel-btn" id="pasteLeftBtn" title="粘贴">
              <span>📋</span>
            </button>
            <button class="panel-btn" id="copyLeftBtn" title="复制">
              <span>📑</span>
            </button>
          </div>
        </div>
        <div class="editor-wrapper">
          <div class="line-numbers" id="leftLineNumbers"></div>
          <textarea class="diff-editor" id="leftEditor" placeholder="粘贴或输入原始文本，或点击 📁 选择文件..." spellcheck="false"></textarea>
        </div>
      </div>
      
      <div class="diff-gutter" id="diffGutter">
        <div class="gutter-content" id="gutterContent"></div>
      </div>
      
      <div class="diff-panel right-panel">
        <div class="panel-header">
          <div class="panel-title">
            <span class="panel-icon">📄</span>
            <span class="panel-label">修改后文本</span>
            <span class="panel-filename" id="rightFilename"></span>
          </div>
          <div class="panel-actions">
            <button class="panel-btn" id="loadRightFileBtn" title="从文件加载">
              <span>📁</span>
            </button>
            <button class="panel-btn" id="pasteRightBtn" title="粘贴">
              <span>📋</span>
            </button>
            <button class="panel-btn" id="copyRightBtn" title="复制">
              <span>📑</span>
            </button>
          </div>
        </div>
        <div class="editor-wrapper">
          <div class="line-numbers" id="rightLineNumbers"></div>
          <textarea class="diff-editor" id="rightEditor" placeholder="粘贴或输入修改后文本，或点击 📁 选择文件..." spellcheck="false"></textarea>
        </div>
      </div>
    </div>
    
    <!-- 统一视图 -->
    <div class="unified-view" id="unifiedView">
      <div class="unified-header">
        <div class="unified-title">差异对比结果</div>
        <div class="unified-actions">
          <button class="panel-btn" id="copyDiffBtn" title="复制差异">
            <span>📑</span>
            <span>复制差异</span>
          </button>
        </div>
      </div>
      <div class="unified-content" id="unifiedContent">
        <div class="unified-placeholder">输入左右两侧文本后，差异将显示在这里</div>
      </div>
    </div>
    
    <!-- 高亮差异视图（覆盖在编辑器上） -->
    <div class="diff-highlight-layer left-highlight" id="leftHighlight"></div>
    <div class="diff-highlight-layer right-highlight" id="rightHighlight"></div>
  </div>
  
  <!-- 差异导航 -->
  <div class="diff-navigation" id="diffNavigation">
    <button class="nav-btn" id="prevDiffBtn" title="上一个差异 (↑)" disabled>
      <span>↑</span>
    </button>
    <span class="nav-info" id="navInfo">0 / 0</span>
    <button class="nav-btn" id="nextDiffBtn" title="下一个差异 (↓)" disabled>
      <span>↓</span>
    </button>
  </div>
  
  <!-- 隐藏的文件输入 -->
  <input type="file" id="leftFileInput" style="display: none" accept=".txt,.json,.js,.ts,.jsx,.tsx,.css,.html,.xml,.md,.yaml,.yml,.py,.java,.go,.rs,.c,.cpp,.h,.hpp,.sql,.sh,.bash,.zsh,.env,.config,.ini,.toml,.csv,.log,*">
  <input type="file" id="rightFileInput" style="display: none" accept=".txt,.json,.js,.ts,.jsx,.tsx,.css,.html,.xml,.md,.yaml,.yml,.py,.java,.go,.rs,.c,.cpp,.h,.hpp,.sql,.sh,.bash,.zsh,.env,.config,.ini,.toml,.csv,.log,*">
</div>
`;
