/**
 * SSH 终端管理器 - 使用持久化 shell 会话
 */

import { Client, ClientChannel } from 'ssh2';

interface ServerConfig {
  id?: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  password?: string;
  privateKey?: string;
}

interface SSHSession {
  client: Client;
  shell?: ClientChannel;
  currentDir: string;
  outputBuffer: string;
  pendingResolve?: (result: { success: boolean; output?: string; error?: string }) => void;
}

class TerminalManager {
  private sessions: Map<string, SSHSession> = new Map();

  /**
   * 测试连接
   */
  async testConnection(config: ServerConfig): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const client = new Client();
      const timeout = setTimeout(() => {
        client.end();
        resolve({ success: false, error: '连接超时' });
      }, 10000);

      client.on('ready', () => {
        clearTimeout(timeout);
        client.end();
        resolve({ success: true });
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ success: false, error: err.message });
      });

      try {
        client.connect({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.authType === 'password' ? config.password : undefined,
          privateKey: config.authType === 'key' ? config.privateKey : undefined,
          readyTimeout: 10000,
        });
      } catch (err) {
        clearTimeout(timeout);
        resolve({ success: false, error: String(err) });
      }
    });
  }

  /**
   * 建立连接
   */
  async connect(config: ServerConfig): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    return new Promise((resolve) => {
      const client = new Client();
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const timeout = setTimeout(() => {
        client.end();
        resolve({ success: false, error: '连接超时' });
      }, 15000);

      client.on('ready', () => {
        clearTimeout(timeout);
        this.sessions.set(sessionId, { 
          client, 
          currentDir: '~',
          outputBuffer: '',
        });
        resolve({ success: true, sessionId });
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ success: false, error: err.message });
      });

      client.on('close', () => {
        this.sessions.delete(sessionId);
      });

      try {
        client.connect({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.authType === 'password' ? config.password : undefined,
          privateKey: config.authType === 'key' ? config.privateKey : undefined,
          readyTimeout: 15000,
        });
      } catch (err) {
        clearTimeout(timeout);
        resolve({ success: false, error: String(err) });
      }
    });
  }

  /**
   * 断开连接
   */
  async disconnect(sessionId: string): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: '会话不存在' };
    }

    try {
      if (session.shell) {
        session.shell.end();
      }
      session.client.end();
      this.sessions.delete(sessionId);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * 执行命令 - 使用 exec 但通过 cd 前缀保持目录状态
   */
  async execute(sessionId: string, command: string): Promise<{ success: boolean; output?: string; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: '会话不存在' };
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: '命令执行超时' });
      }, 30000);

      // 构建完整命令：先 cd 到当前目录，再执行命令，最后输出新的当前目录
      const fullCommand = `cd ${session.currentDir} 2>/dev/null || cd ~; ${command}; echo "___PWD___"; pwd`;

      session.client.exec(fullCommand, (err, stream) => {
        if (err) {
          clearTimeout(timeout);
          resolve({ success: false, error: err.message });
          return;
        }

        let output = '';
        let errorOutput = '';

        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });

        stream.on('close', () => {
          clearTimeout(timeout);
          
          // 解析输出，提取新的当前目录
          const pwdMarker = '___PWD___';
          const markerIndex = output.indexOf(pwdMarker);
          let commandOutput = output;
          
          if (markerIndex !== -1) {
            commandOutput = output.slice(0, markerIndex).trim();
            const pwdPart = output.slice(markerIndex + pwdMarker.length).trim();
            const newDir = pwdPart.split('\n')[0].trim();
            if (newDir) {
              session.currentDir = newDir;
            }
          }

          if (errorOutput && !commandOutput) {
            resolve({ success: true, output: errorOutput.trim() });
          } else if (commandOutput) {
            const finalOutput = commandOutput + (errorOutput ? '\n' + errorOutput : '');
            resolve({ success: true, output: finalOutput.trim() });
          } else {
            resolve({ success: true, output: '' });
          }
        });

        stream.on('error', (streamErr: Error) => {
          clearTimeout(timeout);
          resolve({ success: false, error: streamErr.message });
        });
      });
    });
  }

  /**
   * 关闭所有连接
   */
  closeAll(): void {
    for (const [sessionId, session] of this.sessions) {
      try {
        if (session.shell) session.shell.end();
        session.client.end();
      } catch (e) {
        console.error(`Failed to close session ${sessionId}:`, e);
      }
    }
    this.sessions.clear();
  }
}

export const terminalManager = new TerminalManager();
