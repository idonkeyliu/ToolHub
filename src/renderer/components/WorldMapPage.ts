/**
 * 世界地图页面组件 - 使用 D3.js 渲染专业世界地图
 */

import { i18n } from '../core/i18n';
import { wsService, OnlineData } from '../core/WebSocketService';

// 使用本地化的 d3 和 topojson (通过 script 标签引入)
declare const d3: typeof import('d3');
declare const topojson: typeof import('topojson-client');

interface CountryData {
  code: string;
  name: string;
  count: number;
}

// 国家代码到 ISO 3166-1 numeric 的映射（用于地图高亮）
const COUNTRY_CODE_TO_ID: Record<string, string> = {
  'CN': '156', 'JP': '392', 'KR': '410', 'SG': '702', 'AU': '036',
  'GB': '826', 'FR': '250', 'DE': '276', 'US': '840', 'CA': '124',
  'BR': '076', 'MX': '484', 'AE': '784', 'IN': '356', 'RU': '643',
  'ZA': '710', 'TW': '158', 'HK': '344', 'TH': '764', 'ID': '360',
  'NZ': '554', 'IT': '380', 'ES': '724', 'NL': '528', 'CH': '756',
  'SE': '752', 'NO': '578', 'DK': '208', 'FI': '246', 'PL': '616',
  'AT': '040', 'BE': '056', 'PT': '620', 'GR': '300', 'TR': '792',
  'EG': '818', 'SA': '682', 'AR': '032', 'CL': '152', 'CO': '170',
  'PH': '608', 'VN': '704', 'MY': '458',
};

// 国家首都/主要城市坐标（用于显示用户点）
const COUNTRY_CENTERS: Record<string, { lat: number; lng: number }> = {
  'CN': { lat: 35.0, lng: 105.0 },
  'JP': { lat: 36.0, lng: 138.0 },
  'KR': { lat: 36.5, lng: 127.5 },
  'SG': { lat: 1.3, lng: 103.8 },
  'AU': { lat: -25.0, lng: 135.0 },
  'GB': { lat: 54.0, lng: -2.0 },
  'FR': { lat: 46.0, lng: 2.0 },
  'DE': { lat: 51.0, lng: 10.0 },
  'US': { lat: 39.0, lng: -98.0 },
  'CA': { lat: 56.0, lng: -106.0 },
  'BR': { lat: -14.0, lng: -51.0 },
  'MX': { lat: 23.0, lng: -102.0 },
  'AE': { lat: 24.0, lng: 54.0 },
  'IN': { lat: 22.0, lng: 78.0 },
  'RU': { lat: 60.0, lng: 100.0 },
  'ZA': { lat: -29.0, lng: 25.0 },
  'TW': { lat: 23.5, lng: 121.0 },
  'HK': { lat: 22.3, lng: 114.2 },
  'TH': { lat: 15.0, lng: 101.0 },
  'ID': { lat: -2.0, lng: 118.0 },
  'NZ': { lat: -41.0, lng: 174.0 },
  'IT': { lat: 42.5, lng: 12.5 },
  'ES': { lat: 40.0, lng: -4.0 },
  'NL': { lat: 52.5, lng: 5.5 },
  'CH': { lat: 47.0, lng: 8.0 },
  'SE': { lat: 62.0, lng: 15.0 },
  'NO': { lat: 64.0, lng: 10.0 },
  'DK': { lat: 56.0, lng: 10.0 },
  'FI': { lat: 64.0, lng: 26.0 },
  'PL': { lat: 52.0, lng: 19.0 },
  'AT': { lat: 47.5, lng: 14.5 },
  'BE': { lat: 50.5, lng: 4.5 },
  'PT': { lat: 39.5, lng: -8.0 },
  'GR': { lat: 39.0, lng: 22.0 },
  'TR': { lat: 39.0, lng: 35.0 },
  'EG': { lat: 26.0, lng: 30.0 },
  'SA': { lat: 24.0, lng: 45.0 },
  'AR': { lat: -34.0, lng: -64.0 },
  'CL': { lat: -33.5, lng: -70.5 },
  'CO': { lat: 4.5, lng: -74.0 },
  'PH': { lat: 12.0, lng: 122.0 },
  'VN': { lat: 16.0, lng: 108.0 },
  'MY': { lat: 4.0, lng: 109.5 },
};

// Natural Earth TopoJSON URL (50m 精度版本，包含 242 个国家/地区)
const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';

