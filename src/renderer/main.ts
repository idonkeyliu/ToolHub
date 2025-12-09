/**
 * 渲染进程主入口
 */

import './app';
import { initBridge } from './bridge';

console.log('[Main] Module loaded');

// 等待 DOM 加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  console.log('[Main] Initializing...');

  // 等待旧代码初始化完成
  waitForOldCode().then(() => {
    console.log('[Main] Old code ready, starting bridge...');
    initBridge();
    console.log('[Main] Application ready!');
  });
}

/**
 * 等待旧代码初始化
 */
function waitForOldCode(): Promise<void> {
  return new Promise((resolve) => {
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      const hasSites = !!(window as any).sites;
      const hasSwitchSite = typeof (window as any).switchSite === 'function';
      const hasRenderList = typeof (window as any).renderList === 'function';

      if (hasSites && hasSwitchSite && hasRenderList) {
        clearInterval(checkInterval);
        resolve();
      }

      if (attempts > 50) {
        clearInterval(checkInterval);
        console.warn('[Main] Timeout waiting for old code');
        resolve();
      }
    }, 100);
  });
}
