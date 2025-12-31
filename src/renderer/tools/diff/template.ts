/**
 * Diff 工具模板
 */

import { i18n } from '../../core/i18n';

export const getTemplate = () => `
<div class="diff-wrap">
  <div class="diff-toolbar">
    <div class="toolbar-left">
      <div class="view-mode-group">
        <button class="view-mode-btn active" data-mode="split" title="${i18n.t('diff.splitView')}">
          <span class="mode-icon">◫</span>
          <span>${i18n.t('diff.splitView')}</span>
        </button>
        <button class="view-mode-btn" data-mode="unified" title="${i18n.t('diff.unifiedView')}">
          <span class="mode-icon">☰</span>
          <span>${i18n.t('diff.unifiedView')}</span>
        </button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="diff-options">
        <label class="option-item">
          <input type="checkbox" id="ignoreWhitespace">
          <span>${i18n.t('diff.ignoreWhitespace')}</span>
        </label>
        <label class="option-item">
          <input type="checkbox" id="ignoreCase">
          <span>${i18n.t('diff.ignoreCase')}</span>
        </label>
        <label class="option-item">
          <input type="checkbox" id="wordWrap" checked>
          <span>${i18n.t('diff.wordWrap')}</span>
        </label>
      </div>
    </div>
    <div class="toolbar-right">
      <div class="diff-stats" id="diffStats">
        <span class="stat-item added"><span class="stat-icon">+</span><span id="addedCount">0</span></span>
        <span class="stat-item removed"><span class="stat-icon">−</span><span id="removedCount">0</span></span>
        <span class="stat-item changed"><span class="stat-icon">~</span><span id="changedCount">0</span></span>
      </div>
      <button class="toolbar-btn" id="swapBtn" title="${i18n.t('diff.swap')}">
        <span>⇄</span>
        <span>${i18n.t('diff.swap')}</span>
      </button>
      <button class="toolbar-btn" id="clearBtn" title="${i18n.t('diff.clear')}">
        <span>🗑️</span>
        <span>${i18n.t('diff.clear')}</span>
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
            <span class="panel-label">${i18n.t('diff.original')}</span>
            <span class="panel-filename" id="leftFilename"></span>
          </div>
          <div class="panel-actions">
            <button class="panel-btn" id="loadLeftFileBtn" title="${i18n.t('diff.loadFile')}">
              <span>📁</span>
            </button>
            <button class="panel-btn" id="pasteLeftBtn" title="${i18n.t('diff.paste')}">
              <span>📋</span>
            </button>
            <button class="panel-btn" id="copyLeftBtn" title="${i18n.t('diff.copy')}">
              <span>📑</span>
            </button>
          </div>
        </div>
        <div class="editor-wrapper">
          <div class="line-numbers" id="leftLineNumbers"></div>
          <textarea class="diff-editor" id="leftEditor" placeholder="${i18n.t('diff.originalPlaceholder')}" spellcheck="false"></textarea>
        </div>
      </div>
      
      <div class="diff-gutter" id="diffGutter">
        <div class="gutter-content" id="gutterContent"></div>
      </div>
      
      <div class="diff-panel right-panel">
        <div class="panel-header">
          <div class="panel-title">
            <span class="panel-icon">📄</span>
            <span class="panel-label">${i18n.t('diff.modified')}</span>
            <span class="panel-filename" id="rightFilename"></span>
          </div>
          <div class="panel-actions">
            <button class="panel-btn" id="loadRightFileBtn" title="${i18n.t('diff.loadFile')}">
              <span>📁</span>
            </button>
            <button class="panel-btn" id="pasteRightBtn" title="${i18n.t('diff.paste')}">
              <span>📋</span>
            </button>
            <button class="panel-btn" id="copyRightBtn" title="${i18n.t('diff.copy')}">
              <span>📑</span>
            </button>
          </div>
        </div>
        <div class="editor-wrapper">
          <div class="line-numbers" id="rightLineNumbers"></div>
          <textarea class="diff-editor" id="rightEditor" placeholder="${i18n.t('diff.modifiedPlaceholder')}" spellcheck="false"></textarea>
        </div>
      </div>
    </div>
    
    <!-- 统一视图 -->
    <div class="unified-view" id="unifiedView">
      <div class="unified-header">
        <div class="unified-title">${i18n.t('diff.diffResult')}</div>
        <div class="unified-actions">
          <button class="panel-btn" id="copyDiffBtn" title="${i18n.t('diff.copyDiff')}">
            <span>📑</span>
            <span>${i18n.t('diff.copyDiff')}</span>
          </button>
        </div>
      </div>
      <div class="unified-content" id="unifiedContent">
        <div class="unified-placeholder">${i18n.t('diff.placeholder')}</div>
      </div>
    </div>
    
    <!-- 高亮差异视图（覆盖在编辑器上） -->
    <div class="diff-highlight-layer left-highlight" id="leftHighlight"></div>
    <div class="diff-highlight-layer right-highlight" id="rightHighlight"></div>
  </div>
  
  <!-- 差异导航 -->
  <div class="diff-navigation" id="diffNavigation">
    <button class="nav-btn" id="prevDiffBtn" title="${i18n.t('diff.prevDiff')} (↑)" disabled>
      <span>↑</span>
    </button>
    <span class="nav-info" id="navInfo">0 / 0</span>
    <button class="nav-btn" id="nextDiffBtn" title="${i18n.t('diff.nextDiff')} (↓)" disabled>
      <span>↓</span>
    </button>
  </div>
  
  <!-- 隐藏的文件输入 -->
  <input type="file" id="leftFileInput" style="display: none" accept=".txt,.json,.js,.ts,.jsx,.tsx,.css,.html,.xml,.md,.yaml,.yml,.py,.java,.go,.rs,.c,.cpp,.h,.hpp,.sql,.sh,.bash,.zsh,.env,.config,.ini,.toml,.csv,.log,*">
  <input type="file" id="rightFileInput" style="display: none" accept=".txt,.json,.js,.ts,.jsx,.tsx,.css,.html,.xml,.md,.yaml,.yml,.py,.java,.go,.rs,.c,.cpp,.h,.hpp,.sql,.sh,.bash,.zsh,.env,.config,.ini,.toml,.csv,.log,*">
</div>
`;
