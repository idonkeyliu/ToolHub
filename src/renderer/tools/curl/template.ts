export const template = `
<div class="curl-container">
  <div class="curl-content">
    <div class="curl-card">
      <div class="curl-header">
        <div class="curl-title">CURL 请求工具</div>
        <div class="curl-tabs">
          <button id="getTab" class="curl-tab-btn active">GET</button>
          <button id="postTab" class="curl-tab-btn">POST</button>
        </div>
      </div>
      
      <div class="curl-section">
        <div class="curl-label">URL</div>
        <div class="curl-url-container">
          <input type="text" id="curlUrl" placeholder="https://example.com/api" class="curl-input">
          <button id="historyBtn" class="curl-history-btn" title="查看历史记录">
            <span>⌚</span>
          </button>
        </div>
      </div>
      
      <div class="curl-section" id="headerSection">
        <div class="curl-label">
          <span>请求头</span>
          <button id="addHeaderBtn" class="curl-add-btn">添加</button>
        </div>
        <div id="headersContainer" class="headers-container">
          <div class="header-item">
            <input type="text" class="curl-input header-name" placeholder="名称">
            <input type="text" class="curl-input header-value" placeholder="值">
            <button class="curl-remove-btn">删除</button>
          </div>
        </div>
      </div>
      
      <div class="curl-section" id="bodySection" style="display: none;">
        <div class="curl-label">请求体</div>
        <div class="body-type-selector">
          <select id="bodyTypeSelect" class="curl-select">
            <option value="json">JSON</option>
            <option value="form">表单数据</option>
            <option value="raw">Raw</option>
          </select>
        </div>
        <div id="jsonBody" class="body-content">
          <textarea id="jsonBodyInput" class="curl-textarea" placeholder='{"key": "value"}'></textarea>
        </div>
        <div id="formBody" class="body-content" style="display: none;">
          <div id="formDataContainer">
            <div class="form-data-item">
              <input type="text" class="curl-input form-key" placeholder="键">
              <input type="text" class="curl-input form-value" placeholder="值">
              <button class="curl-remove-btn">删除</button>
            </div>
          </div>
          <button id="addFormDataBtn" class="curl-add-btn">添加表单项</button>
        </div>
        <div id="rawBody" class="body-content" style="display: none;">
          <textarea id="rawBodyInput" class="curl-textarea" placeholder="输入原始请求体数据"></textarea>
        </div>
      </div>
      
      <div class="curl-actions">
        <button id="sendRequestBtn" class="curl-send-btn">发送请求</button>
        <button id="clearBtn" class="curl-clear-btn">清空</button>
      </div>
      
      <div id="curlError" class="error-message"></div>
    </div>
    
    <div class="curl-response">
      <div class="curl-response-header">
        <div class="curl-label">响应结果</div>
        <div class="curl-response-actions">
          <span id="responseStatus" class="response-status"></span>
          <span id="responseTime" class="response-time"></span>
          <button id="copyResponseBtn" class="curl-copy-btn">复制</button>
        </div>
        <div id="responseContentType" style="margin-top:4px;color:#aaa;font-size:13px;">内容类型: -</div>
      </div>
      <div class="curl-response-tabs">
        <button id="responseTab" class="curl-resp-tab-btn active">响应体</button>
        <button id="headersTab" class="curl-resp-tab-btn">响应头</button>
        <button id="requestInfoTab" class="curl-resp-tab-btn">请求信息</button>
      </div>
      <div id="responseBody" class="curl-response-content">
        <pre id="responseBodyContent" class="response-body-content">请先发送请求...</pre>
      </div>
      <div id="responseHeaders" class="curl-response-content" style="display: none;">
        <pre id="responseHeadersContent" class="response-headers-content">请先发送请求...</pre>
      </div>
      <div id="requestInfo" class="curl-response-content" style="display: none;">
        <pre id="requestInfoContent" class="request-info-content">请先发送请求...</pre>
      </div>
    </div>
  </div>
  
  <!-- 历史记录浮层 -->
  <div id="historyFloatPanel" class="curl-history-float" style="display: none;">
    <div class="curl-history-float-header">
      <div class="curl-history-float-title">请求历史</div>
      <div class="curl-history-float-actions">
        <button id="historyFloatClose" class="curl-history-float-close">×</button>
      </div>
    </div>
    <div class="curl-history-float-body">
      <div class="curl-history-float-toolbar">
        <span class="curl-history-count-badge" id="historyCountBadge">0</span>
        <button id="clearHistoryBtn" class="curl-history-clear-btn">清空历史</button>
      </div>
      <div class="curl-history-list" id="historyList"></div>
    </div>
  </div>
</div>
`;
