import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { getTemplate } from './template';
import { i18n } from '../../core/i18n';

interface StockQuote {
  code: string;
  name: string;
  price: number;
  yestclose: number;
  open: number;
  high: number;
  low: number;
  volume: string;
  amount: string;
  change: number;
  change_percent: number;
  time: string;
  source: string;
  error?: string;
}

export class StockTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'stock',
    title: i18n.t('tool.stock') || '股票行情',
    category: ToolCategory.UTILITY,
    icon: '📈',
    description: i18n.t('tool.stockDesc') || '查看港股美股实时行情',
    keywords: ['stock', 'hk', 'us', 'quote', '股票', '港股', '美股', '行情'],
  };

  readonly config = StockTool.config;

  // 预设股票列表
  private readonly presetStocks = {
    hk: [
      { code: '00700', name: '腾讯控股' },
      { code: '09988', name: '阿里巴巴' },
      { code: '03690', name: '美团' },
      { code: '09999', name: '网易' },
      { code: '01810', name: '小米集团' },
      { code: '09618', name: '京东集团' },
    ],
    us: [
      { code: 'AAPL', name: '苹果' },
      { code: 'GOOGL', name: '谷歌' },
      { code: 'MSFT', name: '微软' },
      { code: 'AMZN', name: '亚马逊' },
      { code: 'TSLA', name: '特斯拉' },
      { code: 'NVDA', name: '英伟达' },
    ],
  };

  private stockData: Map<string, StockQuote> = new Map();
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private isLoading = false;

  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tool-view stock-tool';
    container.innerHTML = getTemplate();
    return container;
  }

  protected bindEvents(): void {
    this.setupRefreshButton();
    this.setupMarketTabs();
    this.setupSearchInput();
    // 初始加载港股数据
    this.loadStockData('hk');
  }

  private setupRefreshButton(): void {
    const refreshBtn = this.querySelector('#refreshBtn');
    this.addEventListener(refreshBtn, 'click', () => {
      const activeTab = this.querySelector('.market-tab.active') as HTMLElement;
      const market = activeTab?.dataset.market || 'hk';
      this.loadStockData(market);
    });
  }

  private setupMarketTabs(): void {
    const tabs = this.container?.querySelectorAll('.market-tab');
    tabs?.forEach(tab => {
      this.addEventListener(tab as HTMLElement, 'click', () => {
        // 切换 active 状态
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const market = (tab as HTMLElement).dataset.market || 'hk';
        this.loadStockData(market);
      });
    });
  }

  private setupSearchInput(): void {
    const searchInput = this.querySelector('#stockSearchInput') as HTMLInputElement;
    const searchBtn = this.querySelector('#searchBtn');
    
    this.addEventListener(searchInput, 'keypress', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        this.searchStock(searchInput.value.trim());
      }
    });
    
    this.addEventListener(searchBtn, 'click', () => {
      this.searchStock(searchInput.value.trim());
    });
  }

  private async searchStock(code: string): Promise<void> {
    if (!code) return;
    
    // 判断市场类型
    let market = 'hk';
    if (/^[A-Za-z]+$/.test(code)) {
      market = 'us';
    }
    
    // 切换到对应市场 tab
    const tabs = this.container?.querySelectorAll('.market-tab');
    tabs?.forEach(tab => {
      tab.classList.remove('active');
      if ((tab as HTMLElement).dataset.market === market) {
        tab.classList.add('active');
      }
    });
    
    // 加载单个股票
    await this.loadSingleStock(code, market);
  }

  private async loadStockData(market: string): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;
    
    this.showLoading();
    
    const stocks = market === 'hk' ? this.presetStocks.hk : this.presetStocks.us;
    
    try {
      const promises = stocks.map(stock => 
        market === 'hk' 
          ? this.fetchHKStock(stock.code)
          : this.fetchUSStock(stock.code)
      );
      
      const results = await Promise.all(promises);
      
      this.stockData.clear();
      results.forEach(quote => {
        if (quote && !quote.error) {
          this.stockData.set(quote.code, quote);
        }
      });
      
      this.renderStockList(market);
    } catch (error) {
      this.showError('获取数据失败，请稍后重试');
    } finally {
      this.isLoading = false;
    }
  }

  private async loadSingleStock(code: string, market: string): Promise<void> {
    this.showLoading();
    
    try {
      const quote = market === 'hk' 
        ? await this.fetchHKStock(code)
        : await this.fetchUSStock(code);
      
      if (quote && !quote.error) {
        this.stockData.clear();
        this.stockData.set(quote.code, quote);
        this.renderStockList(market);
      } else {
        this.showError(quote?.error || '未找到该股票');
      }
    } catch (error) {
      this.showError('获取数据失败');
    }
  }

  private async fetchHKStock(code: string): Promise<StockQuote | null> {
    // 统一格式化代码
    if (code.toLowerCase().startsWith('hk')) {
      code = code.slice(2);
    }
    code = code.padStart(5, '0');
    
    // 使用腾讯接口（支持 CORS）
    const url = `https://qt.gtimg.cn/q=r_hk${code}`;
    
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const decoder = new TextDecoder('gbk');
      const text = decoder.decode(buffer);
      
      // 解析: v_r_hk00700="..."
      const match = text.match(/v_r_hk\d+="([^"]+)"/);
      if (!match || !match[1]) {
        return { code: `hk${code}`, error: '无法解析数据' } as StockQuote;
      }
      
      const data = match[1].split('~');
      if (data.length < 45) {
        return { code: `hk${code}`, error: '数据格式异常' } as StockQuote;
      }
      
      // 腾讯港股数据格式:
      // 1: 名称  3: 现价  4: 昨收  5: 今开
      // 30: 时间  31: 涨跌额  32: 涨跌幅
      // 33: 最高  34: 最低  36: 成交量  37: 成交额
      
      const name = data[1];
      const price = parseFloat(data[3]) || 0;
      const yestclose = parseFloat(data[4]) || 0;
      const open = parseFloat(data[5]) || 0;
      const high = parseFloat(data[33]) || 0;
      const low = parseFloat(data[34]) || 0;
      const volume = data[36] || '0';
      const amount = data[37] || '0';
      const time = data[30] || '';
      const change = parseFloat(data[31]) || 0;
      const change_percent = parseFloat(data[32]) || 0;
      
      return {
        code: `hk${code}`,
        name,
        price,
        yestclose,
        open,
        high,
        low,
        volume,
        amount,
        change: Math.round(change * 1000) / 1000,
        change_percent: Math.round(change_percent * 100) / 100,
        time,
        source: 'tencent',
      };
    } catch (error) {
      return { code: `hk${code}`, error: String(error) } as StockQuote;
    }
  }

  private async fetchUSStock(code: string): Promise<StockQuote | null> {
    code = code.toUpperCase();
    
    // 使用腾讯美股接口（支持 CORS）
    const url = `https://qt.gtimg.cn/q=us${code}`;
    
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const decoder = new TextDecoder('gbk');
      const text = decoder.decode(buffer);
      
      // 解析: v_usAAPL="..."
      const match = text.match(/v_us\w+="([^"]+)"/);
      if (!match || !match[1]) {
        return { code, error: '无法解析数据' } as StockQuote;
      }
      
      const data = match[1].split('~');
      if (data.length < 45) {
        return { code, error: '数据格式异常' } as StockQuote;
      }
      
      // 腾讯美股数据格式:
      // 1: 中文名  2: 代码  3: 现价  4: 昨收  5: 今开
      // 6: 成交量  30: 时间  31: 涨跌额  32: 涨跌幅
      // 33: 最高  34: 最低  37: 成交额
      
      const name = data[1];
      const price = parseFloat(data[3]) || 0;
      const yestclose = parseFloat(data[4]) || 0;
      const open = parseFloat(data[5]) || 0;
      const volume = data[6] || '0';
      const time = data[30] || '';
      const change = parseFloat(data[31]) || 0;
      const change_percent = parseFloat(data[32]) || 0;
      const high = parseFloat(data[33]) || 0;
      const low = parseFloat(data[34]) || 0;
      const amount = data[37] || '--';
      
      return {
        code,
        name,
        price,
        yestclose,
        open,
        high,
        low,
        volume,
        amount,
        change: Math.round(change * 1000) / 1000,
        change_percent: Math.round(change_percent * 100) / 100,
        time,
        source: 'tencent',
      };
    } catch (error) {
      return { code, error: String(error) } as StockQuote;
    }
  }

  private renderStockList(market: string): void {
    const listContainer = this.querySelector('#stockList');
    if (!listContainer) return;
    
    const currency = market === 'hk' ? 'HKD' : 'USD';
    
    if (this.stockData.size === 0) {
      listContainer.innerHTML = '<div class="no-data">暂无数据</div>';
      return;
    }
    
    // 表格头部
    let html = `
      <table class="stock-table">
        <thead>
          <tr>
            <th>股票</th>
            <th>现价</th>
            <th>涨跌幅</th>
            <th>涨跌额</th>
            <th>昨收</th>
            <th>今开</th>
            <th>最高</th>
            <th>最低</th>
            <th>成交量</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    // 表格行
    this.stockData.forEach((quote, code) => {
      const isUp = quote.change >= 0;
      const changeClass = isUp ? 'up' : 'down';
      const changeSign = isUp ? '+' : '';
      const arrow = isUp ? '↑' : '↓';
      
      html += `
        <tr>
          <td>
            <div class="stock-info">
              <span class="name">${quote.name}</span>
              <span class="code">${quote.code.toUpperCase()}</span>
            </div>
          </td>
          <td class="price-cell ${changeClass}">${quote.price.toFixed(2)}</td>
          <td>
            <span class="change-badge ${changeClass}">
              ${arrow} ${changeSign}${quote.change_percent.toFixed(2)}%
            </span>
          </td>
          <td class="change-cell ${changeClass}">${changeSign}${quote.change.toFixed(2)}</td>
          <td class="value-cell">${quote.yestclose.toFixed(2)}</td>
          <td class="value-cell">${quote.open.toFixed(2)}</td>
          <td class="value-cell high">${quote.high.toFixed(2)}</td>
          <td class="value-cell low">${quote.low.toFixed(2)}</td>
          <td class="volume-cell">${this.formatVolume(quote.volume)}</td>
        </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
    `;
    
    listContainer.innerHTML = html;
    
    // 更新时间
    const updateTime = this.querySelector('#updateTime');
    if (updateTime) {
      updateTime.textContent = new Date().toLocaleTimeString('zh-CN');
    }
  }

  private formatVolume(volume: string): string {
    const num = parseFloat(volume);
    if (isNaN(num)) return volume;
    
    if (num >= 100000000) {
      return (num / 100000000).toFixed(2) + '亿';
    } else if (num >= 10000) {
      return (num / 10000).toFixed(2) + '万';
    }
    return volume;
  }

  private showLoading(): void {
    const listContainer = this.querySelector('#stockList');
    if (listContainer) {
      listContainer.innerHTML = `
        <div class="loading">
          <div class="loading-spinner"></div>
          <span>加载中...</span>
        </div>
      `;
    }
  }

  private showError(message: string): void {
    const listContainer = this.querySelector('#stockList');
    if (listContainer) {
      listContainer.innerHTML = `
        <div class="error-message">
          <span>${message}</span>
        </div>
      `;
    }
  }

  onActivated(): void {
    // 每60秒自动刷新
    this.refreshTimer = setInterval(() => {
      const activeTab = this.querySelector('.market-tab.active') as HTMLElement;
      const market = activeTab?.dataset.market || 'hk';
      this.loadStockData(market);
    }, 60000);
  }

  onDeactivated(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    super.destroy();
  }
}
