/**
 * 时间戳工具模板
 */

function two(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function template(now: Date = new Date()): string {
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
      <div class="time-big">
        <span class="year">${y}</span><span class="divider">-</span><span class="month">${M}</span><span class="divider">-</span><span class="day">${d}</span>
        <span class="space"></span>
        <span class="hour">${hh}</span><span class="divider time-colon">:</span><span class="minute">${mm}</span><span class="divider time-colon">:</span><span class="second">${ss}</span>
      </div>
      <div class="time-row">
        <div class="stamp-inline">
          <span class="stamp-label">Unix 秒</span>
          <span class="stamp-value" id="unixSecVal">${sec}</span>
          <button class="stamp-copy" data-target="unixSecVal">复制</button>
        </div>
        <div class="stamp-inline">
          <span class="stamp-label">Unix 毫秒</span>
          <span class="stamp-value" id="unixMsVal">${ms}</span>
          <button class="stamp-copy" data-target="unixMsVal">复制</button>
        </div>
      </div>
      <div class="convert-row">
        <span class="convert-label">时间戳 → 日期时间</span>
        <input id="tsInput" type="text" inputmode="numeric" placeholder="输入时间戳（秒或毫秒）" />
        <span class="convert-output" id="tsConvOut"></span>
        <button class="convert-copy" id="tsCopyBtn">复制</button>
      </div>
      <div class="convert-row">
        <span class="convert-label">日期时间 → 时间戳</span>
        <input id="dtY" type="text" inputmode="numeric" placeholder="YYYY" class="dt-input dt-year" />
        <input id="dtM" type="text" inputmode="numeric" placeholder="MM" class="dt-input dt-small" />
        <input id="dtD" type="text" inputmode="numeric" placeholder="DD" class="dt-input dt-small" />
        <input id="dtH" type="text" inputmode="numeric" placeholder="hh" class="dt-input dt-small" />
        <input id="dtMin" type="text" inputmode="numeric" placeholder="mm" class="dt-input dt-small" />
        <input id="dtS" type="text" inputmode="numeric" placeholder="ss" class="dt-input dt-small" />
        <span class="convert-output" id="dtConvOut"></span>
        <button class="convert-copy" id="dtCopyBtn">复制</button>
      </div>
    </div>
  `;
}
