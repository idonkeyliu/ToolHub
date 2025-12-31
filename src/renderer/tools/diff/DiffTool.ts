/**
 * Diff 文本对比工具
 * 支持分栏视图和统一视图，支持文件拖放和粘贴
 */

import { Tool } from '../../core/Tool';
import { ToolConfig, ToolCategory } from '../../types/index';
import { getTemplate } from './template';
import { i18n } from '../../core/i18n';

declare function toast(msg: string): void;

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'changed';
  leftLine?: number;
  rightLine?: number;
  leftContent?: string;
  rightContent?: string;
  content?: string;
}

interface DiffResult {
  lines: DiffLine[];
  added: number;
  removed: number;
  changed: number;
}

export class DiffTool extends Tool {
  static readonly config: ToolConfig = {
    key: 'diff',
    title: 'Diff',
    category: ToolCategory.DEVELOPER,
    icon: '⚖️',
    description: i18n.t('tool.diffDesc'),
    keywords: ['diff', 'compare', 'merge'],
  };

  readonly config = DiffTool.config;

  private viewMode: 'split' | 'unified' = 'split';
  private ignoreWhitespace = false;
  private ignoreCase = false;
  private wordWrap = true;
  private diffResult: DiffResult | null = null;
  private currentDiffIndex = -1;
  private diffPositions: number[] = [];
  private scrollSyncEnabled = true;
  private isScrolling = false;

  render(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = getTemplate();
    return container.firstElementChild as HTMLElement;
  }

  protected onMounted(): void {
    this.updateLineNumbers();
  }

  protected bindEvents(): void {
    // 视图模式切换
    this.querySelectorAll('.view-mode-btn').forEach(btn => {
      this.addEventListener(btn, 'click', () => {
        const mode = btn.dataset.mode as 'split' | 'unified';
        this.setViewMode(mode);
      });
    });

    // 选项
    this.addEventListener(this.querySelector('#ignoreWhitespace'), 'change', (e) => {
      this.ignoreWhitespace = (e.target as HTMLInputElement).checked;
      this.computeDiff();
    });

    this.addEventListener(this.querySelector('#ignoreCase'), 'change', (e) => {
      this.ignoreCase = (e.target as HTMLInputElement).checked;
      this.computeDiff();
    });

    this.addEventListener(this.querySelector('#wordWrap'), 'change', (e) => {
      this.wordWrap = (e.target as HTMLInputElement).checked;
      this.updateWordWrap();
    });

    // 工具栏按钮
    this.addEventListener(this.querySelector('#swapBtn'), 'click', () => this.swapContent());
    this.addEventListener(this.querySelector('#clearBtn'), 'click', () => this.clearContent());

    // 编辑器事件
    const leftEditor = this.querySelector('#leftEditor') as HTMLTextAreaElement;
    const rightEditor = this.querySelector('#rightEditor') as HTMLTextAreaElement;

    if (leftEditor) {
      this.addEventListener(leftEditor, 'input', () => this.onEditorInput());
      this.addEventListener(leftEditor, 'scroll', () => this.syncScroll(leftEditor, 'left'));
      this.addEventListener(leftEditor, 'dragover', (e) => this.onDragOver(e as DragEvent));
      this.addEventListener(leftEditor, 'dragleave', (e) => this.onDragLeave(e as DragEvent));
      this.addEventListener(leftEditor, 'drop', (e) => this.onDrop(e as DragEvent, 'left'));
    }

    if (rightEditor) {
      this.addEventListener(rightEditor, 'input', () => this.onEditorInput());
      this.addEventListener(rightEditor, 'scroll', () => this.syncScroll(rightEditor, 'right'));
      this.addEventListener(rightEditor, 'dragover', (e) => this.onDragOver(e as DragEvent));
      this.addEventListener(rightEditor, 'dragleave', (e) => this.onDragLeave(e as DragEvent));
      this.addEventListener(rightEditor, 'drop', (e) => this.onDrop(e as DragEvent, 'right'));
    }

    // 面板按钮
    this.addEventListener(this.querySelector('#loadLeftFileBtn'), 'click', () => {
      this.querySelector('#leftFileInput')?.click();
    });
    this.addEventListener(this.querySelector('#loadRightFileBtn'), 'click', () => {
      this.querySelector('#rightFileInput')?.click();
    });

    this.addEventListener(this.querySelector('#leftFileInput'), 'change', (e) => {
      this.loadFile(e as Event, 'left');
    });
    this.addEventListener(this.querySelector('#rightFileInput'), 'change', (e) => {
      this.loadFile(e as Event, 'right');
    });

    this.addEventListener(this.querySelector('#pasteLeftBtn'), 'click', () => this.pasteToEditor('left'));
    this.addEventListener(this.querySelector('#pasteRightBtn'), 'click', () => this.pasteToEditor('right'));
    this.addEventListener(this.querySelector('#copyLeftBtn'), 'click', () => this.copyFromEditor('left'));
    this.addEventListener(this.querySelector('#copyRightBtn'), 'click', () => this.copyFromEditor('right'));
    this.addEventListener(this.querySelector('#copyDiffBtn'), 'click', () => this.copyDiff());

    // 差异导航
    this.addEventListener(this.querySelector('#prevDiffBtn'), 'click', () => this.navigateDiff(-1));
    this.addEventListener(this.querySelector('#nextDiffBtn'), 'click', () => this.navigateDiff(1));

    // 键盘快捷键
    this.addEventListener(document.body, 'keydown', (e) => {
      if (!this.active) return;
      const ke = e as KeyboardEvent;
      if (ke.key === 'ArrowUp' && ke.altKey) {
        ke.preventDefault();
        this.navigateDiff(-1);
      } else if (ke.key === 'ArrowDown' && ke.altKey) {
        ke.preventDefault();
        this.navigateDiff(1);
      }
    });
  }

