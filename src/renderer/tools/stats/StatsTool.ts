/**
 * 使用追踪器
 */

// 每日汇总
interface DailySummary {
  date: string;
  totalDuration: number;
  tools: { [toolId: string]: { duration: number; count: number } };
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
        daySummary = { date: today, totalDuration: 0, tools: {} };
        data.push(daySummary);
      }

      daySummary.totalDuration += duration;

      if (!daySummary.tools[session.toolId]) {
        daySummary.tools[session.toolId] = { duration: 0, count: 0 };
      }
      daySummary.tools[session.toolId].duration += duration;
      daySummary.tools[session.toolId].count += 1;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      // 记录时段数据
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
