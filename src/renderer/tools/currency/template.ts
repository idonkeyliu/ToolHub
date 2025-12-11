export const template = `
<div class="currency-container">
  <div class="currency-converter">
    <!-- 源货币 -->
    <div class="currency-panel from-panel">
      <div class="panel-header">
        <span class="panel-label">从</span>
        <select id="fromCurrency" class="currency-select">
          <option value="CNY">🇨🇳 CNY 人民币</option>
          <option value="USD">🇺🇸 USD 美元</option>
          <option value="EUR">🇪🇺 EUR 欧元</option>
          <option value="JPY">🇯🇵 JPY 日元</option>
          <option value="GBP">🇬🇧 GBP 英镑</option>
          <option value="KRW">🇰🇷 KRW 韩元</option>
          <option value="HKD">🇭🇰 HKD 港币</option>
          <option value="AUD">🇦🇺 AUD 澳元</option>
        </select>
      </div>
      <input type="text" id="amountInput" placeholder="0" value="100" class="amount-input">
    </div>

    <!-- 交换按钮 -->
    <button id="swapBtn" class="swap-btn" title="交换货币">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path fill="currentColor" d="M7.5 21L3 16.5L7.5 12L8.9 13.4L6.4 15.9H16V17.9H6.4L8.9 20.4L7.5 21ZM16.5 12L15.1 10.6L17.6 8.1H8V6.1H17.6L15.1 3.6L16.5 2.2L21 6.7L16.5 12Z"/>
      </svg>
    </button>

    <!-- 目标货币 -->
    <div class="currency-panel to-panel">
      <div class="panel-header">
        <span class="panel-label">到</span>
        <select id="toCurrency" class="currency-select">
          <option value="USD">🇺🇸 USD 美元</option>
          <option value="CNY">🇨🇳 CNY 人民币</option>
          <option value="EUR">🇪🇺 EUR 欧元</option>
          <option value="JPY">🇯🇵 JPY 日元</option>
          <option value="GBP">🇬🇧 GBP 英镑</option>
          <option value="KRW">🇰🇷 KRW 韩元</option>
          <option value="HKD">🇭🇰 HKD 港币</option>
          <option value="AUD">🇦🇺 AUD 澳元</option>
        </select>
      </div>
      <input type="text" id="resultInput" readonly placeholder="0" class="amount-input result-input">
    </div>
  </div>

  <!-- 汇率信息 -->
  <div class="rate-info-bar">
    <span id="exchangeRateInfo" class="rate-text">输入金额开始转换</span>
    <button id="copyResultBtn" class="copy-btn" title="复制结果">
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
      </svg>
      <span>复制</span>
    </button>
  </div>

  <div id="currencyError" class="error-message"></div>

  <!-- 常用汇率 -->
  <div class="rates-section">
    <div class="rates-header">
      <span class="rates-title">实时汇率</span>
      <span class="rates-time">更新于 <span id="rateUpdateTime"></span></span>
    </div>
    <div class="rates-grid">
      <div class="rate-card">
        <div class="rate-flag">🇺🇸</div>
        <div class="rate-info">
          <div class="rate-name">USD/CNY</div>
          <div class="rate-value" id="usd-cny">--</div>
        </div>
      </div>
      <div class="rate-card">
        <div class="rate-flag">🇪🇺</div>
        <div class="rate-info">
          <div class="rate-name">EUR/CNY</div>
          <div class="rate-value" id="eur-cny">--</div>
        </div>
      </div>
      <div class="rate-card">
        <div class="rate-flag">🇬🇧</div>
        <div class="rate-info">
          <div class="rate-name">GBP/CNY</div>
          <div class="rate-value" id="gbp-cny">--</div>
        </div>
      </div>
      <div class="rate-card">
        <div class="rate-flag">🇯🇵</div>
        <div class="rate-info">
          <div class="rate-name">CNY/JPY</div>
          <div class="rate-value" id="cny-jpy">--</div>
        </div>
      </div>
      <div class="rate-card">
        <div class="rate-flag">🇰🇷</div>
        <div class="rate-info">
          <div class="rate-name">CNY/KRW</div>
          <div class="rate-value" id="cny-krw">--</div>
        </div>
      </div>
      <div class="rate-card">
        <div class="rate-flag">🇭🇰</div>
        <div class="rate-info">
          <div class="rate-name">CNY/HKD</div>
          <div class="rate-value" id="cny-hkd">--</div>
        </div>
      </div>
    </div>
  </div>
</div>
`;
