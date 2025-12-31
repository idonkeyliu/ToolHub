/**
 * 使用统计面板（独立于工具系统）
 */

import { getStatsTemplate } from './template';
import { i18n } from '../../core/i18n';

// 每日汇总
interface DailySummary {
  date: string;
  totalDuration: number;
  tools: { [toolId: string]: { duration: number; count: number } };
  hours?: number[]; // 每日的24小时使用时长分布
}

// 工具信息
interface ToolInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// 存储键
const STORAGE_KEY = 'toolhub_usage_stats';

export class StatsPanel {
  private container: HTMLElement;
  private toolsMap: { [id: string]: ToolInfo } = {};
  private currentPeriod: 'week' | 'month' | 'year' = 'week';
  private rankingType: 'time' | 'count' = 'time';
  private tooltip: HTMLElement | null = null;
  private eventListeners: Array<{ el: HTMLElement; type: string; handler: EventListener }> = [];
  private selectedDate: string | null = null; // 新增：当前选中的日期

  constructor(container: HTMLElement) {
    this.container = container;
    this.initToolsMap();
    this.render();
    this.bindEvents();
    this.refreshStats();
  }

  private initToolsMap(): void {
    const toolsList: ToolInfo[] = [
      // LLM 站点
      { id: 'openai', name: 'OpenAI', icon: '🤖', color: '#10a37f' },
      { id: 'gemini', name: 'Gemini', icon: '✨', color: '#4285f4' },
      { id: 'claude', name: 'Claude', icon: '🧠', color: '#d97706' },
      { id: 'deepseek', name: 'DeepSeek', icon: '🔍', color: '#6366f1' },
      { id: 'kimi', name: 'Kimi', icon: '🌙', color: '#8b5cf6' },
      { id: 'doubao', name: i18n.t('stats.doubao'), icon: '🫘', color: '#ff6b35' },
      { id: 'qwen', name: i18n.t('stats.qwen'), icon: '💬', color: '#6d28d9' },
      { id: 'yuanbao', name: i18n.t('stats.yuanbao'), icon: '🪙', color: '#f59e0b' },
      { id: 'zhipu', name: i18n.t('stats.zhipu'), icon: '🎯', color: '#0ea5e9' },
      { id: 'baichuan', name: i18n.t('stats.baichuan'), icon: '🌊', color: '#14b8a6' },
      // 工具
      { id: 'time', name: i18n.t('stats.timestamp'), icon: '⏰', color: '#f59e0b' },
      { id: 'pwd', name: i18n.t('stats.password'), icon: '🔑', color: '#ef4444' },
      { id: 'text', name: i18n.t('stats.textStats'), icon: '📝', color: '#8b5cf6' },
      { id: 'json', name: 'JSON', icon: '📋', color: '#22c55e' },
      { id: 'calc', name: i18n.t('stats.calculator'), icon: '🧮', color: '#06b6d4' },
      { id: 'dns', name: 'DNS', icon: '🌐', color: '#14b8a6' },
      { id: 'codec', name: i18n.t('stats.codec'), icon: '🔤', color: '#3b82f6' },
      { id: 'crypto', name: i18n.t('stats.crypto'), icon: '🔐', color: '#ec4899' },
      { id: 'curl', name: 'CURL', icon: '🔧', color: '#f97316' },
      { id: 'currency', name: i18n.t('stats.currency'), icon: '💱', color: '#10b981' },
      { id: 'color', name: i18n.t('stats.color'), icon: '🎨', color: '#a855f7' },
      { id: 'calendar', name: i18n.t('stats.calendar'), icon: '📅', color: '#6366f1' },
      { id: 'image', name: i18n.t('stats.image'), icon: '🖼️', color: '#0ea5e9' },
      { id: 'database', name: i18n.t('stats.database'), icon: '🗄️', color: '#f472b6' },
      { id: 'redis', name: 'Redis', icon: '📦', color: '#dc2626' },
      { id: 'mongo', name: 'MongoDB', icon: '🍃', color: '#00ed64' },
      { id: 'diff', name: 'Diff', icon: '📝', color: '#7c3aed' },
      { id: 'jwt', name: 'JWT', icon: '🔐', color: '#d946ef' },
      { id: 'regex', name: i18n.t('stats.regex'), icon: '🔣', color: '#0891b2' },
      // 系统页面
      { id: '__about__', name: i18n.t('sidebar.about'), icon: 'ℹ️', color: '#6b7280' },
      { id: '__settings__', name: i18n.t('sidebar.settings'), icon: '⚙️', color: '#6b7280' },
      { id: '__stats__', name: i18n.t('sidebar.stats'), icon: '📊', color: '#6b7280' },
      { id: '__worldmap__', name: i18n.t('worldMap.online'), icon: '🌍', color: '#6b7280' },
    ];

    toolsList.forEach(tool => {
      this.toolsMap[tool.id] = tool;
    });
  }

