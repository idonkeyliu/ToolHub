/**
 * 密码生成器模板
 */

export function template(): string {
  return `
    <div class="pwd-wrap">
      <div class="pwd-card">
        <div class="pwd-output">
          <input id="pwdOut" type="text" readonly placeholder="🔐 点击生成安全密码..." />
          <button class="pwd-btn" id="pwdGen">⚡ 生成</button>
          <button class="pwd-btn" id="pwdCopy">📋 复制</button>
        </div>
        <div class="pwd-row" style="margin-top:15px;">
          <div class="pwd-meter" style="flex:1;"><div id="pwdMeterBar"></div></div>
          <div class="pwd-small" id="pwdStrength">弱</div>
        </div>
      </div>
      <div class="pwd-grid">
        <div class="pwd-card">
          <div class="pwd-kv">
            <label>🎯 长度</label>
            <div class="range">
              <input id="pwdLen" type="range" min="8" max="64" step="1" value="16"/>
              <span class="pwd-small" id="pwdLenVal">16</span>
              <input id="pwdLenNum" type="number" min="8" max="64" step="1" value="16"/>
            </div>
          </div>
          <div class="pwd-opts" style="margin-top:15px;">
            <label class="opt-chip"><input id="optLower" type="checkbox" checked/> 🔤 小写字母</label>
            <label class="opt-chip"><input id="optUpper" type="checkbox" checked/> 🔠 大写字母</label>
            <label class="opt-chip"><input id="optDigits" type="checkbox" checked/> 🔢 数字</label>
            <label class="opt-chip"><input id="optSymbols" type="checkbox" checked/> 🔣 特殊符号</label>
          </div>
        </div>
      </div>
    </div>
  `;
}
