/**
 * 工具导出
 */

import { TimestampTool } from './timestamp/TimestampTool';
import { PasswordTool } from './password/PasswordTool';
import { TextStatsTool } from './text-stats/TextStatsTool';

export const tools = [
  TimestampTool,
  PasswordTool,
  TextStatsTool,
  // 后续迁移的工具在这里添加
];
