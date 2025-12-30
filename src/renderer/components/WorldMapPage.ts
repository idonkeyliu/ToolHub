/**
 * 世界地图页面组件 - 使用 D3.js 渲染专业世界地图
 */

// 使用全局的 d3 和 topojson (通过 CDN 引入)
declare const d3: any;
declare const topojson: any;

interface OnlineUser {
  id: string;
  lat: number;
  lng: number;
}

// 模拟的城市坐标数据
const CITIES: Array<{ lat: number; lng: number }> = [
  { lat: 39.9, lng: 116.4 },   // 北京
  { lat: 31.2, lng: 121.5 },   // 上海
  { lat: 22.5, lng: 114.1 },   // 深圳
  { lat: 23.1, lng: 113.3 },   // 广州
  { lat: 30.3, lng: 120.2 },   // 杭州
  { lat: 30.7, lng: 104.1 },   // 成都
  { lat: 35.7, lng: 139.7 },   // 东京
  { lat: 37.6, lng: 127.0 },   // 首尔
  { lat: 1.3, lng: 103.8 },    // 新加坡
  { lat: -33.9, lng: 151.2 },  // 悉尼
  { lat: 51.5, lng: -0.1 },    // 伦敦
  { lat: 48.9, lng: 2.4 },     // 巴黎
  { lat: 52.5, lng: 13.4 },    // 柏林
  { lat: 40.7, lng: -74.0 },   // 纽约
  { lat: 37.8, lng: -122.4 },  // 旧金山
  { lat: 34.1, lng: -118.2 },  // 洛杉矶
  { lat: 47.6, lng: -122.3 },  // 西雅图
  { lat: 43.7, lng: -79.4 },   // 多伦多
  { lat: 49.3, lng: -123.1 },  // 温哥华
  { lat: -23.5, lng: -46.6 },  // 圣保罗
  { lat: 19.4, lng: -99.1 },   // 墨西哥城
  { lat: 25.2, lng: 55.3 },    // 迪拜
  { lat: 19.1, lng: 72.9 },    // 孟买
  { lat: 13.0, lng: 77.6 },    // 班加罗尔
  { lat: 55.8, lng: 37.6 },    // 莫斯科
  { lat: -33.9, lng: 18.4 },   // 开普敦
  { lat: 25.0, lng: 121.5 },   // 台北
  { lat: 22.3, lng: 114.2 },   // 香港
  { lat: 13.8, lng: 100.5 },   // 曼谷
  { lat: -6.2, lng: 106.8 },   // 雅加达
];

// Natural Earth TopoJSON URL
const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export class WorldMapPage {
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private users: OnlineUser[] = [];
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private svg: any = null;
  private projection: any = null;
  private worldData: any = null;
  private width = 0;
  private height = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.initUsers();
  }

  private initUsers(): void {
    const count = 15 + Math.floor(Math.random() * 11);
    for (let i = 0; i < count; i++) {
      this.addRandomUser();
    }
  }

  private addRandomUser(): void {
    const cityData = CITIES[Math.floor(Math.random() * CITIES.length)];
    const latOffset = (Math.random() - 0.5) * 2;
    const lngOffset = (Math.random() - 0.5) * 2;
    
    const user: OnlineUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lat: cityData.lat + latOffset,
      lng: cityData.lng + lngOffset,
    };
    this.users.push(user);
  }

  private removeRandomUser(): void {
    if (this.users.length > 10) {
      const index = Math.floor(Math.random() * this.users.length);
      this.users.splice(index, 1);
    }
  }

  show(): void {
    if (this.element) {
      this.element.style.display = 'flex';
      this.element.classList.remove('show');
      requestAnimationFrame(() => {
        this.element?.classList.add('show');
      });
      this.startUpdates();
      this.renderUsers();
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
          <span class="online-count">${this.users.length}</span>
          <span class="online-text">在线</span>
        </div>
        
        <!-- 连接线动画层 -->
        <svg class="connection-lines"></svg>
      </div>
    `;

    this.container.appendChild(this.element);

    requestAnimationFrame(() => {
      this.element?.classList.add('show');
    });

    // 异步加载地图，不阻塞页面显示
    this.initMap();
    this.startUpdates();
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

    // 设置投影 - 墨卡托投影，缩小比例以完整展示新西兰等南半球国家
    this.projection = d3.geoMercator()
      .scale(this.width / 7.5)
      .translate([this.width / 2, this.height / 1.5])
      .center([0, 10]);  // 视觉中心稍微向北偏移

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
    
    // 获取国家数据
    const countries = topojson.feature(
      this.worldData,
      this.worldData.objects.countries
    );

    // 过滤掉南极洲
    const filteredFeatures = countries.features.filter((feature: any) => {
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
      .on('mouseenter', function(this: SVGPathElement) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill', '#1f4a3a');
      })
      .on('mouseleave', function(this: SVGPathElement) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill', 'url(#landGradient)');
      });

    // 添加用户点图层
    this.svg.append('g').attr('class', 'user-dots');
  }

  private drawFallbackMap(): void {
    // 备用简化地图 - 当无法加载 TopoJSON 时使用
    if (!this.svg) return;
    
    this.svg.append('g').attr('class', 'user-dots');
  }

  private renderUsers(): void {
    if (!this.svg || !this.projection) return;

    const dotsGroup = this.svg.select('.user-dots');
    if (dotsGroup.empty()) return;

    // 清除现有点
    dotsGroup.selectAll('*').remove();

    // 绘制用户点
    this.users.forEach((user, index) => {
      const coords = this.projection!([user.lng, user.lat]);
      if (!coords) return;

      const [x, y] = coords;

      const group = dotsGroup.append('g')
        .attr('class', 'user-dot-group')
        .attr('data-user-id', user.id);

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
        .style('animation-delay', `${index * 0.1}s`);

      // 用户点
      group.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 3)
        .attr('class', 'user-dot')
        .attr('fill', '#00ff88')
        .attr('filter', 'url(#dotGlow)');
    });

    // 更新在线人数
    const countEl = this.element?.querySelector('.online-count');
    if (countEl) {
      countEl.textContent = this.users.length.toString();
    }
  }

  private startUpdates(): void {
    // 定期添加/移除用户
    this.updateInterval = setInterval(() => {
      const action = Math.random();
      if (action < 0.6 && this.users.length < 35) {
        this.addRandomUser();
        this.renderUsers();
        this.showJoinAnimation();
      } else if (action < 0.8 && this.users.length > 12) {
        this.removeRandomUser();
        this.renderUsers();
      }
    }, 3000 + Math.random() * 5000);
  }

  private showJoinAnimation(): void {
    if (!this.svg || !this.projection) return;
    
    const lastUser = this.users[this.users.length - 1];
    if (!lastUser) return;

    const coords = this.projection([lastUser.lng, lastUser.lat]);
    if (!coords) return;

    const [x, y] = coords;
    const dotsGroup = this.svg.select('.user-dots');

    const pulse = dotsGroup.append('circle')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', 3)
      .attr('fill', 'none')
      .attr('stroke', '#00ff88')
      .attr('stroke-width', 2)
      .attr('opacity', 1);

    pulse.transition()
      .duration(1500)
      .attr('r', 30)
      .attr('opacity', 0)
      .remove();
  }

  private stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
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
