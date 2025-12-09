/**
 * 计算器工具模板
 */

export function template(): string {
  return `
    <div class="calc-wrap">
      <div class="calc-result" id="calcOut"></div>
      <div class="calc-display">
        <input class="calc-input" id="calcExpr" placeholder="输入表达式，例如: (1+2)*3/4 或 2^10" />
      </div>
      <div class="calc-grid">
        <div class="btn num" data-k="7">7</div>
        <div class="btn num" data-k="8">8</div>
        <div class="btn num" data-k="9">9</div>
        <div class="btn op" data-k="/">÷</div>
        <div class="btn num" data-k="4">4</div>
        <div class="btn num" data-k="5">5</div>
        <div class="btn num" data-k="6">6</div>
        <div class="btn op" data-k="*">×</div>
        <div class="btn num" data-k="1">1</div>
        <div class="btn num" data-k="2">2</div>
        <div class="btn num" data-k="3">3</div>
        <div class="btn op" data-k="-">−</div>
        <div class="btn num" data-k="0">0</div>
        <div class="btn num" data-k=".">.</div>
        <div class="btn op" data-k="%">%</div>
        <div class="btn op" data-k="+">+</div>
      </div>
      <div class="calc-row">
        <div class="btn ctrl" data-act="ac">AC</div>
        <div class="btn ctrl" data-act="bk">⌫</div>
      </div>
    </div>
  `;
}
