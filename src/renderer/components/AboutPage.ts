/**
 * 关于页面组件 - 产品信息展示
 */

export class AboutPage {
  private container: HTMLElement;
  private element: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  show(): void {
    console.log('[AboutPage] 🎬 show() called, element exists:', !!this.element);
    // 如果已经有元素，直接显示并重新播放动画
    if (this.element) {
      console.log('[AboutPage] ♻️ Reusing existing element');
      this.element.style.display = 'flex';
      this.element.classList.remove('show');
      // 重置动画
      this.resetAnimation();
      requestAnimationFrame(() => {
        this.element?.classList.add('show');
        this.playAnimation();
      });
      return;
    }
    
    console.log('[AboutPage] 🆕 Creating new element');
    // 创建关于页面
    this.element = document.createElement('div');
    this.element.className = 'about-page';
    this.element.innerHTML = `
      <div class="about-content">
        <div class="about-header">
          <div class="about-logo">
            <span class="logo-text">T</span>
            <span class="logo-dot"></span>
          </div>
          <h1 class="about-title">
            <span class="title-letter" data-letter="o">o</span><span class="title-letter" data-letter="o2">o</span><span class="title-letter" data-letter="l">l</span><span class="title-letter" data-letter="H">H</span><span class="title-letter" data-letter="u">u</span><span class="title-letter" data-letter="b">b</span>
          </h1>
        </div>
        <div class="about-support">
          <button class="bmc-button" id="bmcButton">
            <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="Buy me a coffee">
            <span>Buy me a coffee</span>
          </button>
          <button class="github-button" id="githubButton">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span>GitHub</span>
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(this.element);

    // 绑定按钮点击事件 - 使用系统浏览器打开
    const bmcButton = this.element.querySelector('#bmcButton');
    bmcButton?.addEventListener('click', () => {
      (window as any).llmHub?.openExternal?.('https://www.buymeacoffee.com/idonkeyliu');
    });

    const githubButton = this.element.querySelector('#githubButton');
    githubButton?.addEventListener('click', () => {
      (window as any).llmHub?.openExternal?.('https://github.com/idonkeyliu');
    });

    // 添加入场动画
    requestAnimationFrame(() => {
      this.element?.classList.add('show');
      this.playAnimation();
    });
  }

  private resetAnimation(): void {
    const letters = this.element?.querySelectorAll('.title-letter');
    letters?.forEach(letter => {
      letter.classList.remove('bounce');
    });
    const logo = this.element?.querySelector('.about-logo');
    logo?.classList.remove('logo-bounce', 'logo-wiggle');
    const logoText = this.element?.querySelector('.logo-text');
    logoText?.classList.remove('logo-text-wiggle');
  }

  private playAnimation(): void {
    const letters = this.element?.querySelectorAll('.title-letter');
    const logo = this.element?.querySelector('.about-logo');
    const logoText = this.element?.querySelector('.logo-text');
    
    // Logo 先弹跳落下
    setTimeout(() => {
      logo?.classList.add('logo-bounce');
    }, 200);

    // 字母依次弹跳出来，间隔更大更有节奏
    letters?.forEach((letter, index) => {
      setTimeout(() => {
        letter.classList.add('bounce');
      }, 800 + index * 180);
    });

    // Logo 中的 T 扭动 - 等所有字母落定后
    setTimeout(() => {
      logoText?.classList.add('logo-text-wiggle');
    }, 2500);
  }

  hide(): void {
    if (this.element) {
      this.element.classList.remove('show');
      this.element.style.display = 'none';
    }
  }
}
