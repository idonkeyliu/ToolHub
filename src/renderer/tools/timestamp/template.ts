/**
 * 时间戳工具模板
 */

import { i18n } from '../../core/i18n';

function two(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function getTemplate(now: Date = new Date()): string {
  const sec = Math.floor(now.getTime() / 1000);
  const ms = now.getTime();
  const y = now.getFullYear();
  const M = two(now.getMonth() + 1);
  const d = two(now.getDate());
  const hh = two(now.getHours());
  const mm = two(now.getMinutes());
  const ss = two(now.getSeconds());

  return `
    <div class="time-wrap">
      <!-- 顶部装饰时钟框 -->
      <div class="time-clock-frame">
        <div class="clock-inner">
          <div class="time-clock-row">
            <span class="clock-block year">${y}</span>
            <span class="clock-sep">-</span>
            <span class="clock-block month">${M}</span>
            <span class="clock-sep">-</span>
            <span class="clock-block day">${d}</span>
            <span class="clock-space"></span>
            <span class="clock-block hour">${hh}</span>
            <span class="clock-colon time-colon">:</span>
            <span class="clock-block minute">${mm}</span>
            <span class="clock-colon time-colon">:</span>
            <span class="clock-block second">${ss}</span>
          </div>
        </div>
      </div>

      <!-- 时间戳卡片组 -->
      <div class="stamp-cards">
        <div class="stamp-card">
          <div class="stamp-card-header">
            <span class="stamp-card-icon">⏱️</span>
            <span class="stamp-card-title">${i18n.t('timestamp.unixSec')}</span>
          </div>
          <div class="stamp-card-body">
            <span class="stamp-card-value" id="unixSecVal">${sec}</span>
          </div>
          <button class="stamp-card-copy" data-target="unixSecVal">${i18n.t('timestamp.copy')}</button>
        </div>
        <div class="stamp-card">
          <div class="stamp-card-header">
            <span class="stamp-card-icon">⚡</span>
            <span class="stamp-card-title">${i18n.t('timestamp.unixMs')}</span>
          </div>
          <div class="stamp-card-body">
            <span class="stamp-card-value" id="unixMsVal">${ms}</span>
          </div>
          <button class="stamp-card-copy" data-target="unixMsVal">${i18n.t('timestamp.copy')}</button>
        </div>
      </div>

      <!-- 转换工具卡片组 -->
      <div class="convert-cards">
        <div class="convert-card">
          <div class="convert-card-header">
            <span class="convert-card-icon">🔢</span>
            <span class="convert-card-title">${i18n.t('timestamp.toDatetime')}</span>
          </div>
          <div class="convert-card-body">
            <div class="convert-input-group">
              <label>${i18n.t('timestamp.inputLabel')}</label>
              <input id="tsInput" type="text" inputmode="numeric" placeholder="${i18n.t('timestamp.inputPlaceholder')}" />
            </div>
            <div class="convert-output-group">
              <label>${i18n.t('timestamp.resultLabel')}</label>
              <span class="convert-output" id="tsConvOut">-</span>
            </div>
          </div>
          <button class="convert-card-copy" id="tsCopyBtn">${i18n.t('timestamp.copyResult')}</button>
        </div>

        <div class="convert-card">
          <div class="convert-card-header">
            <span class="convert-card-icon">📅</span>
            <span class="convert-card-title">${i18n.t('timestamp.toTimestamp')}</span>
          </div>
          <div class="convert-card-body">
            <div class="convert-input-group datetime-inputs">
              <label>${i18n.t('timestamp.datetimeLabel')}</label>
              <div class="dt-fields">
                <input id="dtY" type="text" inputmode="numeric" placeholder="YYYY" class="dt-input dt-year" />
                <span class="dt-sep">-</span>
                <input id="dtM" type="text" inputmode="numeric" placeholder="MM" class="dt-input dt-small" />
                <span class="dt-sep">-</span>
                <input id="dtD" type="text" inputmode="numeric" placeholder="DD" class="dt-input dt-small" />
                <span class="dt-sep dt-space"></span>
                <input id="dtH" type="text" inputmode="numeric" placeholder="hh" class="dt-input dt-small" />
                <span class="dt-sep">:</span>
                <input id="dtMin" type="text" inputmode="numeric" placeholder="mm" class="dt-input dt-small" />
                <span class="dt-sep">:</span>
                <input id="dtS" type="text" inputmode="numeric" placeholder="ss" class="dt-input dt-small" />
              </div>
            </div>
            <div class="convert-output-group">
              <label>${i18n.t('timestamp.resultLabel')}</label>
              <span class="convert-output" id="dtConvOut">-</span>
            </div>
          </div>
          <button class="convert-card-copy" id="dtCopyBtn">${i18n.t('timestamp.copyResult')}</button>
        </div>
      </div>
    </div>
  `;
}

// 保持向后兼容
export const template = getTemplate;
