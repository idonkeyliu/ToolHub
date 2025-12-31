/**
 * JSON 工具模板
 */

import { i18n } from '../../core/i18n';

export function getTemplate(): string {
  return `
    <div class="json-wrap">
      <div class="json-split">
        <div class="json-left">
          <div class="json-toolbar">
            <button class="json-btn" id="jsonFmt">${i18n.t('json.format')}</button>
            <button class="json-btn" id="jsonMin">${i18n.t('json.minify')}</button>
            <button class="json-btn" id="jsonSort">${i18n.t('json.sortKeys')}</button>
            <button class="json-btn" id="jsonCopy">${i18n.t('json.copy')}</button>
            <button class="json-btn" id="jsonExpand">${i18n.t('json.expandAll')}</button>
            <button class="json-btn" id="jsonCollapse">${i18n.t('json.collapseAll')}</button>
            <button class="json-btn" id="jsonPaste">${i18n.t('json.paste')}</button>
            <button class="json-btn" id="jsonClear">${i18n.t('json.clear')}</button>
          </div>
          <textarea class="json-input" id="jsonIn" placeholder='${i18n.t('json.placeholder')}'></textarea>
          <div class="json-err" id="jsonErr"></div>
        </div>
        <div class="json-right">
          <div class="json-tabs">
            <div class="json-tab active" data-t="tree">${i18n.t('json.treeView')}</div>
            <div class="json-tab" data-t="raw">${i18n.t('json.rawView')}</div>
          </div>
          <div class="json-panel" id="jsonOut"></div>
        </div>
      </div>
    </div>
  `;
}
