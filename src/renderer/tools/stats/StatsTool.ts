/**
 * 使用追踪器
 */

// 每日汇总
interface DailySummary {
  date: string;
  totalDuration: number;
  tools: { [toolId: string]: { duration: number; count: number } };
  hours?: number[]; // 新增：每日的24小时使用时长分布
}

// 存储键
const STORAGE_KEY = 'toolhub_usage_stats';
const CURRENT_SESSION_KEY = 'toolhub_current_session';

// === 使用追踪器（静态工具类） ===
export const UsageTracker = {
  start(toolId: string): void {
    const session = {
      toolId,
      startTime: Date.now(),
      hour: new Date().getHours(),
    };
    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
  },

  end(): void {
    const raw = localStorage.getItem(CURRENT_SESSION_KEY);
    if (!raw) return;

    try {
      const session = JSON.parse(raw);
      const duration = Date.now() - session.startTime;

      // 忽略太短的使用（小于 3 秒）
      if (duration < 3000) {
        localStorage.removeItem(CURRENT_SESSION_KEY);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      let data: DailySummary[] = [];
      
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        data = stored ? JSON.parse(stored) : [];
      } catch {}

      let daySummary = data.find(d => d.date === today);
      if (!daySummary) {
        daySummary = { date: today, totalDuration: 0, tools: {}, hours: new Array(24).fill(0) };
        data.push(daySummary);
      }

      // 确保 hours 数组存在（兼容旧数据）
      if (!daySummary.hours) {
        daySummary.hours = new Array(24).fill(0);
      }

      daySummary.totalDuration += duration;

      if (!daySummary.tools[session.toolId]) {
        daySummary.tools[session.toolId] = { duration: 0, count: 0 };
      }
      daySummary.tools[session.toolId].duration += duration;
      daySummary.tools[session.toolId].count += 1;

      // 记录当天的小时使用数据
      daySummary.hours[session.hour] = (daySummary.hours[session.hour] || 0) + duration;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      // 同时更新全局时段数据（保持向后兼容）
      UsageTracker.recordHourUsage(session.hour, duration);

      localStorage.removeItem(CURRENT_SESSION_KEY);
    } catch {}
  },

  recordHourUsage(hour: number, duration: number): void {
    try {
      let hours: number[] = new Array(24).fill(0);
      const raw = localStorage.getItem('toolhub_hours_stats');
      if (raw) {
        hours = JSON.parse(raw);
      }
      hours[hour] = (hours[hour] || 0) + duration;
      localStorage.setItem('toolhub_hours_stats', JSON.stringify(hours));
    } catch {}
  },
};
