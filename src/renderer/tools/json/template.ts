/**
 * JSON 工具模板
 */

export function template(): string {
  return `
    <div class="json-wrap">
      <div class="json-split">
        <div class="json-left">
          <div class="json-toolbar">
            <button class="json-btn" id="jsonFmt">格式化</button>
            <button class="json-btn" id="jsonMin">压缩</button>
            <button class="json-btn" id="jsonSort">按键排序</button>
            <button class="json-btn" id="jsonCopy">复制</button>
            <button class="json-btn" id="jsonExpand">展开全部</button>
            <button class="json-btn" id="jsonCollapse">折叠全部</button>
            <button class="json-btn" id="jsonPaste">粘贴</button>
            <button class="json-btn" id="jsonClear">清空</button>
          </div>
          <textarea class="json-input" id="jsonIn" placeholder='粘贴或输入 JSON，例如 {"a":1,"b":[true,null]}'></textarea>
          <div class="json-err" id="jsonErr"></div>
        </div>
        <div class="json-right">
          <div class="json-tabs">
            <div class="json-tab active" data-t="tree">树形</div>
            <div class="json-tab" data-t="raw">原文</div>
          </div>
          <div class="json-panel" id="jsonOut"></div>
        </div>
      </div>
    </div>
  `;
}
