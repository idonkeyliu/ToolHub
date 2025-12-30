// Emoji 分类配置
export interface EmojiCategory {
  id: string;
  name: string;
  dir: string;
  icon: string;
}

export const emojiCategories: EmojiCategory[] = [
  { id: 'smileys', name: '笑脸与情感', dir: '笑脸与情感', icon: '😀' },
  { id: 'people', name: '人物与身体', dir: '人物与身体', icon: '👋' },
  { id: 'animals', name: '动物与自然', dir: '动物与自然', icon: '🐱' },
  { id: 'food', name: '食物与饮料', dir: '食物与饮料', icon: '🍎' },
  { id: 'travel', name: '旅行与地点', dir: '旅行与地点', icon: '🚗' },
  { id: 'activities', name: '活动', dir: '活动', icon: '⚽' },
  { id: 'objects', name: '物品', dir: '物品', icon: '💡' },
  { id: 'symbols', name: '符号', dir: '符号', icon: '❤️' },
  { id: 'flags', name: '旗帜', dir: '旗帜', icon: '🏁' },
];

// 获取 emoji 图片路径
export function getEmojiPath(dir: string, filename: string): string {
  return `assets/emojis/${encodeURIComponent(dir)}/${encodeURIComponent(filename)}`;
}
