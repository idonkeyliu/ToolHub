import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types';
import { template } from './template';
import './styles.css';

export class CurrencyTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'currency',
    title: '货币转换',
    category: ToolCategory.CONVERTER,
    icon: '💱',
    description: '实时汇率查询与货币换算',
    keywords: ['货币', 'currency', '汇率', '换算', '美元', '人民币'],
  };

  readonly config = CurrencyTool.config;

  // 模拟汇率数据
  private exchangeRates: Record<string, Record<string, number>> = {
    "CNY": { "USD": 0.1382, "EUR": 0.1276, "JPY": 20.50, "GBP": 0.1087, "KRW": 185.25, "HKD": 1.0815, "AUD": 0.2083 },
    "USD": { "CNY": 7.2352, "EUR": 0.9234, "JPY": 148.33, "GBP": 0.7866, "KRW": 1340.5, "HKD": 7.8265, "AUD": 1.5075 },
    "EUR": { "CNY": 7.8352, "USD": 1.0830, "JPY": 160.65, "GBP": 0.8518, "KRW": 1451.80, "HKD": 8.4732, "AUD": 1.6328 },
    "JPY": { "CNY": 0.0488, "USD": 0.00674, "EUR": 0.00622, "GBP": 0.00530, "KRW": 9.0356, "HKD": 0.05275, "AUD": 0.01016 },
    "GBP": { "CNY": 9.1997, "USD": 1.2712, "EUR": 1.1740, "JPY": 188.60, "KRW": 1703.28, "HKD": 9.9486, "AUD": 1.9164 },
    "KRW": { "CNY": 0.00540, "USD": 0.000746, "EUR": 0.000689, "JPY": 0.1107, "GBP": 0.000587, "HKD": 0.00584, "AUD": 0.00112 },
    "HKD": { "CNY": 0.9247, "USD": 0.1278, "EUR": 0.1180, "JPY": 18.953, "GBP": 0.1005, "KRW": 171.24, "AUD": 0.1926 },
    "AUD": { "CNY": 4.8002, "USD": 0.6633, "EUR": 0.6125, "JPY": 98.392, "GBP": 0.5218, "KRW": 889.21, "HKD": 5.1918 }
  };

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tool-view currency-tool';
    container.innerHTML = template;
    return container;
  }

  protected bindEvents(): void {
    this.setupInputValidation();
    this.setupConversion();
    this.setupSwapButton();
    this.setupCopyButton();
    this.updateRateDisplay();
  }

  private setupInputValidation(): void {
    const amountInput = this.querySelector('#amountInput') as HTMLInputElement;
    
    this.addEventListener(amountInput, 'input', () => {
      // 只允许输入数字和小数点
      amountInput.value = amountInput.value.replace(/[^\d.]/g, '');
      if (amountInput.value.split('.').length > 2) {
        amountInput.value = amountInput.value.replace(/\.+$/, '');
      }
      
      // 防抖自动转换
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => this.convertCurrency(), 500);
    });
  }

  private setupConversion(): void {
    const convertBtn = this.querySelector('#convertBtn');
    const fromCurrency = this.querySelector('#fromCurrency') as HTMLSelectElement;
    const toCurrency = this.querySelector('#toCurrency') as HTMLSelectElement;

    this.addEventListener(convertBtn, 'click', () => this.convertCurrency());
    this.addEventListener(fromCurrency, 'change', () => this.convertCurrency());
    this.addEventListener(toCurrency, 'change', () => this.convertCurrency());
  }

  private setupSwapButton(): void {
    const swapBtn = this.querySelector('#swapBtn');
    
    this.addEventListener(swapBtn, 'click', () => this.swapCurrencies());
  }

  private setupCopyButton(): void {
    const copyResultBtn = this.querySelector('#copyResultBtn');
    
    this.addEventListener(copyResultBtn, 'click', () => this.copyResult());
  }

  private convertCurrency(): void {
    const amountInput = this.querySelector('#amountInput') as HTMLInputElement;
    const fromCurrency = this.querySelector('#fromCurrency') as HTMLSelectElement;
    const toCurrency = this.querySelector('#toCurrency') as HTMLSelectElement;
    const resultInput = this.querySelector('#resultInput') as HTMLInputElement;
    const exchangeRateInfo = this.querySelector('#exchangeRateInfo');
    const errorMsg = this.querySelector('#currencyError') as HTMLElement;

    const amount = parseFloat(amountInput.value.trim());
    const from = fromCurrency.value;
    const to = toCurrency.value;

    // 清除错误信息
    errorMsg.style.display = 'none';

    if (isNaN(amount)) {
      errorMsg.textContent = '请输入有效的金额';
      errorMsg.style.display = 'block';
      return;
    }

    if (from === to) {
      resultInput.value = amount.toFixed(2);
      if (exchangeRateInfo) exchangeRateInfo.textContent = `1 ${from} = 1 ${to}`;
      return;
    }

    const rate = this.exchangeRates[from]?.[to];
    if (!rate) {
      errorMsg.textContent = '无法获取汇率信息';
      errorMsg.style.display = 'block';
      return;
    }

    const result = amount * rate;
    resultInput.value = result.toFixed(2);
    if (exchangeRateInfo) exchangeRateInfo.textContent = `1 ${from} = ${rate.toFixed(4)} ${to}`;

    // 添加转换成功的视觉反馈
    resultInput.classList.add('highlight');
    setTimeout(() => {
      resultInput.classList.remove('highlight');
    }, 700);
  }

  private swapCurrencies(): void {
    const amountInput = this.querySelector('#amountInput') as HTMLInputElement;
    const fromCurrency = this.querySelector('#fromCurrency') as HTMLSelectElement;
    const toCurrency = this.querySelector('#toCurrency') as HTMLSelectElement;
    const resultInput = this.querySelector('#resultInput') as HTMLInputElement;

    const tempCurrency = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = tempCurrency;

    if (amountInput.value && resultInput.value) {
      amountInput.value = resultInput.value;
      resultInput.value = '';
      this.convertCurrency();
    }
  }

  private copyResult(): void {
    const resultInput = this.querySelector('#resultInput') as HTMLInputElement;
    
    if (resultInput.value) {
      navigator.clipboard.writeText(resultInput.value).then(() => {
        const copyBtn = this.querySelector('#copyResultBtn');
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

  private updateRateDisplay(): void {
    const rateUpdateTime = this.querySelector('#rateUpdateTime');
    const usdCny = this.querySelector('#usd-cny');
    const eurCny = this.querySelector('#eur-cny');
    const gbpCny = this.querySelector('#gbp-cny');
    const cnyJpy = this.querySelector('#cny-jpy');
    const cnyKrw = this.querySelector('#cny-krw');
    const cnyHkd = this.querySelector('#cny-hkd');

    // 设置更新时间
    const now = new Date();
    if (rateUpdateTime) rateUpdateTime.textContent = now.toLocaleString('zh-CN');

    // 更新汇率显示
    if (usdCny) usdCny.textContent = this.exchangeRates['USD']['CNY'].toFixed(4);
    if (eurCny) eurCny.textContent = this.exchangeRates['EUR']['CNY'].toFixed(4);
    if (gbpCny) gbpCny.textContent = this.exchangeRates['GBP']['CNY'].toFixed(4);
    if (cnyJpy) cnyJpy.textContent = this.exchangeRates['CNY']['JPY'].toFixed(4);
    if (cnyKrw) cnyKrw.textContent = this.exchangeRates['CNY']['KRW'].toFixed(4);
    if (cnyHkd) cnyHkd.textContent = this.exchangeRates['CNY']['HKD'].toFixed(4);
  }

  onActivated(): void {
    const amountInput = this.querySelector('#amountInput') as HTMLInputElement;
    amountInput?.focus();
  }

  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    super.destroy();
  }
}
