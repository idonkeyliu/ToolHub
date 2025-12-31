/**
 * 天气效果模块 - 下雨和飘雪效果
 */

export class WeatherEffects {
  private rainInterval: ReturnType<typeof setInterval> | null = null;
  private rainStopTimeout: ReturnType<typeof setTimeout> | null = null;
  private snowInterval: ReturnType<typeof setInterval> | null = null;
  private snowStopTimeout: ReturnType<typeof setTimeout> | null = null;
  private rainActive: boolean = false;
  private snowActive: boolean = false;

  /** 停止所有天气效果 */
  stopAll(): void {
    console.log('[WeatherEffects] 🛑 Stopping all weather effects...');
    
    // 停止下雨效果
    this.rainActive = false;
    if (this.rainInterval) {
      clearInterval(this.rainInterval);
      this.rainInterval = null;
    }
    if (this.rainStopTimeout) {
      clearTimeout(this.rainStopTimeout);
      this.rainStopTimeout = null;
    }
    const rainContainer = document.getElementById('rainContainer');
    if (rainContainer) {
      rainContainer.remove();
    }

    // 停止飘雪效果
    this.snowActive = false;
    if (this.snowInterval) {
      clearInterval(this.snowInterval);
      this.snowInterval = null;
    }
    if (this.snowStopTimeout) {
      clearTimeout(this.snowStopTimeout);
      this.snowStopTimeout = null;
    }
    const snowContainer = document.getElementById('snowContainer');
    if (snowContainer) {
      snowContainer.remove();
    }
  }

  /** 下雨效果 - 逼真暴雨版 */
  startRain(): void {
    // 设置活动标志
    this.rainActive = true;
    
    // 创建雨滴容器 - 只覆盖内容区域（不包括左侧边栏）
    const rainContainer = document.createElement('div');
    rainContainer.className = 'rain-container';
    rainContainer.id = 'rainContainer';
    document.body.appendChild(rainContainer);

    console.log('[WeatherEffects] 🌧️ Starting realistic rain effect for 10 seconds...');

    // 创建飞溅效果
    const createSplash = (x: number) => {
      // 检查是否仍然活动
      if (!this.rainActive) return;
      
      const splash = document.createElement('div');
      splash.className = 'rain-splash';
      splash.style.left = `${x}%`;
      splash.style.bottom = '0';

      // 创建多个飞溅水滴
      for (let i = 0; i < 5; i++) {
        const drop = document.createElement('div');
        drop.className = 'splash-drop';
        const angle = -60 + Math.random() * 120; // -60 到 60 度
        const distance = 8 + Math.random() * 15;
        const xOffset = Math.sin(angle * Math.PI / 180) * distance;
        const yOffset = -Math.abs(Math.cos(angle * Math.PI / 180) * distance) - 5;
        drop.style.setProperty('--splash-x', `${xOffset}px`);
        drop.style.setProperty('--splash-y', `${yOffset}px`);
        drop.style.animationDuration = `${0.3 + Math.random() * 0.2}s`;
        splash.appendChild(drop);
      }

      // 创建涟漪
      const ripple = document.createElement('div');
      ripple.className = 'splash-ripple';
      splash.appendChild(ripple);

      const container = document.getElementById('rainContainer');
      if (container) {
        container.appendChild(splash);
      }

      // 移除飞溅效果
      setTimeout(() => {
        if (splash.parentNode) {
          splash.remove();
        }
      }, 600);
    };

    // 生成雨滴
    const createRaindrop = () => {
      // 检查是否仍然活动
      if (!this.rainActive) return;
      
      const container = document.getElementById('rainContainer');
      if (!container) return;
      
      const raindrop = document.createElement('div');
      raindrop.className = 'raindrop';
      
      // 随机位置和属性 - 更逼真的雨滴
      const left = Math.random() * 100;
      const height = 15 + Math.random() * 25; // 15-40px 雨滴长度
      const duration = 0.8 + Math.random() * 0.6; // 0.8-1.4s 更慢更逼真
      const delay = Math.random() * 0.2;
      const opacity = 0.3 + Math.random() * 0.4; // 0.3-0.7 透明度
      
      raindrop.style.cssText = `
        left: ${left}%;
        height: ${height}px;
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
        opacity: ${opacity};
      `;
      
      container.appendChild(raindrop);
      
      // 雨滴落地时创建飞溅效果
      setTimeout(() => {
        if (!this.rainActive) {
          if (raindrop.parentNode) raindrop.remove();
          return;
        }
        if (raindrop.parentNode && Math.random() < 0.3) { // 30% 概率产生飞溅
          createSplash(left);
        }
        if (raindrop.parentNode) raindrop.remove();
      }, (duration + delay) * 1000);
    };

    // 立即生成第一批雨滴
    for (let i = 0; i < 30; i++) {
      createRaindrop();
    }

    // 持续生成雨滴 - 暴雨模式但更自然
    this.rainInterval = setInterval(() => {
      if (!this.rainActive) return;
      // 每次生成 8-15 滴雨
      const count = 8 + Math.floor(Math.random() * 8);
      for (let i = 0; i < count; i++) {
        createRaindrop();
      }
    }, 50); // 每 50ms 生成一批

    // 10 秒后停止生成新雨滴，让现有雨滴自然落完
    this.rainStopTimeout = setTimeout(() => {
      if (!this.rainActive) return;
      if (this.rainInterval) {
        clearInterval(this.rainInterval);
        this.rainInterval = null;
      }
      console.log('[WeatherEffects] 🌤️ Rain stopping... waiting for drops to fall');
      
      // 等待最长的雨滴落完
      this.rainStopTimeout = setTimeout(() => {
        if (!this.rainActive) return;
        const container = document.getElementById('rainContainer');
        if (container) {
          container.remove();
        }
        this.rainStopTimeout = null;
        this.rainActive = false;
        console.log('[WeatherEffects] ☀️ Rain stopped, enjoy your rest!');
      }, 2000);
    }, 10000);
  }