  private setViewMode(mode: 'split' | 'unified'): void {
    this.viewMode = mode;

    this.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    const splitView = this.querySelector('#splitView');
    const unifiedView = this.querySelector('#unifiedView');

    if (splitView && unifiedView) {
      splitView.classList.toggle('active', mode === 'split');
      unifiedView.classList.toggle('active', mode === 'unified');
    }

    if (mode === 'unified') {
      this.renderUnifiedView();
    }
  }

  private updateWordWrap(): void {
    const leftEditor = this.querySelector('#leftEditor');
    const rightEditor = this.querySelector('#rightEditor');

    if (leftEditor) leftEditor.classList.toggle('word-wrap', this.wordWrap);
    if (rightEditor) rightEditor.classList.toggle('word-wrap', this.wordWrap);
  }

  private onEditorInput(): void {
    this.updateLineNumbers();
    this.computeDiff();
  }

  private updateLineNumbers(): void {
    const leftEditor = this.querySelector('#leftEditor') as HTMLTextAreaElement;
    const rightEditor = this.querySelector('#rightEditor') as HTMLTextAreaElement;
    const leftLineNumbers = this.querySelector('#leftLineNumbers');
    const rightLineNumbers = this.querySelector('#rightLineNumbers');

    if (leftEditor && leftLineNumbers) {
      const lines = leftEditor.value.split('\n');
      leftLineNumbers.innerHTML = lines.map((_, i) => 
        `<div class="line-number">${i + 1}</div>`
      ).join('');
    }

    if (rightEditor && rightLineNumbers) {
      const lines = rightEditor.value.split('\n');
      rightLineNumbers.innerHTML = lines.map((_, i) => 
        `<div class="line-number">${i + 1}</div>`
      ).join('');
    }
  }

  private computeDiff(): void {
    const leftEditor = this.querySelector('#leftEditor') as HTMLTextAreaElement;
    const rightEditor = this.querySelector('#rightEditor') as HTMLTextAreaElement;

    if (!leftEditor || !rightEditor) return;

    let leftText = leftEditor.value;
    let rightText = rightEditor.value;

    // 应用选项
    if (this.ignoreWhitespace) {
      leftText = leftText.replace(/\s+/g, ' ').trim();
      rightText = rightText.replace(/\s+/g, ' ').trim();
    }

    if (this.ignoreCase) {
      leftText = leftText.toLowerCase();
      rightText = rightText.toLowerCase();
    }

    const leftLines = leftEditor.value.split('\n');
    const rightLines = rightEditor.value.split('\n');

    // 使用 LCS 算法计算差异
    this.diffResult = this.computeLCS(leftLines, rightLines);

    // 更新统计
    this.updateStats();

    // 更新行号高亮
    this.updateLineHighlights();

    // 更新差异沟槽
    this.updateGutter();

    // 更新差异导航
    this.updateDiffNavigation();

    // 如果是统一视图，更新显示
    if (this.viewMode === 'unified') {
      this.renderUnifiedView();
    }
  }

