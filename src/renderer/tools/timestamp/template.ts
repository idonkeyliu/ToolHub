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
        <span class="divider"> </span>
        <span class="hour">${hh}</span><span class="divider">:</span><span class="minute">${mm}</span><span class="divider">:</span><span class="second">${ss}</span>
      </div>
      <div class="time-grid">
        <div class="stamp-box">
          <div class="label">Unix 秒</div>
          <div class="value" id="unixSecVal">${sec}</div>
          <button class="copy-btn" data-target="unixSecVal" title="复制">复制</button>
        </div>
        <div class="stamp-box">
          <div class="label">Unix 毫秒</div>
          <div class="value" id="unixMsVal">${ms}</div>
          <button class="copy-btn" data-target="unixMsVal" title="复制">复制</button>
        </div>
        <div class="stamp-box full">
          <div class="label">时间戳 → 日期时间</div>
          <input id="tsInput" type="number" inputmode="numeric" placeholder="输入时间戳（秒或毫秒）" />
          <div class="value" id="tsConvOut"></div>
          <button class="copy-btn" id="tsCopyBtn" title="复制转换结果">复制</button>
        </div>
        <div class="stamp-box full">
          <div class="label">日期时间 → 时间戳</div>
          <input id="dtY" type="number" inputmode="numeric" placeholder="YYYY" style="width: 60px;" />
          <input id="dtM" type="number" inputmode="numeric" placeholder="MM" style="width: 50px;" />
          <input id="dtD" type="number" inputmode="numeric" placeholder="DD" style="width: 50px;" />
          <input id="dtH" type="number" inputmode="numeric" placeholder="hh" style="width: 50px;" />
          <input id="dtMin" type="number" inputmode="numeric" placeholder="mm" style="width: 50px;" />
          <input id="dtS" type="number" inputmode="numeric" placeholder="ss" style="width: 50px;" />
          <div class="value" id="dtConvOut"></div>
          <button class="copy-btn" id="dtCopyBtn" title="复制转换结果">复制</button>
        </div>
      </div>
    </div>
  `;
}
