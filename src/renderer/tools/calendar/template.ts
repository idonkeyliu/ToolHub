export const template = `
<div class="calendar-container">
  <div class="calendar-main">
    <div class="calendar-left">
      <div class="calendar-header">
        <button class="nav-btn" id="prevMonth">‹</button>
        <span class="month-year" id="monthYear"></span>
        <button class="nav-btn" id="nextMonth">›</button>
      </div>
      
      <div class="calendar-grid" id="calendarGrid">
        <div class="day-header">日</div>
        <div class="day-header">一</div>
        <div class="day-header">二</div>
        <div class="day-header">三</div>
        <div class="day-header">四</div>
        <div class="day-header">五</div>
        <div class="day-header">六</div>
      </div>
    </div>
    
    <div class="calendar-right">
      <div class="date-detail-card" id="dateDetailCard">
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <div>点击左侧日期查看详情</div>
        </div>
      </div>
    </div>
  </div>
</div>
`;
