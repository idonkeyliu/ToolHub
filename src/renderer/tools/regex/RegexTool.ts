/**
 * 正则表达式工具
 * 支持实时匹配、替换
 */

import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { template } from './template';

declare function toast(msg: string): void;

interface MatchResult {
  index: number;
  match: string;
  start: number;
  end: number;
  groups: string[];
}

const SAMPLE_REGEX = '(\\w+)@(\\w+\\.\\w+)';
const SAMPLE_TEXT = `联系方式列表：
张三: zhangsan@example.com
李四: lisi@test.org
王五: wangwu@company.cn
客服: support@service.net

测试数据：
手机号: 13812345678, 15987654321
日期: 2024-01-15, 2024/12/25
IP: 192.168.1.100, 10.0.0.1
金额: ¥1,234.56, ¥99.00

无效数据: invalid-email, @missing.com, test@`;

export class RegexTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'regex',
    title: 'Regex',
    category: ToolCategory.DEVELOPER,
    icon: '🔍',
    description: '正则表达式测试工具',
    keywords: ['regex', 'regular expression', '正则', '匹配', 'pattern', '替换', 'replace'],
  };

  readonly config = RegexTool.config;

  private matches: MatchResult[] = [];
  private currentRegex: RegExp | null = null;

  render(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = template;
    return container.firstElementChild as HTMLElement;
  }

  protected onMounted(): void {
    // 初始化
  }

  protected bindEvents(): void {
    const regexInput = this.querySelector('#regexInput') as HTMLInputElement;
    const testTextInput = this.querySelector('#testTextInput') as HTMLTextAreaElement;

    // 正则输入监听
    if (regexInput) {
      this.addEventListener(regexInput, 'input', () => this.onRegexChange());
    }

    // 测试文本监听
    if (testTextInput) {
      this.addEventListener(testTextInput, 'input', () => this.onTextChange());
      this.addEventListener(testTextInput, 'scroll', () => this.syncScroll());
    }

    // 标志位监听
    ['flagG', 'flagI', 'flagM', 'flagS'].forEach((id) => {
      const checkbox = this.querySelector(`#${id}`) as HTMLInputElement;
      if (checkbox) {
        this.addEventListener(checkbox, 'change', () => this.onRegexChange());
      }
    });

    // 工具栏按钮
    this.addEventListener(this.querySelector('#clearBtn'), 'click', () => this.clear());
    this.addEventListener(this.querySelector('#sampleBtn'), 'click', () => this.loadSample());
    this.addEventListener(this.querySelector('#pasteTestBtn'), 'click', () => this.pasteTestText());

    // 替换功能
    this.addEventListener(this.querySelector('#replaceToggle'), 'change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      const replaceContent = this.querySelector('#replaceContent');
      const replaceResult = this.querySelector('#replaceResult');
      if (replaceContent) {
        replaceContent.classList.toggle('show', checked);
      }
      if (replaceResult) {
        replaceResult.classList.toggle('show', checked);
      }
      if (checked) {
        this.updateReplaceResult();
      }
    });

    const replaceInput = this.querySelector('#replaceInput') as HTMLInputElement;
    if (replaceInput) {
      this.addEventListener(replaceInput, 'input', () => this.updateReplaceResult());
    }

    this.addEventListener(this.querySelector('#replaceAllBtn'), 'click', () => this.applyReplace());
    this.addEventListener(this.querySelector('#copyResultBtn'), 'click', () => this.copyReplaceResult());
    this.addEventListener(this.querySelector('#copyMatchesBtn'), 'click', () => this.copyMatches());

    // 模板点击
    const templateItems = this.querySelectorAll('.template-item');
    templateItems.forEach((item) => {
      this.addEventListener(item, 'click', () => {
        const pattern = item.getAttribute('data-pattern');
        if (pattern && regexInput) {
          regexInput.value = pattern;
          this.onRegexChange();
          toast('已加载模板');
        }
      });
    });
  }

  private getFlags(): string {
    let flags = '';
    if ((this.querySelector('#flagG') as HTMLInputElement)?.checked) flags += 'g';
    if ((this.querySelector('#flagI') as HTMLInputElement)?.checked) flags += 'i';
    if ((this.querySelector('#flagM') as HTMLInputElement)?.checked) flags += 'm';
    if ((this.querySelector('#flagS') as HTMLInputElement)?.checked) flags += 's';
    return flags;
  }

  private onRegexChange(): void {
    const regexInput = this.querySelector('#regexInput') as HTMLInputElement;
    const pattern = regexInput?.value || '';
    const regexError = this.querySelector('#regexError');
    const patternWrapper = this.querySelector('.regex-pattern-wrapper');

    if (!pattern) {
      this.currentRegex = null;
      this.clearHighlight();
      this.clearMatches();
      if (regexError) {
        regexError.classList.remove('show');
        regexError.textContent = '';
      }
      if (patternWrapper) {
        patternWrapper.classList.remove('error');
      }
      return;
    }

    try {
      const flags = this.getFlags();
      this.currentRegex = new RegExp(pattern, flags);

      if (regexError) {
        regexError.classList.remove('show');
        regexError.textContent = '';
      }
      if (patternWrapper) {
        patternWrapper.classList.remove('error');
      }

      this.performMatch();
    } catch (error) {
      this.currentRegex = null;
      if (regexError) {
        regexError.textContent = error instanceof Error ? error.message : '无效的正则表达式';
        regexError.classList.add('show');
      }
      if (patternWrapper) {
        patternWrapper.classList.add('error');
      }
      this.clearHighlight();
      this.clearMatches();
    }
  }

  private onTextChange(): void {
    this.performMatch();
  }

  private performMatch(): void {
    const testTextInput = this.querySelector('#testTextInput') as HTMLTextAreaElement;
    const text = testTextInput?.value || '';

    if (!this.currentRegex || !text) {
      this.clearHighlight();
      this.clearMatches();
      return;
    }

    this.matches = [];
    const regex = new RegExp(this.currentRegex.source, this.currentRegex.flags);
    let match: RegExpExecArray | null;
    let lastIndex = -1;

    while ((match = regex.exec(text)) !== null) {
      // 防止无限循环
      if (regex.lastIndex === lastIndex) {
        regex.lastIndex++;
        continue;
      }
      lastIndex = regex.lastIndex;

      const groups: string[] = [];
      for (let i = 1; i < match.length; i++) {
        groups.push(match[i] || '');
      }

      this.matches.push({
        index: this.matches.length,
        match: match[0],
        start: match.index,
        end: match.index + match[0].length,
        groups,
      });

      // 非全局模式只匹配一次
      if (!regex.global) break;
    }

    this.updateHighlight(text);
    this.updateMatchesList();
    this.updateStats();
    this.updateReplaceResult();
  }

  private updateHighlight(text: string): void {
    const highlightEl = this.querySelector('#testTextHighlight');
    if (!highlightEl) return;

    if (this.matches.length === 0) {
      highlightEl.innerHTML = this.escapeHtml(text);
      return;
    }

    let html = '';
    let lastEnd = 0;

    for (const match of this.matches) {
      // 添加匹配前的文本
      if (match.start > lastEnd) {
        html += this.escapeHtml(text.slice(lastEnd, match.start));
      }

      // 添加高亮匹配
      html += `<span class="match-highlight">${this.escapeHtml(match.match)}</span>`;
      lastEnd = match.end;
    }

    // 添加剩余文本
    if (lastEnd < text.length) {
      html += this.escapeHtml(text.slice(lastEnd));
    }

    highlightEl.innerHTML = html;
  }

  private clearHighlight(): void {
    const highlightEl = this.querySelector('#testTextHighlight');
    const testTextInput = this.querySelector('#testTextInput') as HTMLTextAreaElement;
    if (highlightEl && testTextInput) {
      highlightEl.innerHTML = this.escapeHtml(testTextInput.value);
    }
  }

  private updateMatchesList(): void {
    const matchesList = this.querySelector('#matchesList');
    if (!matchesList) return;

    if (this.matches.length === 0) {
      matchesList.innerHTML = '<div class="matches-empty">没有匹配结果</div>';
      return;
    }

    let html = '';
    for (const match of this.matches) {
      html += `
        <div class="match-item">
          <div class="match-index">${match.index + 1}</div>
          <div class="match-content">
            <div class="match-value">${this.escapeHtml(match.match)}</div>
            <div class="match-info">
              <span>位置: ${match.start}-${match.end}</span>
              <span>长度: ${match.match.length}</span>
            </div>
            ${
              match.groups.length > 0
                ? `
              <div class="match-groups">
                ${match.groups
                  .map(
                    (g, i) => `
                  <div class="group-item">
                    <span class="group-label">$${i + 1}:</span>
                    <span class="group-value">${this.escapeHtml(g)}</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            `
                : ''
            }
          </div>
        </div>
      `;
    }

    matchesList.innerHTML = html;
  }

  private clearMatches(): void {
    const matchesList = this.querySelector('#matchesList');
    if (matchesList) {
      matchesList.innerHTML = '<div class="matches-empty">输入正则和文本查看匹配</div>';
    }
    this.matches = [];
    this.updateStats();
  }

  private updateStats(): void {
    const matchCount = this.querySelector('#matchCount');
    const groupCount = this.querySelector('#groupCount');

    if (matchCount) {
      matchCount.textContent = String(this.matches.length);
    }

    if (groupCount) {
      const groups = this.matches.length > 0 ? this.matches[0].groups.length : 0;
      groupCount.textContent = String(groups);
    }
  }

  private updateReplaceResult(): void {
    const replaceToggle = this.querySelector('#replaceToggle') as HTMLInputElement;
    if (!replaceToggle?.checked) return;

    const replaceInput = this.querySelector('#replaceInput') as HTMLInputElement;
    const replaceResult = this.querySelector('#replaceResult');
    const testTextInput = this.querySelector('#testTextInput') as HTMLTextAreaElement;

    if (!replaceResult || !testTextInput) return;

    const text = testTextInput.value;
    const replacement = replaceInput?.value || '';

    if (!this.currentRegex || !text) {
      replaceResult.textContent = '';
      return;
    }

    try {
      const result = text.replace(this.currentRegex, replacement);
      replaceResult.textContent = result;
    } catch (error) {
      replaceResult.textContent = '替换出错';
    }
  }

  private applyReplace(): void {
    const replaceResult = this.querySelector('#replaceResult');
    const testTextInput = this.querySelector('#testTextInput') as HTMLTextAreaElement;

    if (!replaceResult || !testTextInput) return;

    const result = replaceResult.textContent || '';
    if (result) {
      testTextInput.value = result;
      this.performMatch();
      toast('已应用替换');
    }
  }

  private async copyReplaceResult(): Promise<void> {
    const replaceResult = this.querySelector('#replaceResult');
    const result = replaceResult?.textContent || '';

    if (!result) {
      toast('没有可复制的内容');
      return;
    }

    try {
      await navigator.clipboard.writeText(result);
      toast('已复制替换结果');
    } catch {
      toast('复制失败');
    }
  }

  private async copyMatches(): Promise<void> {
    if (this.matches.length === 0) {
      toast('没有匹配结果');
      return;
    }

    const text = this.matches.map((m) => m.match).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast('已复制所有匹配');
    } catch {
      toast('复制失败');
    }
  }

  private syncScroll(): void {
    const testTextInput = this.querySelector('#testTextInput') as HTMLTextAreaElement;
    const highlightEl = this.querySelector('#testTextHighlight');

    if (testTextInput && highlightEl) {
      highlightEl.scrollTop = testTextInput.scrollTop;
      highlightEl.scrollLeft = testTextInput.scrollLeft;
    }
  }

  private clear(): void {
    const regexInput = this.querySelector('#regexInput') as HTMLInputElement;
    const testTextInput = this.querySelector('#testTextInput') as HTMLTextAreaElement;
    const replaceInput = this.querySelector('#replaceInput') as HTMLInputElement;
    const replaceResult = this.querySelector('#replaceResult');

    if (regexInput) regexInput.value = '';
    if (testTextInput) testTextInput.value = '';
    if (replaceInput) replaceInput.value = '';
    if (replaceResult) replaceResult.textContent = '';

    this.currentRegex = null;
    this.clearHighlight();
    this.clearMatches();

    const regexError = this.querySelector('#regexError');
    const patternWrapper = this.querySelector('.regex-pattern-wrapper');
    if (regexError) {
      regexError.classList.remove('show');
      regexError.textContent = '';
    }
    if (patternWrapper) {
      patternWrapper.classList.remove('error');
    }

    toast('已清空');
  }

  private loadSample(): void {
    const regexInput = this.querySelector('#regexInput') as HTMLInputElement;
    const testTextInput = this.querySelector('#testTextInput') as HTMLTextAreaElement;

    if (regexInput) regexInput.value = SAMPLE_REGEX;
    if (testTextInput) testTextInput.value = SAMPLE_TEXT;

    this.onRegexChange();
    toast('已加载示例');
  }

  private async pasteTestText(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      const testTextInput = this.querySelector('#testTextInput') as HTMLTextAreaElement;
      if (testTextInput) {
        testTextInput.value = text;
        this.performMatch();
        toast('已粘贴');
      }
    } catch {
      toast('粘贴失败，请检查剪贴板权限');
    }
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
