/**
 * 文本统计工具模板
 */

import { i18n } from '../../core/i18n';

export const getTemplate = (): string => `
  <div class="text-wrap">
    <div class="text-left">
      <textarea class="text-area" id="textInput" placeholder="${i18n.t('textStats.placeholder')}"></textarea>
    </div>
    <div class="text-right">
      <div class="stat-header">${i18n.t('textStats.title')}</div>
      <div class="stat-grid">
        <div class="stat-item">
          <div class="label">${i18n.t('textStats.chars')}</div>
          <div class="value" id="vChars">0</div>
        </div>
        <div class="stat-item">
          <div class="label">${i18n.t('textStats.charsNoSpace')}</div>
          <div class="value" id="vCharsNoSpace">0</div>
        </div>
        <div class="stat-item">
          <div class="label">${i18n.t('textStats.lines')}</div>
          <div class="value" id="vLines">0</div>
        </div>
        <div class="stat-item">
          <div class="label">${i18n.t('textStats.words')}</div>
          <div class="value" id="vWords">0</div>
        </div>
        <div class="stat-item">
          <div class="label">${i18n.t('textStats.chinese')}</div>
          <div class="value" id="vChinese">0</div>
        </div>
        <div class="stat-item">
          <div class="label">${i18n.t('textStats.english')}</div>
          <div class="value" id="vEnglish">0</div>
        </div>
        <div class="stat-item">
          <div class="label">${i18n.t('textStats.digits')}</div>
          <div class="value" id="vDigits">0</div>
        </div>
        <div class="stat-item">
          <div class="label">${i18n.t('textStats.paragraphs')}</div>
          <div class="value" id="vParagraphs">0</div>
        </div>
      </div>
    </div>
  </div>
`;