  private computeLCS(leftLines: string[], rightLines: string[]): DiffResult {
    const m = leftLines.length;
    const n = rightLines.length;

    // 创建 LCS 表
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const leftLine = this.ignoreCase ? leftLines[i - 1].toLowerCase() : leftLines[i - 1];
        const rightLine = this.ignoreCase ? rightLines[j - 1].toLowerCase() : rightLines[j - 1];

        const leftCompare = this.ignoreWhitespace ? leftLine.replace(/\s+/g, ' ').trim() : leftLine;
        const rightCompare = this.ignoreWhitespace ? rightLine.replace(/\s+/g, ' ').trim() : rightLine;

        if (leftCompare === rightCompare) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // 回溯获取差异
    const result: DiffLine[] = [];
    let i = m, j = n;
    let added = 0, removed = 0, changed = 0;

    const tempResult: DiffLine[] = [];

    while (i > 0 || j > 0) {
      const leftLine = i > 0 ? (this.ignoreCase ? leftLines[i - 1].toLowerCase() : leftLines[i - 1]) : '';
      const rightLine = j > 0 ? (this.ignoreCase ? rightLines[j - 1].toLowerCase() : rightLines[j - 1]) : '';

      const leftCompare = this.ignoreWhitespace ? leftLine.replace(/\s+/g, ' ').trim() : leftLine;
      const rightCompare = this.ignoreWhitespace ? rightLine.replace(/\s+/g, ' ').trim() : rightLine;

      if (i > 0 && j > 0 && leftCompare === rightCompare) {
        tempResult.push({
          type: 'unchanged',
          leftLine: i,
          rightLine: j,
          leftContent: leftLines[i - 1],
          rightContent: rightLines[j - 1],
          content: leftLines[i - 1],
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        tempResult.push({
          type: 'added',
          rightLine: j,
          rightContent: rightLines[j - 1],
          content: rightLines[j - 1],
        });
        added++;
        j--;
      } else if (i > 0) {
        tempResult.push({
          type: 'removed',
          leftLine: i,
          leftContent: leftLines[i - 1],
          content: leftLines[i - 1],
        });
        removed++;
        i--;
      }
    }

    // 反转结果
    tempResult.reverse();

    // 合并相邻的添加和删除为修改
    for (let k = 0; k < tempResult.length; k++) {
      const current = tempResult[k];
      const next = tempResult[k + 1];

      if (current.type === 'removed' && next?.type === 'added') {
        result.push({
          type: 'changed',
          leftLine: current.leftLine,
          rightLine: next.rightLine,
          leftContent: current.leftContent,
          rightContent: next.rightContent,
        });
        changed++;
        removed--;
        added--;
        k++;
      } else {
        result.push(current);
      }
    }

    return { lines: result, added, removed, changed };
  }

  private updateStats(): void {
    if (!this.diffResult) return;

    const addedEl = this.querySelector('#addedCount');
    const removedEl = this.querySelector('#removedCount');
    const changedEl = this.querySelector('#changedCount');

    if (addedEl) addedEl.textContent = String(this.diffResult.added);
    if (removedEl) removedEl.textContent = String(this.diffResult.removed);
    if (changedEl) changedEl.textContent = String(this.diffResult.changed);
  }

  private updateLineHighlights(): void {
    if (!this.diffResult) return;

    const leftLineNumbers = this.querySelector('#leftLineNumbers');
    const rightLineNumbers = this.querySelector('#rightLineNumbers');

    if (!leftLineNumbers || !rightLineNumbers) return;

    // 重置所有行号
    leftLineNumbers.querySelectorAll('.line-number').forEach(el => {
      el.classList.remove('added', 'removed', 'changed');
    });
    rightLineNumbers.querySelectorAll('.line-number').forEach(el => {
      el.classList.remove('added', 'removed', 'changed');
    });

    // 应用高亮
    for (const line of this.diffResult.lines) {
      if (line.type === 'removed' && line.leftLine) {
        const el = leftLineNumbers.querySelector(`.line-number:nth-child(${line.leftLine})`);
        if (el) el.classList.add('removed');
      } else if (line.type === 'added' && line.rightLine) {
        const el = rightLineNumbers.querySelector(`.line-number:nth-child(${line.rightLine})`);
        if (el) el.classList.add('added');
      } else if (line.type === 'changed') {
        if (line.leftLine) {
          const el = leftLineNumbers.querySelector(`.line-number:nth-child(${line.leftLine})`);
          if (el) el.classList.add('changed');
        }
        if (line.rightLine) {
          const el = rightLineNumbers.querySelector(`.line-number:nth-child(${line.rightLine})`);
          if (el) el.classList.add('changed');
        }
      }
    }
  }

  private updateGutter(): void {
    if (!this.diffResult) return;

    const gutterContent = this.querySelector('#gutterContent');
    if (!gutterContent) return;

    const leftEditor = this.querySelector('#leftEditor') as HTMLTextAreaElement;
    const rightEditor = this.querySelector('#rightEditor') as HTMLTextAreaElement;

    if (!leftEditor || !rightEditor) return;

    const leftLines = leftEditor.value.split('\n');
    const rightLines = rightEditor.value.split('\n');
    const maxLines = Math.max(leftLines.length, rightLines.length);

    // 创建行映射
    const lineMap: { type: string; icon: string }[] = [];
    let leftIdx = 0, rightIdx = 0;

    for (const line of this.diffResult.lines) {
      if (line.type === 'unchanged') {
        lineMap.push({ type: '', icon: '' });
        leftIdx++;
        rightIdx++;
      } else if (line.type === 'removed') {
        lineMap.push({ type: 'removed', icon: '−' });
        leftIdx++;
      } else if (line.type === 'added') {
        lineMap.push({ type: 'added', icon: '+' });
        rightIdx++;
      } else if (line.type === 'changed') {
        lineMap.push({ type: 'changed', icon: '~' });
        leftIdx++;
        rightIdx++;
      }
    }

    // 填充剩余行
    while (lineMap.length < maxLines) {
      lineMap.push({ type: '', icon: '' });
    }

    gutterContent.innerHTML = lineMap.map(item => 
      `<div class="gutter-line ${item.type}"><span class="gutter-icon">${item.icon}</span></div>`
    ).join('');
  }

  private updateDiffNavigation(): void {
    if (!this.diffResult) return;

    this.diffPositions = [];
    let lineNum = 0;

    for (const line of this.diffResult.lines) {
      if (line.type !== 'unchanged') {
        this.diffPositions.push(lineNum);
      }
      lineNum++;
    }

    const prevBtn = this.querySelector('#prevDiffBtn') as HTMLButtonElement;
    const nextBtn = this.querySelector('#nextDiffBtn') as HTMLButtonElement;
    const navInfo = this.querySelector('#navInfo');

    if (prevBtn) prevBtn.disabled = this.diffPositions.length === 0;
    if (nextBtn) nextBtn.disabled = this.diffPositions.length === 0;
    if (navInfo) {
      navInfo.textContent = this.diffPositions.length > 0 
        ? `${this.currentDiffIndex + 1} / ${this.diffPositions.length}`
        : '0 / 0';
    }
  }

  private navigateDiff(direction: number): void {
    if (this.diffPositions.length === 0) return;

    this.currentDiffIndex += direction;

    if (this.currentDiffIndex < 0) {
      this.currentDiffIndex = this.diffPositions.length - 1;
    } else if (this.currentDiffIndex >= this.diffPositions.length) {
      this.currentDiffIndex = 0;
    }

    const lineNum = this.diffPositions[this.currentDiffIndex];
    this.scrollToLine(lineNum);

    const navInfo = this.querySelector('#navInfo');
    if (navInfo) {
      navInfo.textContent = `${this.currentDiffIndex + 1} / ${this.diffPositions.length}`;
    }
  }

  private scrollToLine(lineNum: number): void {
    const leftEditor = this.querySelector('#leftEditor') as HTMLTextAreaElement;
    const rightEditor = this.querySelector('#rightEditor') as HTMLTextAreaElement;

    if (!leftEditor || !rightEditor) return;

    const lineHeight = 19.2; // 与 CSS 中的 line-height 一致
    const scrollTop = lineNum * lineHeight - 100; // 留出一些上边距

    this.isScrolling = true;
    leftEditor.scrollTop = scrollTop;
    rightEditor.scrollTop = scrollTop;

    setTimeout(() => {
      this.isScrolling = false;
    }, 100);
  }

  private syncScroll(source: HTMLTextAreaElement, side: 'left' | 'right'): void {
    if (!this.scrollSyncEnabled || this.isScrolling) return;

    this.isScrolling = true;

    const leftEditor = this.querySelector('#leftEditor') as HTMLTextAreaElement;
    const rightEditor = this.querySelector('#rightEditor') as HTMLTextAreaElement;
    const leftLineNumbers = this.querySelector('#leftLineNumbers');
    const rightLineNumbers = this.querySelector('#rightLineNumbers');
    const gutterContent = this.querySelector('#gutterContent');

    const scrollTop = source.scrollTop;

    if (side === 'left') {
      if (rightEditor) rightEditor.scrollTop = scrollTop;
    } else {
      if (leftEditor) leftEditor.scrollTop = scrollTop;
    }

    // 同步行号滚动
    if (leftLineNumbers) leftLineNumbers.scrollTop = scrollTop;
    if (rightLineNumbers) rightLineNumbers.scrollTop = scrollTop;
    if (gutterContent) gutterContent.scrollTop = scrollTop;

    setTimeout(() => {
      this.isScrolling = false;
    }, 50);
  }

  private renderUnifiedView(): void {
    const unifiedContent = this.querySelector('#unifiedContent');
    if (!unifiedContent || !this.diffResult) {
      if (unifiedContent) {
        unifiedContent.innerHTML = `<div class="unified-placeholder">${i18n.t('diff.enterText')}</div>`;
      }
      return;
    }

    if (this.diffResult.lines.length === 0) {
      unifiedContent.innerHTML = `<div class="unified-placeholder">${i18n.t('diff.noDiff')}</div>`;
      return;
    }

    let html = '';
    let leftNum = 0, rightNum = 0;

    for (const line of this.diffResult.lines) {
      if (line.type === 'unchanged') {
        leftNum++;
        rightNum++;
        html += `
          <div class="unified-line context">
            <span class="unified-line-num left">${leftNum}</span>
            <span class="unified-line-num">${rightNum}</span>
            <span class="unified-line-sign"></span>
            <span class="unified-line-content">${this.escapeHtml(line.content || '')}</span>
          </div>
        `;
      } else if (line.type === 'removed') {
        leftNum++;
        html += `
          <div class="unified-line removed">
            <span class="unified-line-num left">${leftNum}</span>
            <span class="unified-line-num"></span>
            <span class="unified-line-sign">−</span>
            <span class="unified-line-content">${this.escapeHtml(line.leftContent || '')}</span>
          </div>
        `;
      } else if (line.type === 'added') {
        rightNum++;
        html += `
          <div class="unified-line added">
            <span class="unified-line-num left"></span>
            <span class="unified-line-num">${rightNum}</span>
            <span class="unified-line-sign">+</span>
            <span class="unified-line-content">${this.escapeHtml(line.rightContent || '')}</span>
          </div>
        `;
      } else if (line.type === 'changed') {
        leftNum++;
        rightNum++;
        // 显示删除行
        html += `
          <div class="unified-line removed">
            <span class="unified-line-num left">${leftNum}</span>
            <span class="unified-line-num"></span>
            <span class="unified-line-sign">−</span>
            <span class="unified-line-content">${this.highlightCharDiff(line.leftContent || '', line.rightContent || '', 'removed')}</span>
          </div>
        `;
        // 显示添加行
        html += `
          <div class="unified-line added">
            <span class="unified-line-num left"></span>
            <span class="unified-line-num">${rightNum}</span>
            <span class="unified-line-sign">+</span>
            <span class="unified-line-content">${this.highlightCharDiff(line.rightContent || '', line.leftContent || '', 'added')}</span>
          </div>
        `;
      }
    }

    unifiedContent.innerHTML = html;
  }

  private highlightCharDiff(text: string, compareText: string, type: 'added' | 'removed'): string {
    // 简单的字符级差异高亮
    const className = type === 'added' ? 'char-added' : 'char-removed';
    let result = '';
    let i = 0, j = 0;

    while (i < text.length || j < compareText.length) {
      if (i < text.length && j < compareText.length && text[i] === compareText[j]) {
        result += this.escapeHtml(text[i]);
        i++;
        j++;
      } else if (i < text.length) {
        result += `<span class="${className}">${this.escapeHtml(text[i])}</span>`;
        i++;
      } else {
        j++;
      }
    }

    return result;
  }

  private swapContent(): void {
    const leftEditor = this.querySelector('#leftEditor') as HTMLTextAreaElement;
    const rightEditor = this.querySelector('#rightEditor') as HTMLTextAreaElement;
    const leftFilename = this.querySelector('#leftFilename');
    const rightFilename = this.querySelector('#rightFilename');

    if (!leftEditor || !rightEditor) return;

    const tempContent = leftEditor.value;
    leftEditor.value = rightEditor.value;
    rightEditor.value = tempContent;

    if (leftFilename && rightFilename) {
      const tempName = leftFilename.textContent;
      leftFilename.textContent = rightFilename.textContent;
      rightFilename.textContent = tempName;
    }

    this.onEditorInput();
    toast(i18n.t('diff.swapped'));
  }

  private clearContent(): void {
    const leftEditor = this.querySelector('#leftEditor') as HTMLTextAreaElement;
    const rightEditor = this.querySelector('#rightEditor') as HTMLTextAreaElement;
    const leftFilename = this.querySelector('#leftFilename');
    const rightFilename = this.querySelector('#rightFilename');

    if (leftEditor) leftEditor.value = '';
    if (rightEditor) rightEditor.value = '';
    if (leftFilename) leftFilename.textContent = '';
    if (rightFilename) rightFilename.textContent = '';

    this.diffResult = null;
    this.currentDiffIndex = -1;
    this.diffPositions = [];

    this.onEditorInput();
    toast(i18n.t('diff.cleared'));
  }

  private async loadFile(event: Event, side: 'left' | 'right'): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    try {
      const content = await this.readFileContent(file);
      const editor = this.querySelector(side === 'left' ? '#leftEditor' : '#rightEditor') as HTMLTextAreaElement;
      const filename = this.querySelector(side === 'left' ? '#leftFilename' : '#rightFilename');

      if (editor) {
        editor.value = content;
        this.onEditorInput();
      }

      if (filename) {
        filename.textContent = file.name;
      }

      toast(`${i18n.t('diff.loaded')}: ${file.name}`);
    } catch (error) {
      toast(`${i18n.t('diff.loadFailed')}: ${error}`);
    }

    // 重置 input 以便可以再次选择同一文件
    input.value = '';
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  private onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).classList.add('drag-over');
  }

