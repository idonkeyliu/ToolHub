export const template = `
<div class="currency-container">
  <div class="currency-content">
    <div class="currency-card">
      <div class="form-group">
        <div class="input-group">
          <input type="text" id="amountInput" placeholder="输入金额" class="currency-input">
          <select id="fromCurrency" class="currency-select">
            <option value="CNY">人民币 (CNY)</option>
            <option value="USD">美元 (USD)</option>
            <option value="EUR">欧元 (EUR)</option>
            <option value="JPY">日元 (JPY)</option>
            <option value="GBP">英镑 (GBP)</option>
            <option value="KRW">韩元 (KRW)</option>
            <option value="HKD">港币 (HKD)</option>
            <option value="AUD">澳元 (AUD)</option>
          </select>
        </div>
      </div>
      
      <div class="swap-btn-container">
        <button id="swapBtn" class="swap-btn">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z" />
          </svg>
        </button>
      </div>
      
      <div class="form-group">
        <div class="input-group">
          <input type="text" id="resultInput" readonly placeholder="转换结果" class="currency-input">
          <select id="toCurrency" class="currency-select">
            <option value="USD">美元 (USD)</option>
            <option value="CNY">人民币 (CNY)</option>
            <option value="EUR">欧元 (EUR)</option>
            <option value="JPY">日元 (JPY)</option>
            <option value="GBP">英镑 (GBP)</option>
            <option value="KRW">韩元 (KRW)</option>
            <option value="HKD">港币 (HKD)</option>
            <option value="AUD">澳元 (AUD)</option>
          </select>
        </div>
      </div>
      
      <div class="currency-actions">
        <button id="convertBtn" class="convert-btn">转换</button>
        <button id="copyResultBtn" class="copy-btn">复制结果</button>
      </div>
      
      <div class="exchange-rate-display">
        <span id="exchangeRateInfo">汇率信息将显示在这里</span>
      </div>
      
      <div id="currencyError" class="error-message"></div>
    </div>
    
    <div class="currency-info">
      <h3>常用汇率参考 (更新于: <span id="rateUpdateTime"></span>)</h3>
      <div class="rate-grid">
        <div class="rate-item">
          <div class="rate-pair">1 USD = <span class="rate-value" id="usd-cny">--</span> CNY</div>
        </div>
        <div class="rate-item">
          <div class="rate-pair">1 EUR = <span class="rate-value" id="eur-cny">--</span> CNY</div>
        </div>
        <div class="rate-item">
          <div class="rate-pair">1 GBP = <span class="rate-value" id="gbp-cny">--</span> CNY</div>
        </div>
        <div class="rate-item">
          <div class="rate-pair">1 CNY = <span class="rate-value" id="cny-jpy">--</span> JPY</div>
        </div>
        <div class="rate-item">
          <div class="rate-pair">1 CNY = <span class="rate-value" id="cny-krw">--</span> KRW</div>
        </div>
        <div class="rate-item">
          <div class="rate-pair">1 CNY = <span class="rate-value" id="cny-hkd">--</span> HKD</div>
        </div>
      </div>
    </div>
  </div>
</div>
`;
