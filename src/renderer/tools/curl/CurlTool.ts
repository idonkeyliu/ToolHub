import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types';
import { template } from './template';
import './styles.css';

export class CurlTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'curl',
    title: 'CURL工具',
    category: ToolCategory.NETWORK,
    icon: '🌐'
  };

  readonly config = CurlTool.config;

  private HISTORY_KEY = 'curl_request_history';
  private MAX_HISTORY = 20;
  private inMemoryHistory: any[] = [];

  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tool-view curl-tool';
    container.innerHTML = template;
    return container;
  }

  protected bindEvents(): void {
    this.setupTabs();
    this.setupBodyTypeSelector();
    this.setupHeadersSection();
    this.setupFormDataSection();
    this.setupHistory();
    this.setupActions();
    this.setupResponseTabs();
  }

  private setupTabs(): void {
    const getTab = this.querySelector('#getTab');
    const postTab = this.querySelector('#postTab');
    const bodySection = this.querySelector('#bodySection');

    this.addEventListener(getTab, 'click', () => {
      getTab?.classList.add('active');
      postTab?.classList.remove('active');
      if (bodySection) (bodySection as HTMLElement).style.display = 'none';
    });

    this.addEventListener(postTab, 'click', () => {
      postTab?.classList.add('active');
      getTab?.classList.remove('active');
      if (bodySection) (bodySection as HTMLElement).style.display = 'flex';
    });
  }

  private setupBodyTypeSelector(): void {
    const bodyTypeSelect = this.querySelector('#bodyTypeSelect') as HTMLSelectElement;
    const jsonBody = this.querySelector('#jsonBody');
    const formBody = this.querySelector('#formBody');
    const rawBody = this.querySelector('#rawBody');

    this.addEventListener(bodyTypeSelect, 'change', () => {
      const type = bodyTypeSelect.value;
      if (jsonBody) (jsonBody as HTMLElement).style.display = type === 'json' ? 'block' : 'none';
      if (formBody) (formBody as HTMLElement).style.display = type === 'form' ? 'block' : 'none';
      if (rawBody) (rawBody as HTMLElement).style.display = type === 'raw' ? 'block' : 'none';
    });
  }

  private setupHeadersSection(): void {
    const addHeaderBtn = this.querySelector('#addHeaderBtn');
    const headersContainer = this.querySelector('#headersContainer');

    this.addEventListener(addHeaderBtn, 'click', () => {
      this.addHeaderItem(headersContainer as HTMLElement);
    });

    // 初始删除按钮
    this.setupRemoveButtons(headersContainer as HTMLElement);
  }

  private addHeaderItem(container: HTMLElement): void {
    const headerItem = document.createElement('div');
    headerItem.className = 'header-item';
    headerItem.innerHTML = `
      <input type="text" class="curl-input header-name" placeholder="名称">
      <input type="text" class="curl-input header-value" placeholder="值">
      <button class="curl-remove-btn">删除</button>
    `;
    container.appendChild(headerItem);
    this.setupRemoveButton(headerItem.querySelector('.curl-remove-btn')!);
  }

  private setupFormDataSection(): void {
    const addFormDataBtn = this.querySelector('#addFormDataBtn');
    const formDataContainer = this.querySelector('#formDataContainer');

    this.addEventListener(addFormDataBtn, 'click', () => {
      this.addFormDataItem(formDataContainer as HTMLElement);
    });

    // 初始删除按钮
    this.setupRemoveButtons(formDataContainer as HTMLElement);
  }

  private addFormDataItem(container: HTMLElement): void {
    const formItem = document.createElement('div');
    formItem.className = 'form-data-item';
    formItem.innerHTML = `
      <input type="text" class="curl-input form-key" placeholder="键">
      <input type="text" class="curl-input form-value" placeholder="值">
      <button class="curl-remove-btn">删除</button>
    `;
    container.appendChild(formItem);
    this.setupRemoveButton(formItem.querySelector('.curl-remove-btn')!);
  }

  private setupRemoveButtons(container: HTMLElement): void {
    container.querySelectorAll('.curl-remove-btn').forEach(btn => {
      this.setupRemoveButton(btn as HTMLElement);
    });
  }

  private setupRemoveButton(btn: HTMLElement): void {
    this.addEventListener(btn, 'click', () => {
      btn.parentElement?.remove();
    });
  }

  private setupHistory(): void {
    const historyBtn = this.querySelector('#historyBtn');
    const historyFloatPanel = this.querySelector('#historyFloatPanel');
    const historyFloatClose = this.querySelector('#historyFloatClose');
    const clearHistoryBtn = this.querySelector('#clearHistoryBtn');

    this.addEventListener(historyBtn, 'click', () => {
      this.updateHistoryUI();
      this.updateHistoryCount();
      if (historyFloatPanel) (historyFloatPanel as HTMLElement).style.display = 'flex';
    });

    this.addEventListener(historyFloatClose, 'click', () => {
      if (historyFloatPanel) (historyFloatPanel as HTMLElement).style.display = 'none';
    });

    this.addEventListener(clearHistoryBtn, 'click', () => {
      this.clearHistory();
    });
  }

  private isLocalStorageAvailable(): boolean {
    const testKey = '_test_localStorage';
    try {
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  private loadHistory(): any[] {
    try {
      if (!this.isLocalStorageAvailable()) {
        return this.inMemoryHistory;
      }
      const history = localStorage.getItem(this.HISTORY_KEY);
      if (history) {
        const parsedHistory = JSON.parse(history);
        this.inMemoryHistory = parsedHistory;
        return parsedHistory;
      }
      return [];
    } catch (error) {
      console.error('加载历史记录失败:', error);
      return this.inMemoryHistory;
    }
  }

  private saveHistory(history: any[]): void {
    try {
      this.inMemoryHistory = history;
      if (!this.isLocalStorageAvailable()) return;
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  }

  private addHistory(request: any): void {
    const history = this.loadHistory();
    const existingIndex = history.findIndex(item =>
      item.url === request.url && item.method === request.method
    );
    if (existingIndex !== -1) {
      history.splice(existingIndex, 1);
    }
    history.unshift(request);
    if (history.length > this.MAX_HISTORY) {
      history.splice(this.MAX_HISTORY);
    }
    this.saveHistory(history);
    this.updateHistoryUI();
  }

  private clearHistory(): void {
    localStorage.removeItem(this.HISTORY_KEY);
    this.inMemoryHistory = [];
    this.updateHistoryUI();
    this.updateHistoryCount();
  }

  private updateHistoryUI(): void {
    const historyList = this.querySelector('#historyList');
    const history = this.loadHistory();

    if (!historyList) return;
    historyList.innerHTML = '';

    if (history.length === 0) {
      historyList.innerHTML = '<div class="curl-history-empty">暂无历史记录</div>';
      return;
    }

    history.forEach((item, index) => {
      const historyItem = document.createElement('div');
      historyItem.className = 'curl-history-item';
      const statusClass = item.status ?
        (item.status >= 200 && item.status < 300 ? 'success' : 'error') : '';

      historyItem.innerHTML = `
        <div class="history-url">
          ${item.status ? `<span class="history-status ${statusClass}">${item.status}</span>` : ''}
          ${item.url}
        </div>
        <div class="history-info-row">
          <div class="history-left">
            <span class="history-method ${item.method.toLowerCase()}">${item.method}</span>
            <span class="history-time">${item.time || '未知时间'}</span>
          </div>
          <div class="history-actions">
            <button class="history-action-btn history-action-delete" title="删除这条记录">🗑️</button>
          </div>
        </div>
      `;

      historyItem.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('history-action-delete') ||
            (e.target as HTMLElement).closest('.history-action-delete')) {
          e.stopPropagation();
          const history = this.loadHistory();
          history.splice(index, 1);
          this.saveHistory(history);
          this.updateHistoryUI();
          this.updateHistoryCount();
          return;
        }
        this.loadHistoryItem(item);
        const historyFloatPanel = this.querySelector('#historyFloatPanel');
        if (historyFloatPanel) (historyFloatPanel as HTMLElement).style.display = 'none';
      });

      historyList.appendChild(historyItem);
    });
  }

  private updateHistoryCount(): void {
    const historyCountBadge = this.querySelector('#historyCountBadge');
    const history = this.loadHistory();
    if (historyCountBadge) historyCountBadge.textContent = String(history.length);
  }

  private loadHistoryItem(item: any): void {
    const curlUrl = this.querySelector('#curlUrl') as HTMLInputElement;
    const getTab = this.querySelector('#getTab');
    const postTab = this.querySelector('#postTab');

    if (curlUrl) curlUrl.value = item.url || '';

    if (item.method === 'GET') {
      getTab?.click();
    } else if (item.method === 'POST') {
      postTab?.click();

      if (item.bodyType) {
        const bodyTypeSelect = this.querySelector('#bodyTypeSelect') as HTMLSelectElement;
        bodyTypeSelect.value = item.bodyType;
        bodyTypeSelect.dispatchEvent(new Event('change'));

        if (item.bodyType === 'json' && item.body) {
          const jsonBodyInput = this.querySelector('#jsonBodyInput') as HTMLTextAreaElement;
          if (jsonBodyInput) jsonBodyInput.value = item.body;
        } else if (item.bodyType === 'raw' && item.body) {
          const rawBodyInput = this.querySelector('#rawBodyInput') as HTMLTextAreaElement;
          if (rawBodyInput) rawBodyInput.value = item.body;
        } else if (item.bodyType === 'form' && Array.isArray(item.formData)) {
          const formContainer = this.querySelector('#formDataContainer');
          if (formContainer) {
            formContainer.innerHTML = '';
            item.formData.forEach((formItem: any) => {
              const newFormItem = document.createElement('div');
              newFormItem.className = 'form-data-item';
              newFormItem.innerHTML = `
                <input type="text" class="curl-input form-key" placeholder="名称" value="${formItem.key || ''}">
                <input type="text" class="curl-input form-value" placeholder="值" value="${formItem.value || ''}">
                <button class="curl-remove-btn">删除</button>
              `;
              this.setupRemoveButton(newFormItem.querySelector('.curl-remove-btn')!);
              formContainer.appendChild(newFormItem);
            });
          }
        }
      }
    }

    if (item.headers && Object.keys(item.headers).length > 0) {
      const headersContainer = this.querySelector('#headersContainer');
      if (headersContainer) {
        headersContainer.innerHTML = '';
        Object.entries(item.headers).forEach(([name, value]) => {
          if (!name) return;
          const headerItem = document.createElement('div');
          headerItem.className = 'header-item';
          headerItem.innerHTML = `
            <input type="text" class="curl-input header-name" placeholder="名称" value="${name}">
            <input type="text" class="curl-input header-value" placeholder="值" value="${value}">
            <button class="curl-remove-btn">删除</button>
          `;
          this.setupRemoveButton(headerItem.querySelector('.curl-remove-btn')!);
          headersContainer.appendChild(headerItem);
        });
      }
    }
  }

  private setupActions(): void {
    const sendRequestBtn = this.querySelector('#sendRequestBtn');
    const clearBtn = this.querySelector('#clearBtn');
    const copyResponseBtn = this.querySelector('#copyResponseBtn');

    this.addEventListener(sendRequestBtn, 'click', () => this.sendRequest());
    this.addEventListener(clearBtn, 'click', () => this.clearForm());
    this.addEventListener(copyResponseBtn, 'click', () => this.copyResponse());
  }

  private setupResponseTabs(): void {
    const responseTab = this.querySelector('#responseTab');
    const headersTab = this.querySelector('#headersTab');
    const requestInfoTab = this.querySelector('#requestInfoTab');
    const responseBody = this.querySelector('#responseBody');
    const responseHeaders = this.querySelector('#responseHeaders');
    const requestInfo = this.querySelector('#requestInfo');

    this.addEventListener(responseTab, 'click', () => {
      responseTab?.classList.add('active');
      headersTab?.classList.remove('active');
      requestInfoTab?.classList.remove('active');
      if (responseBody) (responseBody as HTMLElement).style.display = 'block';
      if (responseHeaders) (responseHeaders as HTMLElement).style.display = 'none';
      if (requestInfo) (requestInfo as HTMLElement).style.display = 'none';
    });

    this.addEventListener(headersTab, 'click', () => {
      headersTab?.classList.add('active');
      responseTab?.classList.remove('active');
      requestInfoTab?.classList.remove('active');
      if (responseBody) (responseBody as HTMLElement).style.display = 'none';
      if (responseHeaders) (responseHeaders as HTMLElement).style.display = 'block';
      if (requestInfo) (requestInfo as HTMLElement).style.display = 'none';
    });

    this.addEventListener(requestInfoTab, 'click', () => {
      requestInfoTab?.classList.add('active');
      responseTab?.classList.remove('active');
      headersTab?.classList.remove('active');
      if (responseBody) (responseBody as HTMLElement).style.display = 'none';
      if (responseHeaders) (responseHeaders as HTMLElement).style.display = 'none';
      if (requestInfo) (requestInfo as HTMLElement).style.display = 'block';
    });
  }

  private async sendRequest(): Promise<void> {
    const curlUrl = this.querySelector('#curlUrl') as HTMLInputElement;
    const getTab = this.querySelector('#getTab');
    const bodyTypeSelect = this.querySelector('#bodyTypeSelect') as HTMLSelectElement;
    const jsonBodyInput = this.querySelector('#jsonBodyInput') as HTMLTextAreaElement;
    const rawBodyInput = this.querySelector('#rawBodyInput') as HTMLTextAreaElement;
    const responseStatus = this.querySelector('#responseStatus');
    const responseTime = this.querySelector('#responseTime');
    const responseContentType = this.querySelector('#responseContentType');
    const responseBodyContent = this.querySelector('#responseBodyContent');
    const responseHeadersContent = this.querySelector('#responseHeadersContent');
    const requestInfoContent = this.querySelector('#requestInfoContent');
    const curlError = this.querySelector('#curlError');

    const url = curlUrl?.value?.trim();
    if (!url) {
      if (curlError) {
        (curlError as HTMLElement).textContent = '请输入URL';
        (curlError as HTMLElement).style.display = 'block';
      }
      return;
    }

    if (curlError) (curlError as HTMLElement).style.display = 'none';

    const method = getTab?.classList.contains('active') ? 'GET' : 'POST';
    const headers: Record<string, string> = {};

    // 收集请求头
    this.querySelectorAll('.header-item').forEach(item => {
      const nameInput = item.querySelector('.header-name') as HTMLInputElement;
      const valueInput = item.querySelector('.header-value') as HTMLInputElement;
      const name = nameInput?.value?.trim();
      const value = valueInput?.value?.trim();
      if (name && value) headers[name] = value;
    });

    let body: string | FormData | undefined;
    let bodyType = '';
    let formData: any[] = [];

    if (method === 'POST') {
      bodyType = bodyTypeSelect?.value || 'json';
      if (bodyType === 'json') {
        body = jsonBodyInput?.value || '';
        if (body && !headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      } else if (bodyType === 'raw') {
        body = rawBodyInput?.value || '';
      } else if (bodyType === 'form') {
        const fd = new FormData();
        this.querySelectorAll('.form-data-item').forEach(item => {
          const keyInput = item.querySelector('.form-key') as HTMLInputElement;
          const valueInput = item.querySelector('.form-value') as HTMLInputElement;
          const key = keyInput?.value?.trim();
          const value = valueInput?.value?.trim();
          if (key) {
            fd.append(key, value || '');
            formData.push({ key, value });
          }
        });
        body = fd;
      }
    }

    const startTime = Date.now();

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: body instanceof FormData ? undefined : headers,
      };
      if (method === 'POST' && body) {
        fetchOptions.body = body;
      }

      const response = await fetch(url, fetchOptions);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const status = response.status;
      const statusText = response.statusText;
      const contentType = response.headers.get('Content-Type') || '';

      // 更新状态
      if (responseStatus) {
        responseStatus.textContent = `${status} ${statusText}`;
        responseStatus.className = 'response-status ' + (status >= 200 && status < 300 ? 'success' : 'error');
      }
      if (responseTime) responseTime.textContent = `${duration}ms`;
      if (responseContentType) responseContentType.textContent = `内容类型: ${contentType}`;

      // 获取响应体
      let responseText = '';
      try {
        responseText = await response.text();
        // 尝试格式化 JSON
        if (contentType.includes('application/json')) {
          try {
            const json = JSON.parse(responseText);
            responseText = JSON.stringify(json, null, 2);
          } catch {}
        }
      } catch (e) {
        responseText = '无法读取响应体';
      }

      if (responseBodyContent) responseBodyContent.textContent = responseText;

      // 获取响应头
      let headersText = '';
      response.headers.forEach((value, key) => {
        headersText += `${key}: ${value}\n`;
      });
      if (responseHeadersContent) responseHeadersContent.textContent = headersText || '无响应头';

      // 请求信息
      const requestInfoText = `请求方法: ${method}
请求URL: ${url}
请求头:
${Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`).join('\n') || '  无'}

