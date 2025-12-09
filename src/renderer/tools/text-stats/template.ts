/**
 * 文本统计工具模板
 */

export const template = (): string => `
  <div class="text-wrap">
    <div class="text-left">
      <textarea class="text-area" id="textInput" placeholder="✍️ 在此粘贴或输入文本进行统计..."></textarea>
    </div>
    <div class="text-right">
      <div class="stat-header">📊 统计结果</div>
      <div class="stat-grid">
        <div class="stat-item">
          <div class="label">字符数（含空白）</div>
          <div class="value" id="vChars">0</div>
        </div>
        <div class="stat-item">
          <div class="label">字符数（不含空白）</div>
          <div class="value" id="vCharsNoSpace">0</div>
        </div>
        <div class="stat-item">
          <div class="label">行数</div>
          <div class="value" id="vLines">0</div>
        </div>
        <div class="stat-item">
          <div class="label">单词数</div>
          <div class="value" id="vWords">0</div>
        </div>
        <div class="stat-item">
          <div class="label">中文字符</div>
          <div class="value" id="vChinese">0</div>
        </div>
        <div class="stat-item">
          <div class="label">英文字母</div>
          <div class="value" id="vEnglish">0</div>
        </div>
        <div class="stat-item">
          <div class="label">数字</div>
          <div class="value" id="vDigits">0</div>
        </div>
        <div class="stat-item">
          <div class="label">段落数</div>
          <div class="value" id="vParagraphs">0</div>
        </div>
      </div>
    </div>
  </div>
`;
