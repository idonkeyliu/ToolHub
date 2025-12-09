/**
 * 新旧架构桥接层
 */

import { app } from './app';
import { toolRegistry } from './core/ToolRegistry';

/**
 * 初始化桥接
 */
export function initBridge() {
  console.log('[Bridge] Initializing bridge...');

  // 拦截旧的 switchSite 函数
  interceptOldSwitchSite();

  // 注入新架构的工具到旧的站点列表
  injectNewToolsToOldSites();

  console.log('[Bridge] Bridge initialized');
}

/**
 * 拦截旧的 switchSite 函数
 */
function interceptOldSwitchSite() {
  const oldSwitchSite = (window as any).switchSite;

  if (!oldSwitchSite) {
    console.warn('[Bridge] Old switchSite function not found');
    return;
  }

  (window as any).switchSite = function (key: string) {
    console.log(`[Bridge] switchSite called: ${key}`);

    const newApp = (window as any).__newApp;
    if (newApp && toolRegistry.has(key)) {
      console.log(`[Bridge] Using new architecture for: ${key}`);

      // 隐藏所有旧的视图（iframe、webview、tool-view）
      document.querySelectorAll('iframe.site-frame.active, webview.site-view.active, .tool-view.active').forEach((el) => {
        el.classList.remove('active');
      });

      // 更新导航状态
      updateNavigation(key);

      // 更新 current 变量
      (window as any).current = key;

      // 使用新架构切换
      newApp.switchTool(key);

      // 持久化
      if ((window as any).llmHub?.persistLastSite) {
        (window as any).llmHub.persistLastSite(key);
      }

      return;
    }

    // 隐藏所有新架构工具视图
    document.querySelectorAll('.tool-view.active').forEach((el) => {
      el.classList.remove('active');
    });

    // 失活新架构的当前工具
    if (newApp) {
      const currentKey = (window as any).current;
      if (currentKey && toolRegistry.has(currentKey)) {
        const currentTool = toolRegistry.getInstance(currentKey);
        currentTool?.deactivate();
      }
    }

    // 使用旧架构
    console.log(`[Bridge] Using old architecture for: ${key}`);
    oldSwitchSite.call(this, key);
  };

  console.log('[Bridge] switchSite intercepted');
}

/**
 * 更新导航状态
 */
function updateNavigation(key: string) {
  const items = document.querySelectorAll('.item');
  items.forEach((item) => {
    if ((item as HTMLElement).dataset.key === key) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/**
 * 将新架构的工具注入到旧的站点列表
 */
function injectNewToolsToOldSites() {
  const sites = (window as any).sites;
  if (!sites || !Array.isArray(sites)) {
    console.warn('[Bridge] Old sites array not found');
    return;
  }

  const newToolConfigs = app.getToolConfigs();

  newToolConfigs.forEach((config) => {
    const exists = sites.find((s: any) => s.key === config.key);
    if (!exists) {
      sites.push({
        key: config.key,
        title: config.title,
        icon: config.icon,
      });
      console.log(`[Bridge] Injected new tool: ${config.key}`);
    }
  });

  // 触发旧代码的重新渲染列表
  if (typeof (window as any).renderList === 'function') {
    (window as any).renderList();
  }
}
