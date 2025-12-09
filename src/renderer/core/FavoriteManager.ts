/**
 * 收藏管理器
 * 管理用户收藏的工具
 */

import { getStorage, setStorage } from '../utils/storage';
import { eventBus } from './EventBus';
import { EventType } from '../types/index';

const STORAGE_KEY = 'favorites';

class FavoriteManager {
  private favorites: Set<string> = new Set();

  constructor() {
    this.load();
  }

  /**
   * 从存储加载收藏
   */
  private load(): void {
    const saved = getStorage<string[]>(STORAGE_KEY, []);
    this.favorites = new Set(saved);
  }

  /**
   * 保存收藏到存储
   */
  private save(): void {
    setStorage(STORAGE_KEY, Array.from(this.favorites));
  }

  /**
   * 检查是否已收藏
   */
  isFavorite(key: string): boolean {
    return this.favorites.has(key);
  }

  /**
   * 添加收藏
   */
  add(key: string): void {
    if (!this.favorites.has(key)) {
      this.favorites.add(key);
      this.save();
      eventBus.emit(EventType.FAVORITE_CHANGE, { key, action: 'add' });
    }
  }

  /**
   * 移除收藏
   */
  remove(key: string): void {
    if (this.favorites.has(key)) {
      this.favorites.delete(key);
      this.save();
      eventBus.emit(EventType.FAVORITE_CHANGE, { key, action: 'remove' });
    }
  }

  /**
   * 切换收藏状态
   */
  toggle(key: string): boolean {
    if (this.isFavorite(key)) {
      this.remove(key);
      return false;
    } else {
      this.add(key);
      return true;
    }
  }

  /**
   * 获取所有收藏
   */
  getAll(): string[] {
    return Array.from(this.favorites);
  }

  /**
   * 获取收藏数量
   */
  get count(): number {
    return this.favorites.size;
  }
}

export const favoriteManager = new FavoriteManager();
