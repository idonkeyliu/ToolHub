import { i18n } from '../../core/i18n';

export const getTemplate = () => `
<div class="stock-container">
  <!-- 头部 -->
  <div class="stock-header-bar">
    <div class="market-tabs">
      <button class="market-tab active" data-market="hk">
        <span class="flag">🇭🇰</span>
        <span>港股</span>
      </button>
      <button class="market-tab" data-market="us">
        <span class="flag">🇺🇸</span>
        <span>美股</span>
      </button>
    </div>
    
    <div class="search-bar">
      <input type="text" id="stockSearchInput" placeholder="输入股票代码，如 00700 或 AAPL" class="search-input">
      <button id="searchBtn" class="search-btn">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
        </svg>
      </button>
    </div>
    
    <div class="header-actions">
      <span class="update-info">更新: <span id="updateTime">--:--:--</span></span>
      <button id="refreshBtn" class="refresh-btn" title="刷新">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
        </svg>
      </button>
    </div>
  </div>
  
  <!-- 股票表格 -->
  <div id="stockList" class="stock-table-wrapper">
    <div class="loading">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>
  </div>
  
  <!-- 底部提示 -->
  <div class="stock-footer-info">
    <span>数据来源: 腾讯财经 | 仅供参考，不构成投资建议</span>
  </div>
</div>
`;
