import { i18n } from '../../core/i18n';

export const getTemplate = () => {
  const weekdays = i18n.t('calendar.weekdays').split(',');
  return `
<div class="calendar-container">
  <div class="calendar-main">
    <div class="calendar-left">
      <div class="calendar-header">
        <button class="nav-btn" id="prevMonth">‹</button>
        <span class="month-year" id="monthYear"></span>
        <button class="nav-btn" id="nextMonth">›</button>
      </div>
      
      <div class="calendar-grid" id="calendarGrid">
        ${weekdays.map(day => `<div class="day-header">${day}</div>`).join('')}
      </div>
    </div>
    
    <div class="calendar-right">
      <div class="date-detail-card" id="dateDetailCard">
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <div>${i18n.t('calendar.clickToView')}</div>
        </div>
      </div>
    </div>
  </div>
</div>
`;
};
