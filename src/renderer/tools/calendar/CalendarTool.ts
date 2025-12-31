import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { getTemplate } from './template';
import { i18n } from '../../core/i18n';

// 农历数据 (1900-2100)
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520
];

interface LunarInfo {
  year: number;
  month: number;
  day: number;
  isLeap: boolean;
}

// 解析节日配置
function parseFestivals(str: string): Record<string, string> {
  const result: Record<string, string> = {};
  str.split(',').forEach(item => {
    const [key, value] = item.split(':');
    if (key && value) {
      result[key] = value;
    }
  });
  return result;
}

export class CalendarTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'calendar',
    title: i18n.t('tool.calendar'),
    category: ToolCategory.UTILITY,
    icon: '📅',
    description: i18n.t('tool.calendarDesc'),
    keywords: ['calendar', 'lunar', 'festival'],
  };

  readonly config = CalendarTool.config;

  private displayYear: number;
  private displayMonth: number;

  constructor() {
    super();
    const today = new Date();
    this.displayYear = today.getFullYear();
    this.displayMonth = today.getMonth() + 1;
  }

  render(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = getTemplate();
    return container.firstElementChild as HTMLElement;
  }

  protected bindEvents(): void {
    this.bindNavEvents();
    this.renderCalendar();
    this.showTodayInfo();
  }

  private bindNavEvents(): void {
    const prevBtn = this.querySelector('#prevMonth');
    const nextBtn = this.querySelector('#nextMonth');

    if (prevBtn) {
      this.addEventListener(prevBtn, 'click', () => {
        if (this.displayMonth === 1) {
          this.displayMonth = 12;
          this.displayYear--;
        } else {
          this.displayMonth--;
        }
        this.renderCalendar();
      });
    }

    if (nextBtn) {
      this.addEventListener(nextBtn, 'click', () => {
        if (this.displayMonth === 12) {
          this.displayMonth = 1;
          this.displayYear++;
        } else {
          this.displayMonth++;
        }
        this.renderCalendar();
      });
    }
  }

  private renderCalendar(): void {
    const monthYearEl = this.querySelector('#monthYear');
    const calendarGrid = this.querySelector('#calendarGrid');

    if (monthYearEl) {
      monthYearEl.textContent = i18n.t('calendar.yearMonth', '', { year: this.displayYear, month: this.displayMonth });
    }

    if (!calendarGrid) return;

    // 保留表头
    const headers = calendarGrid.querySelectorAll('.day-header');
    calendarGrid.innerHTML = '';
    headers.forEach(header => calendarGrid.appendChild(header));

    // 获取本月信息
    const firstDay = new Date(this.displayYear, this.displayMonth - 1, 1);
    const lastDay = new Date(this.displayYear, this.displayMonth, 0);
    const today = new Date();

    // 计算本月1号是星期几
    const firstWeekday = this.getWeekdayZeller(this.displayYear, this.displayMonth, 1);

    // 添加空白格子
    for (let i = 0; i < firstWeekday; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'day-cell empty';
      calendarGrid.appendChild(emptyCell);
    }

    // 填充本月日期
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const isToday = today.getFullYear() === this.displayYear &&
        today.getMonth() + 1 === this.displayMonth &&
        today.getDate() === day;
      const cell = this.createDayCell(this.displayYear, this.displayMonth, day, isToday);
      calendarGrid.appendChild(cell);
    }

    // 填充剩余空白格子
    const totalCellsUsed = firstWeekday + lastDay.getDate();
    const totalRows = Math.ceil(totalCellsUsed / 7);
    const totalCellsNeeded = totalRows * 7;

    for (let i = totalCellsUsed; i < totalCellsNeeded; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'day-cell empty';
      calendarGrid.appendChild(emptyCell);
    }
  }

  private createDayCell(year: number, month: number, day: number, isToday: boolean): HTMLElement {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (isToday) cell.classList.add('today');

    const lunarInfo = this.solarToLunar(year, month, day);
    const lunarMonthStr = this.getLunarMonthString(lunarInfo.month);
    const lunarDayStr = this.getLunarDayString(lunarInfo.day);
    const lunarDisplay = lunarInfo.day === 1 ? lunarMonthStr : lunarDayStr;

    const solarTerm = this.getSolarTerm(year, month, day);
    const festivals = this.getFestival(lunarInfo, month, day);

    const leapStr = lunarInfo.isLeap ? i18n.t('calendar.leap') : '';
    cell.innerHTML = `
      <div class="solar-date">${day}</div>
      <div class="lunar-date">${leapStr}${lunarDisplay}</div>
      ${festivals.map(f => `<div class="festival">${f}</div>`).join('')}
      ${solarTerm ? `<div class="solar-term">${solarTerm}</div>` : ''}
    `;

    this.addEventListener(cell, 'click', () => {
      this.container?.querySelectorAll('.day-cell.selected').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      
      const weekday = this.getWeekdayZeller(year, month, day);
      const weekdayNames = i18n.t('calendar.weekdayNames').split(',');
      this.showDateInfo(year, month, day, lunarInfo, weekdayNames[weekday], festivals, solarTerm);
    });

    return cell;
  }

  private showTodayInfo(): void {
    const today = new Date();
    const lunarInfo = this.solarToLunar(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const weekday = this.getWeekdayZeller(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const weekdayNames = i18n.t('calendar.weekdayNames').split(',');
    const festivals = this.getFestival(lunarInfo, today.getMonth() + 1, today.getDate());
    const solarTerm = this.getSolarTerm(today.getFullYear(), today.getMonth() + 1, today.getDate());

    this.showDateInfo(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate(),
      lunarInfo,
      weekdayNames[weekday],
      festivals,
      solarTerm
    );
  }

  private showDateInfo(
    year: number, month: number, day: number,
    lunarInfo: LunarInfo, weekday: string,
    festivals: string[], solarTerm: string
  ): void {
    const lunarMonthStr = this.getLunarMonthString(lunarInfo.month);
    const lunarDayStr = this.getLunarDayString(lunarInfo.day);
    const leapStr = lunarInfo.isLeap ? i18n.t('calendar.leap') : '';
    const separator = i18n.t('calendar.lunarSeparator');
    const lunarFullStr = `${leapStr}${lunarMonthStr}${separator}${lunarDayStr}`;

    const dateDetailCard = this.querySelector('#dateDetailCard');
    if (!dateDetailCard) return;

    const weekdayPrefix = i18n.t('calendar.weekdayPrefix');
    const yearMonthStr = i18n.t('calendar.yearMonth', '', { year, month });
    const lunarYearStr = i18n.t('calendar.lunarYear', '', { year: lunarInfo.year });

    let contentHTML = `
      <div class="date-number-display">
        <div class="date-year-month">${yearMonthStr}</div>
        <div class="date-main-number">${day}</div>
        <div class="date-weekday">${weekdayPrefix}${weekday}</div>
      </div>
      
      <div class="lunar-info-section">
        <div class="lunar-title">${i18n.t('calendar.lunarInfo')}</div>
        <div class="lunar-date-large">${lunarFullStr}</div>
        <div class="lunar-year-info">${lunarYearStr}</div>
      </div>
    `;

    if (festivals.length > 0) {
      contentHTML += `
      <div class="festival-section">
        <div class="festival-title">${i18n.t('calendar.festival')}</div>
        <div class="festival-list">
          ${festivals.map(f => `<div class="festival-item">${f}</div>`).join('')}
        </div>
      </div>`;
    }

    if (solarTerm) {
      contentHTML += `
      <div class="solar-term-section">
        <div class="solar-term-title">${i18n.t('calendar.solarTerm')}</div>
        <div class="solar-term-large">${solarTerm}</div>
      </div>`;
    }

    dateDetailCard.innerHTML = contentHTML;
  }

  // Zeller公式计算星期几
  private getWeekdayZeller(year: number, month: number, day: number): number {
    let m = month;
    let y = year;
    if (m < 3) {
      m += 12;
      y--;
    }
    const c = Math.floor(y / 100);
    const yy = y % 100;
    const w = (yy + Math.floor(yy / 4) + Math.floor(c / 4) - 2 * c + Math.floor(26 * (m + 1) / 10) + day - 1) % 7;
    return (w + 7) % 7;
  }

  // 获取农历年信息
  private getLunarYearInfo(year: number): { months: number[]; leapMonth: number; leap29: number } {
    const yearData = LUNAR_INFO[year - 1900];
    const leapMonth = (yearData & 0xf);
    const leap29 = (yearData & 0x10000) ? 30 : 29;

    const months: number[] = [];
    for (let i = 1; i <= 12; i++) {
      const days = (yearData & (0x10000 >> i)) ? 30 : 29;
      months.push(days);
    }

    return { months, leapMonth, leap29 };
  }

  // 计算从1900年1月31日到指定日期的总天数
  private getDaysFromLunarBase(year: number, month: number, day: number): number {
    const baseDate = new Date(1900, 0, 31);
    const targetDate = new Date(year, month - 1, day);
    return Math.floor((targetDate.getTime() - baseDate.getTime()) / 86400000);
  }

  // 公历转农历
  private solarToLunar(year: number, month: number, day: number): LunarInfo {
    const totalDays = this.getDaysFromLunarBase(year, month, day);
    let lunarYear = 1900;
    let remainDays = totalDays;

    while (remainDays > 0) {
      const yearInfo = this.getLunarYearInfo(lunarYear);
      let yearDays = yearInfo.months.reduce((sum, days) => sum + days, 0);
      if (yearInfo.leapMonth > 0) {
        yearDays += yearInfo.leap29;
      }

      if (remainDays < yearDays) break;
      remainDays -= yearDays;
      lunarYear++;
    }

    const yearInfo = this.getLunarYearInfo(lunarYear);
    let lunarMonth = 1;
    let isLeap = false;

    for (let i = 1; i <= 12; i++) {
      const monthDays = yearInfo.months[i - 1];

      if (remainDays < monthDays) {
        lunarMonth = i;
        break;
      }
      remainDays -= monthDays;

      if (i === yearInfo.leapMonth && remainDays >= 0) {
        if (remainDays < yearInfo.leap29) {
          lunarMonth = i;
          isLeap = true;
          break;
        }
        remainDays -= yearInfo.leap29;
      }
    }

    const lunarDay = remainDays + 1;
    return { year: lunarYear, month: lunarMonth, day: lunarDay, isLeap };
  }

  // 农历日期转中文
  private getLunarDayString(day: number): string {
    const days = i18n.t('calendar.lunarDays').split(',');
    return days[day] || '';
  }

  private getLunarMonthString(month: number): string {
    const months = i18n.t('calendar.lunarMonths').split(',');
    return months[month] || '';
  }

  // 获取节气
  private getSolarTerm(year: number, month: number, day: number): string {
    const termDates = [
      [6, 20], [20, 4], [4, 18], [19, 5], [6, 20], [21, 5],
      [5, 20], [20, 6], [6, 21], [21, 6], [6, 21], [22, 7],
      [7, 22], [23, 8], [8, 23], [23, 8], [8, 23], [23, 9],
      [8, 23], [23, 10], [8, 22], [22, 11], [7, 22], [21, 12]
    ];

    const solarTerms = i18n.t('calendar.solarTerms').split(',');
    const monthIndex = month - 1;
    const term1 = termDates[monthIndex * 2];
    const term2 = termDates[monthIndex * 2 + 1];

    if (day === term1[0]) return solarTerms[monthIndex * 2];
    if (day === term2[0]) return solarTerms[monthIndex * 2 + 1];
    return '';
  }

  // 获取节日
  private getFestival(lunarInfo: LunarInfo, month: number, day: number): string[] {
    const festivals: string[] = [];

    const solarFestivals = parseFestivals(i18n.t('calendar.solarFestivals'));
    const lunarFestivals = parseFestivals(i18n.t('calendar.lunarFestivals'));

    const solarKey = `${month}-${day}`;
    if (solarFestivals[solarKey]) {
      festivals.push(solarFestivals[solarKey]);
    }

    const lunarKey = `${lunarInfo.month}-${lunarInfo.day}`;
    if (lunarFestivals[lunarKey]) {
      festivals.push(lunarFestivals[lunarKey]);
    }

    return festivals;
  }
}
