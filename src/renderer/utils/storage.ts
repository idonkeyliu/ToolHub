/**
 * 存储工具函数
 */

const PREFIX = 'toolhub_';

/**
 * 获取存储值
 */
export function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const value = localStorage.getItem(PREFIX + key);
    if (value === null) return defaultValue;
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * 设置存储值
 */
export function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.error('[Storage] Failed to save:', error);
  }
}

/**
 * 删除存储值
 */
export function removeStorage(key: string): void {
  localStorage.removeItem(PREFIX + key);
}
