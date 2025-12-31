/**
 * 密码生成器模板
 */

import { i18n } from '../../core/i18n';

export function getTemplate(): string {
  return `
    <div class="pwd-wrap">
      <div class="pwd-card">
        <div class="pwd-output">
          <input id="pwdOut" type="text" readonly placeholder="${i18n.t('password.placeholder')}" />
          <button class="pwd-btn" id="pwdGen">${i18n.t('password.generate')}</button>
          <button class="pwd-btn" id="pwdCopy">${i18n.t('password.copy')}</button>
        </div>
        <div class="pwd-row" style="margin-top:15px;">
          <div class="pwd-meter" style="flex:1;"><div id="pwdMeterBar"></div></div>
          <div class="pwd-small" id="pwdStrength">${i18n.t('password.weak')}</div>
        </div>
      </div>
      <div class="pwd-grid">
        <div class="pwd-card">
          <div class="pwd-kv">
            <label>${i18n.t('password.length')}</label>
            <div class="range">
              <input id="pwdLen" type="range" min="8" max="64" step="1" value="16"/>
              <span class="pwd-small" id="pwdLenVal">16</span>
              <input id="pwdLenNum" type="number" min="8" max="64" step="1" value="16"/>
            </div>
          </div>
          <div class="pwd-opts" style="margin-top:15px;">
            <label class="opt-chip"><input id="optLower" type="checkbox" checked/> ${i18n.t('password.lowercase')}</label>
            <label class="opt-chip"><input id="optUpper" type="checkbox" checked/> ${i18n.t('password.uppercase')}</label>
            <label class="opt-chip"><input id="optDigits" type="checkbox" checked/> ${i18n.t('password.digits')}</label>
            <label class="opt-chip"><input id="optSymbols" type="checkbox" checked/> ${i18n.t('password.symbols')}</label>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 保持向后兼容
export const template = getTemplate;