export class WorldMapPage {
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private onlineData: OnlineData | null = null;
  private unsubscribe: (() => void) | null = null;
  private svg: any = null;
  private projection: any = null;
  private worldData: any = null;
  private width = 0;
  private height = 0;
  private resizeHandler: (() => void) | null = null;
  private tooltip: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  show(): void {
    if (this.element) {
      this.element.style.display = 'flex';
      this.element.classList.remove('show');
      requestAnimationFrame(() => {
        this.element?.classList.add('show');
      });
      this.subscribeToData();
      return;
    }

    this.element = document.createElement('div');
    this.element.className = 'world-map-page';
    this.element.innerHTML = `
      <div class="world-map-wrapper">
        <div class="map-container"></div>
        
        <!-- 在线人数显示 -->
        <div class="online-indicator">
          <span class="online-dot"></span>
          <span class="online-count">0</span>
          <span class="online-text">${i18n.t('worldMap.online')}</span>
        </div>
        
        <!-- 连接线动画层 -->
        <svg class="connection-lines"></svg>
        
        <!-- 国家悬停提示 -->
        <div class="country-tooltip"></div>
      </div>
    `;

    this.container.appendChild(this.element);
    
    // 获取 tooltip 元素引用
    this.tooltip = this.element.querySelector('.country-tooltip');

    requestAnimationFrame(() => {
      this.element?.classList.add('show');
    });

    // 异步加载地图，不阻塞页面显示
    this.initMap();
    this.subscribeToData();
    this.setupResizeListener();
  }

  private subscribeToData(): void {
    // 订阅 WebSocket 数据
    this.unsubscribe = wsService.subscribe((data) => {
      this.onlineData = data;
      this.updateDisplay();
    });
  }

  private updateDisplay(): void {
    if (!this.onlineData) return;

    // 更新在线总人数
    const countEl = this.element?.querySelector('.online-count');
    if (countEl) {
      countEl.textContent = this.onlineData.total.toString();
    }

    // 更新地图上的用户点
    this.renderUsers();
  }

