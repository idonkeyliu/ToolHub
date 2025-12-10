/**
 * 错误处理工具
 */

/**
 * 将未知错误转换为错误消息
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

/**
 * 安全的错误处理包装器
 */
export async function safeAsync<T>(
    fn: () => Promise<T>,
    context: string
): Promise<{ success: true; data: T } | { success: false; error: string }> {
    try {
        const data = await fn();
        return { success: true, data };
    } catch (error) {
        const message = getErrorMessage(error);
        console.error(`[${context}]`, error);
        return { success: false, error: message };
    }
}

/**
 * 同步错误处理包装器
 */
export function safe<T>(
    fn: () => T,
    context: string
): { success: true; data: T } | { success: false; error: string } {
    try {
        const data = fn();
        return { success: true, data };
    } catch (error) {
        const message = getErrorMessage(error);
        console.error(`[${context}]`, error);
        return { success: false, error: message };
    }
}
