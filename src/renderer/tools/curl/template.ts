import { i18n } from '../../core/i18n';

export const getTemplate = () => `
<div class="curl-container">
  <div class="curl-content">
    <div class="curl-card">
      <div class="curl-header">
        <div class="curl-title">${i18n.t('curl.title')}</div>
        <div class="curl-tabs">
          <button id="getTab" class="curl-tab-btn active">GET</button>
          <button id="postTab" class="curl-tab-btn">POST</button>
        </div>
      </div>
      
      <div class="curl-section">
        <div class="curl-label">${i18n.t('curl.url')}</div>
        <div class="curl-url-container">
          <input type="text" id="curlUrl" placeholder="https://example.com/api" class="curl-input">
          <button id="historyBtn" class="curl-history-btn" title="${i18n.t('curl.viewHistory')}">
            <span>⌚</span>
          </button>
        </div>
      </div>
      
      <div class="curl-section" id="headerSection">
        <div class="curl-label">
          <span>${i18n.t('curl.headers')}</span>
          <button id="addHeaderBtn" class="curl-add-btn">${i18n.t('curl.add')}</button>
        </div>
        <div id="headersContainer" class="headers-container">
          <div class="header-item">
            <input type="text" class="curl-input header-name" placeholder="${i18n.t('curl.name')}">
            <input type="text" class="curl-input header-value" placeholder="${i18n.t('curl.value')}">
            <button class="curl-remove-btn">${i18n.t('curl.remove')}</button>
          </div>
        </div>
      </div>
      
      <div class="curl-section" id="bodySection" style="display: none;">
        <div class="curl-label">${i18n.t('curl.body')}</div>
        <div class="body-type-selector">
          <select id="bodyTypeSelect" class="curl-select">
            <option value="json">JSON</option>
            <option value="form">${i18n.t('curl.formData')}</option>
            <option value="raw">Raw</option>
          </select>
        </div>
        <div id="jsonBody" class="body-content">
          <textarea id="jsonBodyInput" class="curl-textarea" placeholder='{"key": "value"}'></textarea>
        </div>
        <div id="formBody" class="body-content" style="display: none;">
          <div id="formDataContainer">
            <div class="form-data-item">
              <input type="text" class="curl-input form-key" placeholder="${i18n.t('curl.key')}">
              <input type="text" class="curl-input form-value" placeholder="${i18n.t('curl.value')}">
              <button class="curl-remove-btn">${i18n.t('curl.remove')}</button>
            </div>
          </div>
          <button id="addFormDataBtn" class="curl-add-btn">${i18n.t('curl.addFormItem')}</button>
        </div>
        <div id="rawBody" class="body-content" style="display: none;">
          <textarea id="rawBodyInput" class="curl-textarea" placeholder="${i18n.t('curl.rawPlaceholder')}"></textarea>
        </div>
      </div>
      
      <div class="curl-actions">
        <button id="sendRequestBtn" class="curl-send-btn">${i18n.t('curl.send')}</button>
        <button id="clearBtn" class="curl-clear-btn">${i18n.t('curl.clear')}</button>
      </div>
      
      <div id="curlError" class="error-message"></div>
    </div>
    
    <div class="curl-response">
      <div class="curl-response-header">
        <div class="curl-label">${i18n.t('curl.response')}</div>
        <div class="curl-response-actions">
          <span id="responseStatus" class="response-status"></span>
          <span id="responseTime" class="response-time"></span>
          <button id="copyResponseBtn" class="curl-copy-btn">${i18n.t('curl.copy')}</button>
        </div>
        <div id="responseContentType" style="margin-top:4px;color:#aaa;font-size:13px;">${i18n.t('curl.contentType')}: -</div>
      </div>
      <div class="curl-response-tabs">
        <button id="responseTab" class="curl-resp-tab-btn active">${i18n.t('curl.responseBody')}</button>
        <button id="headersTab" class="curl-resp-tab-btn">${i18n.t('curl.responseHeaders')}</button>
        <button id="requestInfoTab" class="curl-resp-tab-btn">${i18n.t('curl.requestInfo')}</button>
      </div>
      <div id="responseBody" class="curl-response-content">
        <pre id="responseBodyContent" class="response-body-content">${i18n.t('curl.sendFirst')}</pre>
      </div>
      <div id="responseHeaders" class="curl-response-content" style="display: none;">
        <pre id="responseHeadersContent" class="response-headers-content">${i18n.t('curl.sendFirst')}</pre>
      </div>
      <div id="requestInfo" class="curl-response-content" style="display: none;">
        <pre id="requestInfoContent" class="request-info-content">${i18n.t('curl.sendFirst')}</pre>
      </div>
    </div>
  </div>
  
  <!-- 历史记录浮层 -->
  <div id="historyFloatPanel" class="curl-history-float" style="display: none;">
    <div class="curl-history-float-header">
      <div class="curl-history-float-title">${i18n.t('curl.history')}</div>
      <div class="curl-history-float-actions">
        <button id="historyFloatClose" class="curl-history-float-close">×</button>
      </div>
    </div>
    <div class="curl-history-float-body">
      <div class="curl-history-float-toolbar">
        <span class="curl-history-count-badge" id="historyCountBadge">0</span>
        <button id="clearHistoryBtn" class="curl-history-clear-btn">${i18n.t('curl.clearHistory')}</button>
      </div>
      <div class="curl-history-list" id="historyList"></div>
    </div>
  </div>
</div>
`;

// 保留旧的导出以兼容
export const template = getTemplate();