  private setupResizeListener(): void {
    // 防抖处理，避免频繁重绘
    let resizeTimeout: ReturnType<typeof setTimeout>;
    this.resizeHandler = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.handleResize();
      }, 250);
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  private handleResize(): void {
    if (!this.element || !this.svg) return;

    const mapContainer = this.element.querySelector('.map-container');
    if (!mapContainer) return;

    const rect = mapContainer.getBoundingClientRect();
    const newWidth = rect.width || window.innerWidth;
    const newHeight = rect.height || window.innerHeight;

    // 如果尺寸变化不大，不重绘
    if (Math.abs(newWidth - this.width) < 50 && Math.abs(newHeight - this.height) < 50) {
      return;
    }

    this.width = newWidth;
    this.height = newHeight;

    // 更新 SVG viewBox
    this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);

    // 更新投影
    this.updateProjection();

    // 重绘地图
    this.redrawMap();
  }

  private updateProjection(): void {
    // 根据屏幕宽高比调整比例
    const aspectRatio = this.width / this.height;
    let scale: number;
    
    if (aspectRatio > 1.8) {
      // 宽屏显示器
      scale = this.width / 7;
    } else if (aspectRatio > 1.4) {
      // 普通显示器
      scale = this.width / 7.5;
    } else {
      // MacBook 或竖屏
      scale = Math.min(this.width, this.height) / 4;
    }

    this.projection = d3.geoMercator()
      .scale(scale)
      .translate([this.width / 2, this.height / 1.5])
      .center([0, 10]);
  }

  private redrawMap(): void {
    if (!this.svg) return;

    // 清除现有内容（保留 defs）
    this.svg.selectAll('rect').remove();
    this.svg.selectAll('.graticule').remove();
    this.svg.selectAll('.countries').remove();
    this.svg.selectAll('.user-dots').remove();

    // 重绘背景
    this.svg.append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', '#0a0f1a');

    // 重绘经纬网格
    this.drawGraticule();

    // 重绘地图
    if (this.worldData) {
      this.drawMap();
    } else {
      this.drawFallbackMap();
    }

    // 重绘用户点
    this.renderUsers();
  }

  private async initMap(): Promise<void> {
    const mapContainer = this.element?.querySelector('.map-container');
    if (!mapContainer) return;

    const rect = mapContainer.getBoundingClientRect();
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;

    // 创建 SVG
    this.svg = d3.select(mapContainer as HTMLElement)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('preserveAspectRatio', 'xMidYMid slice');

    // 添加渐变和滤镜定义
    const defs = this.svg.append('defs');
    
    // 大陆渐变
    const landGradient = defs.append('linearGradient')
      .attr('id', 'landGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    landGradient.append('stop').attr('offset', '0%').attr('stop-color', '#1a3a2e');
    landGradient.append('stop').attr('offset', '100%').attr('stop-color', '#0d1f18');

    // 发光滤镜
    const glow = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'coloredBlur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // 用户点发光
    const dotGlow = defs.append('filter')
      .attr('id', 'dotGlow')
      .attr('x', '-100%').attr('y', '-100%')
      .attr('width', '300%').attr('height', '300%');
    dotGlow.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'blur');
    const dotMerge = dotGlow.append('feMerge');
    dotMerge.append('feMergeNode').attr('in', 'blur');
    dotMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // 设置投影 - 根据屏幕尺寸自适应
    this.updateProjection();

    // 背景
    this.svg.append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', '#0a0f1a');

    // 绘制经纬网格
    this.drawGraticule();

    // 加载并绘制世界地图
    try {
      const data = await d3.json(WORLD_TOPO_URL);
      this.worldData = data || null;
      if (this.worldData) {
        this.drawMap();
        this.renderUsers();
      } else {
        this.drawFallbackMap();
        this.renderUsers();
      }
    } catch (error) {
      console.error('Failed to load world map data:', error);
      // 使用备用的简化地图
      this.drawFallbackMap();
      this.renderUsers();
    }
  }

  private drawGraticule(): void {
    if (!this.svg || !this.projection) return;

    // 限制经纬网格范围，不包括南极洲区域
    const graticule = d3.geoGraticule()
      .step([30, 30])
      .extent([[-180, -60], [180, 85]]);  // 纬度限制在 -60°(南纬60度) 到 85°(北纬85度)

    const path = d3.geoPath().projection(this.projection);

    this.svg.append('path')
      .datum(graticule())
      .attr('class', 'graticule')
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#1e3a5f')
      .attr('stroke-width', 0.3)
      .attr('stroke-opacity', 0.4);
  }

  private drawMap(): void {
    if (!this.svg || !this.projection || !this.worldData) return;

    const path = d3.geoPath().projection(this.projection);
    const self = this;  // 保存 this 引用
    
    // 获取国家数据
    const countries = topojson.feature(
      this.worldData,
      this.worldData.objects.countries
    );

    // 过滤掉南极洲
    const filteredFeatures = (countries as any).features.filter((feature: any) => {
      // 南极洲的 ID 通常是 010 或名称包含 Antarctica
      return feature.id !== '010' && 
             feature.properties?.name !== 'Antarctica';
    });

    // 绘制国家
    this.svg.append('g')
      .attr('class', 'countries')
      .selectAll('path')
      .data(filteredFeatures)
      .enter()
      .append('path')
      .attr('d', path as unknown as string)
      .attr('fill', 'url(#landGradient)')
      .attr('stroke', '#2a4a3e')
      .attr('stroke-width', 0.5)
      .attr('class', 'country')
      .on('mouseenter', function(this: SVGPathElement, event: MouseEvent, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill', '#1f4a3a');
        
        // 显示 tooltip，传入 feature 数据以获取国家名称
        self.showTooltip(event, d.id, d);
      })
      .on('mousemove', function(this: SVGPathElement, event: MouseEvent) {
        // 更新 tooltip 位置
        self.updateTooltipPosition(event);
      })
      .on('mouseleave', function(this: SVGPathElement) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill', 'url(#landGradient)');
        
        // 隐藏 tooltip
        self.hideTooltip();
      });

    // 添加用户点图层
    this.svg.append('g').attr('class', 'user-dots');
  }

  // 获取国家在线人数
  private getCountryOnlineCount(countryId: string): number {
    if (!this.onlineData) return 0;
    // 通过 ISO numeric ID 反查国家代码
    const code = Object.entries(COUNTRY_CODE_TO_ID).find(([_, id]) => id === countryId)?.[0];
    if (!code) return 0;
    const country = this.onlineData.countries.find(c => c.code === code);
    return country?.count || 0;
  }

  // 获取国家名称
  private getCountryName(countryId: string, feature?: any): string {
    // 优先从 TopoJSON feature 的 properties 中获取名称
    if (feature?.properties?.name) {
      return feature.properties.name;
    }
    
    // 备用：从在线数据中查找
    if (this.onlineData) {
      const code = Object.entries(COUNTRY_CODE_TO_ID).find(([_, id]) => id === countryId)?.[0];
      if (code) {
        const country = this.onlineData.countries.find(c => c.code === code);
        if (country?.name) return country.name;
      }
    }
    
    return i18n.getLanguage() === 'zh' ? '未知地区' : 'Unknown';
  }

  // 显示 tooltip
  private showTooltip(event: MouseEvent, countryId: string, feature?: any): void {
    if (!this.tooltip) return;
    
    const countryName = this.getCountryName(countryId, feature);
    const onlineCount = this.getCountryOnlineCount(countryId);
    const isZh = i18n.getLanguage() === 'zh';
    
    this.tooltip.innerHTML = `
      <div class="tooltip-title">${countryName}</div>
      <div class="tooltip-count">${isZh ? '在线' : 'Online'}: <span class="count">${onlineCount}</span> ${isZh ? '人' : ''}</div>
    `;
    this.tooltip.style.opacity = '1';
    this.tooltip.style.visibility = 'visible';
    
    this.updateTooltipPosition(event);
  }

  // 更新 tooltip 位置
  private updateTooltipPosition(event: MouseEvent): void {
    if (!this.tooltip || !this.element) return;
    
    const rect = this.element.getBoundingClientRect();
    const x = event.clientX - rect.left + 15;
    const y = event.clientY - rect.top - 10;
    
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  // 隐藏 tooltip
  private hideTooltip(): void {
    if (!this.tooltip) return;
    this.tooltip.style.opacity = '0';
    this.tooltip.style.visibility = 'hidden';
  }

  private drawFallbackMap(): void {
    // 备用简化地图 - 当无法加载 TopoJSON 时使用
    if (!this.svg) return;
    
    this.svg.append('g').attr('class', 'user-dots');
  }

  private renderUsers(): void {
    if (!this.svg || !this.projection || !this.onlineData) return;

    const dotsGroup = this.svg.select('.user-dots');
    if (dotsGroup.empty()) return;

    // 清除现有点
    dotsGroup.selectAll('*').remove();

    // 根据国家数据绘制用户点
    let dotIndex = 0;
    this.onlineData.countries.forEach((country) => {
      const center = COUNTRY_CENTERS[country.code];
      if (!center) return;

      // 每个国家根据人数绘制多个点（最多显示 10 个点）
      const dotsCount = Math.min(country.count, 10);
      for (let i = 0; i < dotsCount; i++) {
        // 使用固定的偏移量，基于国家代码和索引生成（不再随机）
        const offset = this.getFixedOffset(country.code, i);
        const lat = center.lat + offset.lat;
        const lng = center.lng + offset.lng;
        
        const coords = this.projection!([lng, lat]);
        if (!coords) continue;

        const [x, y] = coords;

        const group = dotsGroup.append('g')
          .attr('class', 'user-dot-group')
          .attr('data-country', country.code);

        // 外圈脉冲动画
        group.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 4)
          .attr('class', 'user-pulse')
          .attr('fill', 'none')
          .attr('stroke', '#00ff88')
          .attr('stroke-width', 1)
          .attr('opacity', 0.6)
          .style('animation', `pulse 2s ease-out infinite`)
          .style('animation-delay', `${dotIndex * 0.1}s`);

        // 用户点
        group.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 3)
          .attr('class', 'user-dot')
          .attr('fill', '#00ff88')
          .attr('filter', 'url(#dotGlow)');

        dotIndex++;
      }
    });
  }

  // 根据国家代码和索引生成固定的偏移量
  private getFixedOffset(countryCode: string, index: number): { lat: number; lng: number } {
    // 预定义的偏移模式（螺旋分布）
    const offsets = [
      { lat: 0, lng: 0 },
      { lat: 2, lng: 2 },
      { lat: -2, lng: 2 },
      { lat: 2, lng: -2 },
      { lat: -2, lng: -2 },
      { lat: 3, lng: 0 },
      { lat: -3, lng: 0 },
      { lat: 0, lng: 3 },
      { lat: 0, lng: -3 },
      { lat: 3.5, lng: 3.5 },
    ];
    
    // 根据国家代码生成一个固定的基础偏移
    const hash = countryCode.charCodeAt(0) + countryCode.charCodeAt(1);
    const baseOffset = (hash % 3) - 1; // -1, 0, 或 1
    
    const offset = offsets[index % offsets.length];
    return {
      lat: offset.lat + baseOffset * 0.5,
      lng: offset.lng + baseOffset * 0.5,
    };
  }

  private stopUpdates(): void {
    // 取消订阅 WebSocket 数据
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    // 移除 resize 监听器
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  hide(): void {
    if (this.element) {
      this.element.classList.remove('show');
      this.element.style.display = 'none';
    }
    this.stopUpdates();
  }
}