  private render(): void {
    this.container.innerHTML = getStatsTemplate();
  }

  private bindEvents(): void {
    // 周期切换
    this.container.querySelectorAll('.period-btn').forEach(btn => {
      this.addListener(btn as HTMLElement, 'click', () => {
        this.container.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPeriod = btn.getAttribute('data-period') as any;
        this.refreshStats();
      });
    });

    // 排行类型切换
    this.container.querySelectorAll('.ranking-tab').forEach(tab => {
      this.addListener(tab as HTMLElement, 'click', () => {
        this.container.querySelectorAll('.ranking-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.rankingType = tab.getAttribute('data-type') as any;
        this.renderRanking();
      });
    });

    // 导出数据
    const exportBtn = this.container.querySelector('#exportStats');
    if (exportBtn) {
      this.addListener(exportBtn as HTMLElement, 'click', () => this.exportData());
    }

    // 导入数据
    const importBtn = this.container.querySelector('#importStats');
    const importFile = this.container.querySelector('#importStatsFile') as HTMLInputElement;
    if (importBtn && importFile) {
      this.addListener(importBtn as HTMLElement, 'click', () => importFile.click());
      this.addListener(importFile, 'change', () => this.importData(importFile));
    }

    // 清除数据
    const clearBtn = this.container.querySelector('#clearStats');
    if (clearBtn) {
      this.addListener(clearBtn as HTMLElement, 'click', () => {
        if (confirm(i18n.t('stats.confirmClear'))) {
          localStorage.removeItem(STORAGE_KEY);
          this.refreshStats();
          this.showToast(i18n.t('stats.dataCleared'));
        }
      });
    }

    // 创建 tooltip
    this.createTooltip();
  }

  private addListener(el: HTMLElement, type: string, handler: EventListener): void {
    el.addEventListener(type, handler);
    this.eventListeners.push({ el, type, handler });
  }

  public refresh(): void {
    this.refreshStats();
  }

  private refreshStats(): void {
    const data = this.getStatsData();
    const periodData = this.filterByPeriod(data);

    this.renderOverview(periodData);
    this.renderHeatmap(data);
    this.renderDailyChart(periodData);
    this.renderRanking();
    this.renderHoursChart(periodData);
  }

  private getStatsData(): DailySummary[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private filterByPeriod(data: DailySummary[]): DailySummary[] {
    const now = new Date();
    let days = 7;
    if (this.currentPeriod === 'month') days = 30;
    if (this.currentPeriod === 'year') days = 365;

    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    return data.filter(d => d.date >= cutoffStr);
  }

  private renderOverview(data: DailySummary[]): void {
    const totalMs = data.reduce((sum, d) => sum + d.totalDuration, 0);
    const totalHours = totalMs / 1000 / 60 / 60;
    const totalTimeEl = this.container.querySelector('#totalTime');
    if (totalTimeEl) {
      if (totalHours < 1) {
        totalTimeEl.textContent = `${Math.round(totalMs / 1000 / 60)}m`;
      } else {
        totalTimeEl.textContent = `${totalHours.toFixed(1)}h`;
      }
    }

    const activeDaysEl = this.container.querySelector('#activeDays');
    if (activeDaysEl) {
      activeDaysEl.textContent = String(data.length);
    }

    const toolStats: { [id: string]: number } = {};
    data.forEach(d => {
      Object.entries(d.tools).forEach(([toolId, stats]) => {
        toolStats[toolId] = (toolStats[toolId] || 0) + stats.duration;
      });
    });
    const sorted = Object.entries(toolStats).sort((a, b) => b[1] - a[1]);
    const favoriteToolEl = this.container.querySelector('#favoriteTool');
    if (favoriteToolEl) {
      if (sorted.length > 0) {
        const toolInfo = this.toolsMap[sorted[0][0]];
        favoriteToolEl.textContent = toolInfo?.name || sorted[0][0];
      } else {
        favoriteToolEl.textContent = '-';
      }
    }

    const toolsUsedEl = this.container.querySelector('#toolsUsed');
    if (toolsUsedEl) {
      const uniqueTools = new Set<string>();
      data.forEach(d => {
        Object.keys(d.tools).forEach(id => uniqueTools.add(id));
      });
      toolsUsedEl.textContent = String(uniqueTools.size);
    }

    this.renderStreak();
  }

  private renderStreak(): void {
    const allData = this.getStatsData();
    const today = new Date().toISOString().split('T')[0];
    const dates = new Set(allData.map(d => d.date));

    let streak = 0;
    let checkDate = new Date();

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr === today) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const streakEl = this.container.querySelector('#streakDays');
    if (streakEl) {
      streakEl.textContent = String(streak);
    }
  }

  private renderHeatmap(data: DailySummary[]): void {
    const grid = this.container.querySelector('#heatmapGrid');
    const monthsEl = this.container.querySelector('#heatmapMonths');
    if (!grid || !monthsEl) return;

    const dateMap: { [date: string]: number } = {};
    data.forEach(d => {
      dateMap[d.date] = d.totalDuration;
    });

    const maxDuration = Math.max(...Object.values(dateMap), 1);

    const today = new Date();
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 1);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const currentDate = new Date(startDate);
    while (currentDate <= today) {
      currentWeek.push(new Date(currentDate));
      if (currentDate.getDay() === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    // 渲染月份标签（等间距，显示每个月的第一周位置）
    const monthLabels: string[] = [];
    const monthNames = i18n.t('stats.monthNames').split(',');
    let lastMonth = -1;
    
    weeks.forEach((week, i) => {
      const firstDay = week[0];
      if (firstDay) {
        const currentMonth = firstDay.getMonth();
        // 当月份变化时，在该周位置显示月份标签
        if (currentMonth !== lastMonth) {
          lastMonth = currentMonth;
          const left = i * 17; // 每周宽度 = 格子14px + 间距3px
          monthLabels.push(`<span style="left: ${left}px">${monthNames[currentMonth]}</span>`);
        }
      }
    });
    monthsEl.innerHTML = monthLabels.join('');

    grid.innerHTML = weeks.map(week => {
      const days = week.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        const duration = dateMap[dateStr] || 0;
        const level = this.getLevel(duration, maxDuration);
        const durationMin = Math.round(duration / 1000 / 60);
        return `<div class="heatmap-day level-${level}" 
                     data-date="${dateStr}" 
                     data-duration="${durationMin}"></div>`;
      }).join('');
      return `<div class="heatmap-week">${days}</div>`;
    }).join('');

    grid.querySelectorAll('.heatmap-day').forEach(day => {
      this.addListener(day as HTMLElement, 'mouseenter', (e) => this.showHeatmapTooltip(e as MouseEvent));
      this.addListener(day as HTMLElement, 'mouseleave', () => this.hideTooltip());
      // 新增：点击选择日期
      this.addListener(day as HTMLElement, 'click', (e) => this.selectDate(e as MouseEvent));
    });
  }

