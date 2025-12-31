import { i18n } from '../../core/i18n';

export const getStatsTemplate = () => `
<div class="stats-container">
  <!-- 概览卡片 -->
  <div class="stats-overview-wrapper">
    <div class="stats-period">
      <button class="period-btn active" data-period="week">${i18n.t('stats.last7Days')}</button>
      <button class="period-btn" data-period="month">${i18n.t('stats.last30Days')}</button>
      <button class="period-btn" data-period="year">${i18n.t('stats.lastYear')}</button>
    </div>
    <div class="stats-overview">
    <div class="overview-card">
      <div class="card-icon" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
      </div>
      <div class="card-content">
        <div class="card-value" id="totalTime">0h</div>
        <div class="card-label">${i18n.t('stats.totalTime')}</div>
      </div>
    </div>
    <div class="overview-card">
      <div class="card-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      <div class="card-content">
        <div class="card-value" id="activeDays">0</div>
        <div class="card-label">${i18n.t('stats.activeDays')}</div>
      </div>
    </div>
    <div class="overview-card">
      <div class="card-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      </div>
      <div class="card-content">
        <div class="card-value" id="favoriteTool">-</div>
        <div class="card-label">${i18n.t('stats.favoriteTool')}</div>
      </div>
    </div>
    <div class="overview-card">
      <div class="card-icon" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      </div>
      <div class="card-content">
        <div class="card-value" id="toolsUsed">0</div>
        <div class="card-label">${i18n.t('stats.toolsUsed')}</div>
      </div>
    </div>
    </div>
  </div>

  <!-- 主体内容 -->
  <div class="stats-body">
    <!-- 左侧：热力图 -->
    <div class="stats-left">
      <div class="section-card heatmap-section">
        <div class="section-header">
          <h3>${i18n.t('stats.activity')}</h3>
          <div class="streak-info">
            <span class="streak-badge" id="currentStreak">
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              ${i18n.t('stats.streak')} <span id="streakDays">0</span> ${i18n.t('common.days')}
            </span>
          </div>
        </div>
        <div class="heatmap-wrapper">
          <div class="heatmap-months" id="heatmapMonths"></div>
          <div class="heatmap-content">
            <div class="heatmap-weekdays">
              <span></span>
              <span>2</span>
              <span></span>
              <span>4</span>
              <span></span>
              <span>6</span>
              <span></span>
            </div>
            <div class="heatmap-grid" id="heatmapGrid"></div>
          </div>
        </div>
        <div class="heatmap-legend">
          <span class="legend-label">${i18n.t('stats.less')}</span>
          <div class="legend-boxes">
            <div class="legend-box level-0"></div>
            <div class="legend-box level-1"></div>
            <div class="legend-box level-2"></div>
            <div class="legend-box level-3"></div>
            <div class="legend-box level-4"></div>
          </div>
          <span class="legend-label">${i18n.t('stats.more')}</span>
        </div>
      </div>

      <!-- 每日使用时长趋势 -->
      <div class="section-card chart-section">
        <div class="section-header">
          <h3>${i18n.t('stats.dailyUsage')}</h3>
        </div>
        <div class="chart-container" id="dailyChart"></div>
      </div>
    </div>

    <!-- 右侧：工具分析 -->
    <div class="stats-right">
      <!-- 工具使用排行 -->
      <div class="section-card ranking-section">
        <div class="section-header">
          <h3>${i18n.t('stats.toolRanking')}</h3>
          <div class="ranking-tabs">
            <button class="ranking-tab active" data-type="time">${i18n.t('stats.duration')}</button>
            <button class="ranking-tab" data-type="count">${i18n.t('stats.count')}</button>
          </div>
        </div>
        <div class="ranking-list" id="toolRanking"></div>
      </div>

      <!-- 使用时段分布 -->
      <div class="section-card hours-section">
        <div class="section-header">
          <h3 id="hoursChartTitle">${i18n.t('stats.hourlyDistribution')}</h3>
          <span class="hours-hint">${i18n.t('stats.clickHeatmap')}</span>
        </div>
        <div class="hours-chart" id="hoursChart"></div>
        <div class="hours-labels">
          <span>0</span>
          <span>6</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 工具栏 -->
  <div class="stats-toolbar">
    <button class="toolbar-btn" id="exportStats">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7,10 12,15 17,10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      ${i18n.t('stats.exportData')}
    </button>
    <button class="toolbar-btn" id="importStats">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17,8 12,3 7,8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      ${i18n.t('stats.importData')}
    </button>
    <input type="file" id="importStatsFile" accept=".json" style="display: none;">
    <button class="toolbar-btn danger" id="clearStats">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3,6 5,6 21,6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
      ${i18n.t('stats.clearData')}
    </button>
  </div>
</div>
`;
