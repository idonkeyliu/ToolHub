import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { getTemplate } from './template';
import { i18n } from '../../core/i18n';

export class CurrencyTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'currency',
    title: i18n.t('tool.currency'),
    category: ToolCategory.CONVERTER,
    icon: '💱',
    description: i18n.t('tool.currencyDesc'),
    keywords: ['currency', 'exchange', 'rate', 'usd', 'cny'],
  };

  readonly config = CurrencyTool.config;

  // 汇率数据（基于 CNY）
  private exchangeRates: Record<string, number> = {
    CNY: 1,
    USD: 0.1382,
    EUR: 0.1276,
    JPY: 20.50,
    GBP: 0.1087,
    KRW: 185.25,
    HKD: 1.0815,
    AUD: 0.2083,
    CAD: 0.1912,
    SGD: 0.1856,
    CHF: 0.1225,
    THB: 4.8520,
  };

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tool-view currency-tool';
    container.innerHTML = getTemplate();
    return container;
  }

  protected bindEvents(): void {
    this.setupInputValidation();
    this.setupConversion();
    this.setupSwapButton();
    this.setupCopyButton();
    this.setupQuickAmounts();
    this.setupRateCards();
    this.updateRateDisplay();
  }

  private setupInputValidation(): void {
    const amountInput = this.querySelector('#amountInput') as HTMLInputElement;
    
    this.addEventListener(amountInput, 'input', () => {
      // 只允许输入数字和小数点
      let value = amountInput.value.replace(/[^\d.]/g, '');
      // 防止多个小数点
      const parts = value.split('.');
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
      }
      amountInput.value = value;
      
      // 防抖自动转换
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => this.convertCurrency(), 150);
    });
  }

  private setupConversion(): void {
    const fromCurrency = this.querySelector('#fromCurrency') as HTMLSelectElement;
    const toCurrency = this.querySelector('#toCurrency') as HTMLSelectElement;

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

  private setupQuickAmounts(): void {
    const quickBtns = this.container?.querySelectorAll('.quick-amount-btn');
    quickBtns?.forEach(btn => {
      this.addEventListener(btn as HTMLElement, 'click', () => {
        const amount = (btn as HTMLElement).dataset.amount;
        const amountInput = this.querySelector('#amountInput') as HTMLInputElement;
        if (amount && amountInput) {
          amountInput.value = amount;
          this.convertCurrency();
        }
      });
    });
  }

  private setupRateCards(): void {
    const rateCards = this.container?.querySelectorAll('.rate-card');
    rateCards?.forEach(card => {
      this.addEventListener(card as HTMLElement, 'click', () => {
        const rateValue = card.querySelector('.rate-value');
        if (rateValue) {
          navigator.clipboard.writeText(rateValue.textContent || '');
          // 视觉反馈
          card.classList.add('highlight');
          setTimeout(() => card.classList.remove('highlight'), 500);
        }
      });
    });
  }

  private getRate(from: string, to: string): number {
    if (from === to) return 1;
    
    // 通过 CNY 作为中间货币计算
    const fromToCny = 1 / this.exchangeRates[from];
    const cnyToTo = this.exchangeRates[to];
    return fromToCny * cnyToTo;
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

    if (!amountInput.value.trim()) {
      resultInput.value = '';
      if (exchangeRateInfo) {
        exchangeRateInfo.innerHTML = i18n.t('currency.enterAmount');
      }
      return;
    }

    if (isNaN(amount)) {
      errorMsg.textContent = i18n.t('currency.invalidAmount');
      errorMsg.style.display = 'block';
      return;
    }

    const rate = this.getRate(from, to);
    const result = amount * rate;

    // 格式化结果
    resultInput.value = this.formatNumber(result);
    
    if (exchangeRateInfo) {
      exchangeRateInfo.innerHTML = `<strong>1 ${from} = ${rate.toFixed(4)} ${to}</strong>`;
    }

    // 添加转换成功的视觉反馈
    resultInput.classList.add('highlight');
    setTimeout(() => resultInput.classList.remove('highlight'), 500);
  }

  private formatNumber(num: number): string {
    // 根据数值大小决定小数位数
    if (num >= 1000) {
      return num.toFixed(2);
    } else if (num >= 1) {
      return num.toFixed(4);
    } else {
      return num.toFixed(6);
    }
  }

  private swapCurrencies(): void {
    const amountInput = this.querySelector('#amountInput') as HTMLInputElement;
    const fromCurrency = this.querySelector('#fromCurrency') as HTMLSelectElement;
    const toCurrency = this.querySelector('#toCurrency') as HTMLSelectElement;
    const resultInput = this.querySelector('#resultInput') as HTMLInputElement;

    const tempCurrency = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = tempCurrency;

    // 如果有结果，把结果作为新的输入
    if (resultInput.value) {
      amountInput.value = resultInput.value.replace(/,/g, '');
      resultInput.value = '';
    }
    
    this.convertCurrency();
  }

  private copyResult(): void {
    const resultInput = this.querySelector('#resultInput') as HTMLInputElement;
    const copyBtn = this.querySelector('#copyResultBtn') as HTMLElement;
    
    if (resultInput.value) {
      navigator.clipboard.writeText(resultInput.value).then(() => {
        copyBtn.classList.add('copied');
        setTimeout(() => copyBtn.classList.remove('copied'), 1500);
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
    if (rateUpdateTime) {
      rateUpdateTime.textContent = now.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // 更新汇率显示
    if (usdCny) usdCny.textContent = this.getRate('USD', 'CNY').toFixed(4);
    if (eurCny) eurCny.textContent = this.getRate('EUR', 'CNY').toFixed(4);
    if (gbpCny) gbpCny.textContent = this.getRate('GBP', 'CNY').toFixed(4);
    if (cnyJpy) cnyJpy.textContent = this.getRate('CNY', 'JPY').toFixed(2);
    if (cnyKrw) cnyKrw.textContent = this.getRate('CNY', 'KRW').toFixed(2);
    if (cnyHkd) cnyHkd.textContent = this.getRate('CNY', 'HKD').toFixed(4);
  }

  onActivated(): void {
    const amountInput = this.querySelector('#amountInput') as HTMLInputElement;
    amountInput?.focus();
    // 初始化时自动计算默认值
    this.convertCurrency();
  }

  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    super.destroy();
  }
}
