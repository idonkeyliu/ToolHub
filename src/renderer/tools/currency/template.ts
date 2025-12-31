import { i18n } from '../../core/i18n';

export const getTemplate = () => `
<div class="currency-container">
  <div class="currency-converter">
    <!-- 源货币 -->
    <div class="currency-panel from-panel">
      <div class="panel-header">
        <span class="panel-label">${i18n.t('currency.from')}</span>
        <select id="fromCurrency" class="currency-select">
          <option value="CNY">🇨🇳 CNY ${i18n.t('currency.CNY')}</option>
          <option value="USD">🇺🇸 USD ${i18n.t('currency.USD')}</option>
          <option value="EUR">🇪🇺 EUR ${i18n.t('currency.EUR')}</option>
          <option value="JPY">🇯🇵 JPY ${i18n.t('currency.JPY')}</option>
          <option value="GBP">🇬🇧 GBP ${i18n.t('currency.GBP')}</option>
          <option value="KRW">🇰🇷 KRW ${i18n.t('currency.KRW')}</option>
          <option value="HKD">🇭🇰 HKD ${i18n.t('currency.HKD')}</option>
          <option value="AUD">🇦🇺 AUD ${i18n.t('currency.AUD')}</option>
        </select>
      </div>
      <input type="text" id="amountInput" placeholder="0" value="100" class="amount-input">
    </div>

    <!-- 交换按钮 -->
    <button id="swapBtn" class="swap-btn" title="${i18n.t('currency.swap')}">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path fill="currentColor" d="M7.5 21L3 16.5L7.5 12L8.9 13.4L6.4 15.9H16V17.9H6.4L8.9 20.4L7.5 21ZM16.5 12L15.1 10.6L17.6 8.1H8V6.1H17.6L15.1 3.6L16.5 2.2L21 6.7L16.5 12Z"/>
      </svg>
    </button>

    <!-- 目标货币 -->
    <div class="currency-panel to-panel">
      <div class="panel-header">
        <span class="panel-label">${i18n.t('currency.to')}</span>
        <select id="toCurrency" class="currency-select">
          <option value="USD">🇺🇸 USD ${i18n.t('currency.USD')}</option>
          <option value="CNY">🇨🇳 CNY ${i18n.t('currency.CNY')}</option>
          <option value="EUR">🇪🇺 EUR ${i18n.t('currency.EUR')}</option>
          <option value="JPY">🇯🇵 JPY ${i18n.t('currency.JPY')}</option>
          <option value="GBP">🇬🇧 GBP ${i18n.t('currency.GBP')}</option>
          <option value="KRW">🇰🇷 KRW ${i18n.t('currency.KRW')}</option>
          <option value="HKD">🇭🇰 HKD ${i18n.t('currency.HKD')}</option>
          <option value="AUD">🇦🇺 AUD ${i18n.t('currency.AUD')}</option>
        </select>
      </div>
      <input type="text" id="resultInput" readonly placeholder="0" class="amount-input result-input">
    </div>
  </div>

  <!-- 汇率信息 -->
  <div class="rate-info-bar">
    <span id="exchangeRateInfo" class="rate-text">${i18n.t('currency.inputHint')}</span>
    <button id="copyResultBtn" class="copy-btn" title="${i18n.t('currency.copy')}">
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
      </svg>
      <span>${i18n.t('currency.copy')}</span>
    </button>
  </div>

  <div id="currencyError" class="error-message"></div>

  <!-- 常用汇率 -->
  <div class="rates-section">
    <div class="rates-header">
      <span class="rates-title">${i18n.t('currency.liveRates')}</span>
      <span class="rates-time">${i18n.t('currency.updatedAt')} <span id="rateUpdateTime"></span></span>
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
