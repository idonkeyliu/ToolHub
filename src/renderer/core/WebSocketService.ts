/**
 * WebSocket 服务 - 管理与服务器的实时连接
 */

export interface OnlineData {
  countries: Array<{
    code: string;      // 国家代码 (如 CN, US)
    name: string;      // 国家名称
    count: number;     // 在线人数
  }>;
  total: number;       // 总在线人数
  timestamp?: string;  // 服务器时间戳
}

// 服务器返回的原始数据格式
interface ServerHeartbeat {
  type: 'heartbeat';
  country_stats: Record<string, number>;  // { "CN": 1, "US": 2 }
  total_clients: number;
  timestamp: string;
}

// 国家代码到名称的映射
const COUNTRY_NAMES: Record<string, { zh: string; en: string }> = {
  'CN': { zh: '中国', en: 'China' },
  'JP': { zh: '日本', en: 'Japan' },
  'KR': { zh: '韩国', en: 'South Korea' },
  'SG': { zh: '新加坡', en: 'Singapore' },
  'AU': { zh: '澳大利亚', en: 'Australia' },
  'GB': { zh: '英国', en: 'United Kingdom' },
  'FR': { zh: '法国', en: 'France' },
  'DE': { zh: '德国', en: 'Germany' },
  'US': { zh: '美国', en: 'United States' },
  'CA': { zh: '加拿大', en: 'Canada' },
  'BR': { zh: '巴西', en: 'Brazil' },
  'MX': { zh: '墨西哥', en: 'Mexico' },
  'AE': { zh: '阿联酋', en: 'UAE' },
  'IN': { zh: '印度', en: 'India' },
  'RU': { zh: '俄罗斯', en: 'Russia' },
  'ZA': { zh: '南非', en: 'South Africa' },
  'TW': { zh: '台湾', en: 'Taiwan' },
  'HK': { zh: '香港', en: 'Hong Kong' },
  'TH': { zh: '泰国', en: 'Thailand' },
  'ID': { zh: '印度尼西亚', en: 'Indonesia' },
  'NZ': { zh: '新西兰', en: 'New Zealand' },
  'IT': { zh: '意大利', en: 'Italy' },
  'ES': { zh: '西班牙', en: 'Spain' },
  'NL': { zh: '荷兰', en: 'Netherlands' },
  'CH': { zh: '瑞士', en: 'Switzerland' },
  'SE': { zh: '瑞典', en: 'Sweden' },
  'NO': { zh: '挪威', en: 'Norway' },
  'DK': { zh: '丹麦', en: 'Denmark' },
  'FI': { zh: '芬兰', en: 'Finland' },
  'PL': { zh: '波兰', en: 'Poland' },
  'AT': { zh: '奥地利', en: 'Austria' },
  'BE': { zh: '比利时', en: 'Belgium' },
  'PT': { zh: '葡萄牙', en: 'Portugal' },
  'GR': { zh: '希腊', en: 'Greece' },
  'TR': { zh: '土耳其', en: 'Turkey' },
  'EG': { zh: '埃及', en: 'Egypt' },
  'SA': { zh: '沙特阿拉伯', en: 'Saudi Arabia' },
  'AR': { zh: '阿根廷', en: 'Argentina' },
  'CL': { zh: '智利', en: 'Chile' },
  'CO': { zh: '哥伦比亚', en: 'Colombia' },
  'PH': { zh: '菲律宾', en: 'Philippines' },
  'VN': { zh: '越南', en: 'Vietnam' },
  'MY': { zh: '马来西亚', en: 'Malaysia' },
};

type OnlineDataCallback = (data: OnlineData) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<OnlineDataCallback> = new Set();
  private lastData: OnlineData | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private readonly WS_URL = 'ws://122.51.75.177:9958/ws';
  private language: 'zh' | 'en' = 'zh';

  constructor() {
    // 应用启动时自动连接
    this.connect();
  }

  private connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    console.log('[WebSocket] Connecting to', this.WS_URL);

    try {
      this.ws = new WebSocket(this.WS_URL);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data) as ServerHeartbeat;
          console.log('[WebSocket] Received:', raw);
          if (raw && raw.type === 'heartbeat' && raw.country_stats) {
            this.lastData = this.parseServerData(raw);
            console.log('[WebSocket] Parsed data:', this.lastData);
            this.notifyListeners(this.lastData);
          }
        } catch (e) {
          console.warn('[WebSocket] Failed to parse message:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.isConnecting = false;
        this.stopPing();
        this.scheduleReconnect();
      };
    } catch (e) {
      console.error('[WebSocket] Connection failed:', e);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private startPing(): void {
    this.stopPing();
    // 每 5 秒发送 ping
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 5000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * 解析服务器返回的数据格式
   */
  private parseServerData(raw: ServerHeartbeat): OnlineData {
    const countries = Object.entries(raw.country_stats).map(([code, count]) => {
      const names = COUNTRY_NAMES[code];
      const name = names 
        ? (this.language === 'zh' ? names.zh : names.en)
        : code;
      return { code, name, count };
    });

    return {
      countries,
      total: raw.total_clients,
      timestamp: raw.timestamp,
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WebSocket] Max reconnect attempts reached');
      return;
    }

    // 指数退避重连
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private notifyListeners(data: OnlineData): void {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error('[WebSocket] Listener error:', e);
      }
    });
  }

  /**
   * 订阅在线数据更新
   */
  subscribe(callback: OnlineDataCallback): () => void {
    this.listeners.add(callback);
    
    // 如果已有数据，立即通知
    if (this.lastData) {
      callback(this.lastData);
    }

    // 返回取消订阅函数
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * 获取最新数据
   */
  getLastData(): OnlineData | null {
    return this.lastData;
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * 手动重连
   */
  reconnect(): void {
    this.reconnectAttempts = 0;
    if (this.ws) {
      this.ws.close();
    }
    this.connect();
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.stopPing();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 设置语言（影响国家名称显示）
   */
  setLanguage(lang: 'zh' | 'en'): void {
    this.language = lang;
    // 如果有数据，重新通知监听器以更新显示
    if (this.lastData) {
      // 重新解析最后一次原始数据会更好，但这里简单处理
      // 更新国家名称
      this.lastData.countries = this.lastData.countries.map(c => {
        const names = COUNTRY_NAMES[c.code];
        return {
          ...c,
          name: names ? (lang === 'zh' ? names.zh : names.en) : c.code,
        };
      });
      this.notifyListeners(this.lastData);
    }
  }
}

// 单例导出
export const wsService = new WebSocketService();