  private onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).classList.remove('drag-over');
  }

  private async onDrop(e: DragEvent, side: 'left' | 'right'): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).classList.remove('drag-over');

    const file = e.dataTransfer?.files[0];
    if (!file) return;

    try {
      const content = await this.readFileContent(file);
      const editor = this.querySelector(side === 'left' ? '#leftEditor' : '#rightEditor') as HTMLTextAreaElement;
      const filename = this.querySelector(side === 'left' ? '#leftFilename' : '#rightFilename');

      if (editor) {
        editor.value = content;
        this.onEditorInput();
      }

      if (filename) {
        filename.textContent = file.name;
      }

      toast(`${i18n.t('diff.loaded')}: ${file.name}`);
    } catch (error) {
      toast(`${i18n.t('diff.loadFailed')}: ${error}`);
    }
  }

  private async pasteToEditor(side: 'left' | 'right'): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      const editor = this.querySelector(side === 'left' ? '#leftEditor' : '#rightEditor') as HTMLTextAreaElement;

      if (editor) {
        editor.value = text;
        this.onEditorInput();
        toast(i18n.t('common.pasted'));
      }
    } catch (error) {
      toast(i18n.t('common.pasteFailed'));
    }
  }

  private async copyFromEditor(side: 'left' | 'right'): Promise<void> {
    const editor = this.querySelector(side === 'left' ? '#leftEditor' : '#rightEditor') as HTMLTextAreaElement;

    if (editor && editor.value) {
      try {
        await navigator.clipboard.writeText(editor.value);
        toast(i18n.t('common.copied'));
      } catch (error) {
        toast(i18n.t('common.copyFailed'));
      }
    } else {
      toast(i18n.t('common.noCopyContent'));
    }
  }

  private async copyDiff(): Promise<void> {
    if (!this.diffResult || this.diffResult.lines.length === 0) {
      toast(i18n.t('diff.noDiffToCopy'));
      return;
    }

    let diffText = '';

    for (const line of this.diffResult.lines) {
      if (line.type === 'unchanged') {
        diffText += `  ${line.content}\n`;
      } else if (line.type === 'removed') {
        diffText += `- ${line.leftContent}\n`;
      } else if (line.type === 'added') {
        diffText += `+ ${line.rightContent}\n`;
      } else if (line.type === 'changed') {
        diffText += `- ${line.leftContent}\n`;
        diffText += `+ ${line.rightContent}\n`;
      }
    }

    try {
      await navigator.clipboard.writeText(diffText);
      toast(i18n.t('diff.diffCopied'));
    } catch (error) {
      toast(i18n.t('diff.copyFailed'));
    }
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