  private getLevel(duration: number, max: number): number {
    if (duration === 0) return 0;
    const ratio = duration / max;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.75) return 3;
    return 4;
  }

  private renderDailyChart(data: DailySummary[]): void {
    const chart = this.container.querySelector('#dailyChart');
    if (!chart) return;

    if (data.length === 0) {
      chart.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3v18h18"/>
            <path d="M18 17V9"/>
            <path d="M13 17V5"/>
            <path d="M8 17v-3"/>
          </svg>
          <p>${i18n.t('stats.noData')}</p>
        </div>
      `;
      return;
    }

    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const maxDuration = Math.max(...sorted.map(d => d.totalDuration), 1);

    chart.innerHTML = sorted.map(d => {
      const height = Math.max((d.totalDuration / maxDuration) * 140, 4);
      const minutes = Math.round(d.totalDuration / 1000 / 60);
      const dateObj = new Date(d.date);
      const label = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
      return `
        <div class="chart-bar-wrapper" title="${d.date}: ${minutes}${i18n.t('common.minutes')}">
          <div class="chart-bar" style="height: ${height}px"></div>
          <div class="chart-label">${label}</div>
        </div>
      `;
    }).join('');
  }

  private renderRanking(): void {
    const list = this.container.querySelector('#toolRanking');
    if (!list) return;

    const data = this.filterByPeriod(this.getStatsData());

    const toolStats: { [id: string]: { duration: number; count: number } } = {};
    data.forEach(d => {
      Object.entries(d.tools).forEach(([toolId, stats]) => {
        if (!toolStats[toolId]) {
          toolStats[toolId] = { duration: 0, count: 0 };
        }
        toolStats[toolId].duration += stats.duration;
        toolStats[toolId].count += stats.count;
      });
    });

    const sorted = Object.entries(toolStats).sort((a, b) => {
      if (this.rankingType === 'time') {
        return b[1].duration - a[1].duration;
      }
      return b[1].count - a[1].count;
    });

    if (sorted.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
          </svg>
          <p>${i18n.t('stats.noUsageRecord')}</p>
        </div>
      `;
      return;
    }

    const maxValue = this.rankingType === 'time' 
      ? sorted[0][1].duration 
      : sorted[0][1].count;

    list.innerHTML = sorted.slice(0, 10).map(([toolId, stats], index) => {
      const tool = this.toolsMap[toolId] || { name: toolId, icon: '🔧', color: '#6b7280' };
      const value = this.rankingType === 'time' ? stats.duration : stats.count;
      const percent = (value / maxValue) * 100;
      const displayValue = this.rankingType === 'time'
        ? this.formatDuration(stats.duration)
        : `${stats.count}${i18n.t('common.times')}`;

      let rankClass = 'normal';
      if (index === 0) rankClass = 'top-1';
      else if (index === 1) rankClass = 'top-2';
      else if (index === 2) rankClass = 'top-3';

      return `
        <div class="ranking-item">
          <div class="ranking-rank ${rankClass}">${index + 1}</div>
          <div class="ranking-icon" style="background: ${tool.color}">${tool.icon}</div>
          <div class="ranking-info">
            <div class="ranking-name">${tool.name}</div>
            <div class="ranking-bar-wrapper">
              <div class="ranking-bar" style="width: ${percent}%"></div>
            </div>
          </div>
          <div class="ranking-value">${displayValue}</div>
        </div>
      `;
    }).join('');
  }

  private renderHoursChart(data: DailySummary[]): void {
    const chart = this.container.querySelector('#hoursChart');
    const hoursTitle = this.container.querySelector('#hoursChartTitle');
    if (!chart) return;

    let hours: number[] = new Array(24).fill(0);
    let titleText = i18n.t('stats.hourlyDist');
    
    if (this.selectedDate) {
      // 显示选中日期的时段分布
      const dayData = this.getStatsData().find(d => d.date === this.selectedDate);
      if (dayData?.hours) {
        hours = dayData.hours;
      }
      const dateObj = new Date(this.selectedDate);
      titleText = `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${i18n.t('stats.hourlyUsage')}`;
    } else {
      // 显示当前周期内的累计时段分布
      data.forEach(d => {
        if (d.hours) {
          d.hours.forEach((v, i) => {
            hours[i] += v;
          });
        }
      });
      
      // 如果没有按日期存储的数据，回退到全局数据
      const hasHoursData = hours.some(h => h > 0);
      if (!hasHoursData) {
        try {
          const hoursData = localStorage.getItem('toolhub_hours_stats');
          if (hoursData) {
            const parsed = JSON.parse(hoursData);
            parsed.forEach((v: number, i: number) => {
              hours[i] = v;
            });
          }
        } catch {}
      }
      
      const periodText = this.currentPeriod === 'week' ? i18n.t('stats.thisWeek') : 
                         this.currentPeriod === 'month' ? i18n.t('stats.thisMonth') : i18n.t('stats.thisYear');
      titleText = `${periodText}${i18n.t('stats.hourlyDist')}`;
    }

    // 更新标题
    if (hoursTitle) {
      hoursTitle.textContent = titleText;
    }

    const maxHour = Math.max(...hours, 1);

    chart.innerHTML = hours.map((h, i) => {
      const height = Math.max((h / maxHour) * 50, 4);
      return `<div class="hour-bar" style="height: ${height}px" title="${i}:00 - ${i + 1}:00: ${Math.round(h / 1000 / 60)}${i18n.t('common.minutes')}"></div>`;
    }).join('');
  }

  private selectDate(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const date = target.getAttribute('data-date');
    
    if (!date) return;
    
    // 切换选中状态
    if (this.selectedDate === date) {
      // 取消选中
      this.selectedDate = null;
      target.classList.remove('selected');
    } else {
      // 选中新日期
      this.container.querySelectorAll('.heatmap-day.selected').forEach(el => {
        el.classList.remove('selected');
      });
      this.selectedDate = date;
      target.classList.add('selected');
    }
    
    // 重新渲染时段图表
    const periodData = this.filterByPeriod(this.getStatsData());
    this.renderHoursChart(periodData);
  }

  private formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 1000 / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  }

  private createTooltip(): void {
    if (this.tooltip) return;
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'heatmap-tooltip';
    this.tooltip.style.display = 'none';
    document.body.appendChild(this.tooltip);
  }

  private showHeatmapTooltip(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const date = target.getAttribute('data-date');
    const duration = parseInt(target.getAttribute('data-duration') || '0', 10);

    if (!this.tooltip || !date) return;

    const dateObj = new Date(date);
    const weekdays = i18n.t('stats.weekdayNames').split(',');
    const dateStr = `${dateObj.getFullYear()}/${dateObj.getMonth() + 1}/${dateObj.getDate()} ${weekdays[dateObj.getDay()]}`;

    this.tooltip.innerHTML = `
      <div class="tooltip-date">${dateStr}</div>
      <div class="tooltip-value">${duration > 0 ? `${i18n.t('stats.used')} ${duration} ${i18n.t('common.minutes')}` : i18n.t('stats.noUsage')}</div>
    `;

    const rect = target.getBoundingClientRect();
    this.tooltip.style.left = `${rect.left + rect.width / 2}px`;
    this.tooltip.style.top = `${rect.top - 8}px`;
    this.tooltip.style.transform = 'translate(-50%, -100%)';
    this.tooltip.style.display = 'block';
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  private exportData(): void {
    const data = this.getStatsData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `toolhub-stats-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast(i18n.t('stats.dataExported'));
  }

  private importData(input: HTMLInputElement): void {
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content) as DailySummary[];

        // 验证数据格式
        if (!Array.isArray(importedData)) {
          throw new Error(i18n.t('stats.invalidDataFormat'));
        }

        // 验证每条记录的格式
        for (const item of importedData) {
          if (!item.date || typeof item.totalDuration !== 'number' || !item.tools) {
            throw new Error(i18n.t('stats.missingFields'));
          }
        }

        // 获取现有数据
        const existingData = this.getStatsData();
        const existingMap = new Map(existingData.map(d => [d.date, d]));

        // 合并数据（导入的数据会覆盖同日期的现有数据）
        for (const item of importedData) {
          existingMap.set(item.date, item);
        }

        // 转换回数组并按日期排序
        const mergedData = Array.from(existingMap.values()).sort((a, b) => 
          a.date.localeCompare(b.date)
        );

        // 保存合并后的数据
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedData));

        // 刷新显示
        this.refreshStats();
        this.showToast(`${i18n.t('stats.importSuccess')} ${importedData.length} ${i18n.t('stats.records')}`);
      } catch (err) {
        this.showToast(`${i18n.t('stats.importFailed')}${err instanceof Error ? err.message : i18n.t('common.unknownError')}`);
      }

      // 重置 input 以便可以再次选择同一文件
      input.value = '';
    };

    reader.onerror = () => {
      this.showToast(i18n.t('stats.readFileFailed'));
      input.value = '';
    };

    reader.readAsText(file);
  }

  private showToast(msg: string): void {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.innerHTML = `<div class="toast-item">${msg}</div>`;
      setTimeout(() => { toast.innerHTML = ''; }, 2000);
    }
  }

  public destroy(): void {
    // 移除事件监听
    this.eventListeners.forEach(({ el, type, handler }) => {
      el.removeEventListener(type, handler);
    });
    this.eventListeners = [];

    // 移除 tooltip
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
      this.tooltip = null;
    }
  }
}
