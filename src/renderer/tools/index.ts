/**
 * 工具导出
 */

import { TimestampTool } from './timestamp/TimestampTool';
import { PasswordTool } from './password/PasswordTool';
import { TextStatsTool } from './text-stats/TextStatsTool';
import { JsonTool } from './json/JsonTool';
import { CalcTool } from './calc/CalcTool';
import { DnsTool } from './dns/DnsTool';

export const tools = [
  TimestampTool,
  PasswordTool,
  TextStatsTool,
  JsonTool,
  CalcTool,
  DnsTool,
  // 后续迁移的工具在这里添加
];
