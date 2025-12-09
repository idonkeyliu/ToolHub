/**
 * 剪贴板工具函数
 */

/**
 * 复制文本到剪贴板
 */
export async function copyText(text: string): Promise<boolean> {
  const val = String(text ?? '');

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(val);
      return true;
    }
  } catch {
    // 降级到 execCommand
  }

  return fallbackCopy(val);
}

/**
 * 降级复制方案
 */
function fallbackCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand('copy');
    return true;
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}