请求体:
${body instanceof FormData ? formData.map(f => `  ${f.key}: ${f.value}`).join('\n') : (body || '无')}`;

      if (requestInfoContent) requestInfoContent.textContent = requestInfoText;

      // 保存历史记录
      this.addHistory({
        url,
        method,
        headers,
        bodyType,
        body: body instanceof FormData ? undefined : body,
        formData: body instanceof FormData ? formData : undefined,
        status,
        time: new Date().toLocaleString('zh-CN')
      });

    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (responseStatus) {
        responseStatus.textContent = '请求失败';
        responseStatus.className = 'response-status error';
      }
      if (responseTime) responseTime.textContent = `${duration}ms`;
      if (responseBodyContent) responseBodyContent.textContent = `错误: ${error.message}`;
      if (responseHeadersContent) responseHeadersContent.textContent = '无响应头';

      const requestInfoText = `请求方法: ${method}
请求URL: ${url}
请求头:
${Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`).join('\n') || '  无'}

请求体:
${body instanceof FormData ? formData.map(f => `  ${f.key}: ${f.value}`).join('\n') : (body || '无')}

错误信息:
${error.message}`;

      if (requestInfoContent) requestInfoContent.textContent = requestInfoText;
    }
  }

  private clearForm(): void {
    const curlUrl = this.querySelector('#curlUrl') as HTMLInputElement;
    const jsonBodyInput = this.querySelector('#jsonBodyInput') as HTMLTextAreaElement;
    const rawBodyInput = this.querySelector('#rawBodyInput') as HTMLTextAreaElement;
    const responseBodyContent = this.querySelector('#responseBodyContent');
    const responseHeadersContent = this.querySelector('#responseHeadersContent');
    const requestInfoContent = this.querySelector('#requestInfoContent');
    const responseStatus = this.querySelector('#responseStatus');
    const responseTime = this.querySelector('#responseTime');
    const responseContentType = this.querySelector('#responseContentType');
    const curlError = this.querySelector('#curlError');

    if (curlUrl) curlUrl.value = '';
    if (jsonBodyInput) jsonBodyInput.value = '';
    if (rawBodyInput) rawBodyInput.value = '';
    if (responseBodyContent) responseBodyContent.textContent = '请先发送请求...';
    if (responseHeadersContent) responseHeadersContent.textContent = '请先发送请求...';
    if (requestInfoContent) requestInfoContent.textContent = '请先发送请求...';
    if (responseStatus) {
      responseStatus.textContent = '';
      responseStatus.className = 'response-status';
    }
    if (responseTime) responseTime.textContent = '';
    if (responseContentType) responseContentType.textContent = '内容类型: -';
    if (curlError) (curlError as HTMLElement).style.display = 'none';

    // 重置请求头
    const headersContainer = this.querySelector('#headersContainer');
    if (headersContainer) {
      headersContainer.innerHTML = `
        <div class="header-item">
          <input type="text" class="curl-input header-name" placeholder="名称">
          <input type="text" class="curl-input header-value" placeholder="值">
          <button class="curl-remove-btn">删除</button>
        </div>
      `;
      this.setupRemoveButtons(headersContainer as HTMLElement);
    }

    // 重置表单数据
    const formDataContainer = this.querySelector('#formDataContainer');
    if (formDataContainer) {
      formDataContainer.innerHTML = `
        <div class="form-data-item">
          <input type="text" class="curl-input form-key" placeholder="键">
          <input type="text" class="curl-input form-value" placeholder="值">
          <button class="curl-remove-btn">删除</button>
        </div>
      `;
      this.setupRemoveButtons(formDataContainer as HTMLElement);
    }
  }

  private copyResponse(): void {
    const responseBodyContent = this.querySelector('#responseBodyContent');
    const text = responseBodyContent?.textContent || '';
    if (text && text !== '请先发送请求...') {
      navigator.clipboard.writeText(text).then(() => {
        const copyBtn = this.querySelector('#copyResponseBtn');
        if (copyBtn) {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = '已复制';
          setTimeout(() => {
            copyBtn.textContent = originalText;
          }, 1500);
        }
      });
    }
  }

  onActivated(): void {
    const curlUrl = this.querySelector('#curlUrl') as HTMLInputElement;
    curlUrl?.focus();
  }
}