  /** 飘雪效果 */
  startSnow(): void {
    // 设置活动标志
    this.snowActive = true;
    
    // 创建雪花容器
    const snowContainer = document.createElement('div');
    snowContainer.className = 'snow-container';
    snowContainer.id = 'snowContainer';
    document.body.appendChild(snowContainer);

    // 创建积雪层
    const snowPile = document.createElement('div');
    snowPile.className = 'snow-pile';
    snowContainer.appendChild(snowPile);

    // 积雪高度（从 0 开始逐渐增加）
    let pileHeight = 0;
    const maxPileHeight = 30; // 最大积雪高度

    console.log('[WeatherEffects] ❄️ Starting snow effect for 10 seconds...');

    // 创建积雪颗粒
    const addSnowToPile = (x: number) => {
      if (!this.snowActive) return;
      
      const pile = document.querySelector('#snowContainer .snow-pile') as HTMLElement;
      if (!pile) return;
      
      if (pileHeight < maxPileHeight) {
        // 创建积雪小颗粒
        const particle = document.createElement('div');
        particle.className = 'snow-pile-particle';
        particle.style.left = `${x}%`;
        particle.style.bottom = `${Math.random() * pileHeight}px`;
        pile.appendChild(particle);

        // 逐渐增加积雪高度
        pileHeight += 0.05;
        pile.style.height = `${pileHeight}px`;
      }
    };

    // 生成雪花
    const createSnowflake = () => {
      // 检查是否仍然活动
      if (!this.snowActive) return;
      
      const container = document.getElementById('snowContainer');
      if (!container) return;
      
      const snowflake = document.createElement('div');
      snowflake.className = 'snowflake';
      
      // 随机位置和属性
      const left = Math.random() * 100;
      const size = 3 + Math.random() * 6; // 3-9px 雪花大小
      const duration = 3 + Math.random() * 4; // 3-7s 飘落时间（比雨慢很多）
      const delay = Math.random() * 0.5;
      const opacity = 0.4 + Math.random() * 0.5; // 0.4-0.9 透明度
      const drift = -30 + Math.random() * 60; // 左右飘动范围
      
      snowflake.style.cssText = `
        left: ${left}%;
        width: ${size}px;
        height: ${size}px;
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
        opacity: ${opacity};
        --drift: ${drift}px;
      `;
      
      container.appendChild(snowflake);
      
      // 雪花落地时添加到积雪
      setTimeout(() => {
        if (!this.snowActive) {
          if (snowflake.parentNode) snowflake.remove();
          return;
        }
        if (snowflake.parentNode) {
          addSnowToPile(left);
          snowflake.remove();
        }
      }, (duration + delay) * 1000);
    };

    // 立即生成第一批雪花
    for (let i = 0; i < 20; i++) {
      createSnowflake();
    }

    // 持续生成雪花
    this.snowInterval = setInterval(() => {
      if (!this.snowActive) return;
      // 每次生成 3-6 片雪花
      const count = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        createSnowflake();
      }
    }, 100); // 每 100ms 生成一批

    // 10 秒后停止生成新雪花
    this.snowStopTimeout = setTimeout(() => {
      if (!this.snowActive) return;
      if (this.snowInterval) {
        clearInterval(this.snowInterval);
        this.snowInterval = null;
      }
      console.log('[WeatherEffects] 🌨️ Snow stopping... waiting for flakes to fall');
      
      // 等待最长的雪花落完
      this.snowStopTimeout = setTimeout(() => {
        if (!this.snowActive) return;
        // 积雪渐渐消融
        const pile = document.querySelector('#snowContainer .snow-pile') as HTMLElement;
        if (pile) {
          pile.style.transition = 'opacity 2s ease-out';
          pile.style.opacity = '0';
        }
        
        setTimeout(() => {
          if (!this.snowActive) return;
          const container = document.getElementById('snowContainer');
          if (container) {
            container.remove();
          }
          this.snowStopTimeout = null;
          this.snowActive = false;
          console.log('[WeatherEffects] ☀️ Snow melted, enjoy your rest!');
        }, 2000);
      }, 8000);
    }, 10000);
  }

  /** 随机启动一个天气效果 */
  startRandom(): 'rain' | 'snow' {
    const effects = ['rain', 'snow'] as const;
    const effect = effects[Math.floor(Math.random() * effects.length)];
    
    if (effect === 'rain') {
      this.startRain();
    } else {
      this.startSnow();
    }
    
    return effect;
  }

  /** 检查是否有活动的天气效果 */
  isActive(): boolean {
    return this.rainActive || this.snowActive;
  }
}

// 导出单例
export const weatherEffects = new WeatherEffects();
