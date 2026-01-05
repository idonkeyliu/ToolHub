/**
 * 工具导出
 */

import { TimestampTool } from './timestamp/TimestampTool';
import { PasswordTool } from './password/PasswordTool';
import { TextStatsTool } from './text-stats/TextStatsTool';
import { JsonTool } from './json/JsonTool';
import { CalcTool } from './calc/CalcTool';
import { DnsTool } from './dns/DnsTool';
import { CodecTool } from './codec/CodecTool';
import { CryptoTool } from './crypto/CryptoTool';
import { CurlTool } from './curl/CurlTool';
import { CurrencyTool } from './currency/CurrencyTool';
import { ColorTool } from './color/ColorTool';
import { CalendarTool } from './calendar/CalendarTool';
import { ImageTool } from './image/ImageTool';
import { DatabaseTool } from './database/DatabaseTool';
import { RedisTool } from './redis/RedisTool';
import { MongoTool } from './mongo/MongoTool';
// import { DiffTool } from './diff/DiffTool';
import { JwtTool } from './jwt/JwtTool';
// import { RegexTool } from './regex/RegexTool';
// import { TerminalTool } from './terminal/TerminalTool';
// import { SyncTool } from './sync/SyncTool';
import { UsageTracker } from './stats/StatsTool';
import { XVideoTool } from './xvideo/XVideoTool';
import { YoutubeTool } from './youtube/YoutubeTool';

export const tools = [
  TimestampTool,
  PasswordTool,
  TextStatsTool,
  JsonTool,
  CalcTool,
  DnsTool,
  CodecTool,
  CryptoTool,
  CurlTool,
  CurrencyTool,
  ColorTool,
  CalendarTool,
  ImageTool,
  DatabaseTool,
  RedisTool,
  MongoTool,
  // DiffTool,
  JwtTool,
  // RegexTool,
  // TerminalTool,
  // SyncTool,
  XVideoTool,
  YoutubeTool,
];

// 导出使用追踪器
export { UsageTracker };
