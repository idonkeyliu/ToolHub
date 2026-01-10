/**
 * JSON 工具模板
 */

import { i18n } from '../../core/i18n';

export function getTemplate(): string {
  // 动态获取翻译，确保语言切换时能正确显示
  const formatBtn = i18n.t('json.format');
  const minifyBtn = i18n.t('json.minify');
  const sortKeysBtn = i18n.t('json.sortKeys');
  const unescapeBtn = i18n.t('json.unescape');
  const copyBtn = i18n.t('json.copy');
  const expandAllBtn = i18n.t('json.expandAll');
  const collapseAllBtn = i18n.t('json.collapseAll');
  const pasteBtn = i18n.t('json.paste');
  const clearBtn = i18n.t('json.clear');
  const placeholder = i18n.t('json.placeholder');
  const treeView = i18n.t('json.treeView');
  const rawView = i18n.t('json.rawView');

  return `
    <div class="json-wrap">
      <div class="json-split">
        <div class="json-left">
          <div class="json-toolbar">
            <button class="json-btn" id="jsonFmt">${formatBtn}</button>
            <button class="json-btn" id="jsonMin">${minifyBtn}</button>
            <button class="json-btn" id="jsonSort">${sortKeysBtn}</button>
            <button class="json-btn" id="jsonUnescape">${unescapeBtn}</button>
            <button class="json-btn" id="jsonCopy">${copyBtn}</button>
            <button class="json-btn" id="jsonExpand">${expandAllBtn}</button>
            <button class="json-btn" id="jsonCollapse">${collapseAllBtn}</button>
            <button class="json-btn" id="jsonPaste">${pasteBtn}</button>
            <button class="json-btn" id="jsonClear">${clearBtn}</button>
          </div>
          <textarea class="json-input" id="jsonIn" placeholder='${placeholder}'></textarea>
          <div class="json-err" id="jsonErr"></div>
        </div>
        <div class="json-right">
          <div class="json-tabs">
            <div class="json-tab active" data-t="tree">${treeView}</div>
            <div class="json-tab" data-t="raw">${rawView}</div>
          </div>
          <div class="json-panel" id="jsonOut"></div>
        </div>
      </div>
    </div>
  `;
}
