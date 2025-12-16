/**
 * 文件同步检测管理器
 * 比对 Git 仓库与服务器文件的差异
 */

import { Client } from 'ssh2';
import * as crypto from 'crypto';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';

interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  password?: string;
  privateKey?: string;
}

interface PathMapping {
  serverId: string;
  serverName: string;
  serverPath: string;
  gitSubdir: string;
}

interface ProjectConfig {
  id: string;
  name: string;
  gitUrl: string;
  gitBranch: string;
  gitToken?: string;
  mappings: PathMapping[];
  ignorePattern: string;
  checkContent: boolean;
}

interface FileDiff {
  path: string;
  status: 'synced' | 'modified' | 'added' | 'deleted';
  gitSize?: number;
  serverSize?: number;
  gitHash?: string;
  serverHash?: string;
}

interface ServerSyncResult {
  serverId: string;
  serverName: string;
  status: 'success' | 'error';
  error?: string;
  files: FileDiff[];
}

interface SyncResult {
  projectId: string;
  timestamp: number;
  servers: ServerSyncResult[];
}

class SyncManager {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'toolhub-sync');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 测试服务器连接
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
   * 执行同步检测
   */
  async checkSync(project: ProjectConfig, servers: ServerConfig[]): Promise<SyncResult> {
    const result: SyncResult = {
      projectId: project.id,
      timestamp: Date.now(),
      servers: [],
    };

    // 1. 克隆/更新 Git 仓库
    let gitPath: string;
    try {
      gitPath = await this.prepareGitRepo(project);
    } catch (err) {
      // 如果 Git 克隆失败，所有服务器都标记为错误
      for (const mapping of project.mappings) {
        const server = servers.find(s => s.id === mapping.serverId);
        if (server) {
          result.servers.push({
            serverId: server.id,
            serverName: server.name,
            status: 'error',
            error: `Git 仓库准备失败: ${err}`,
            files: [],
          });
        }
      }
      return result;
    }

    // 2. 获取 Git 文件列表和哈希
    const gitFiles = await this.getGitFiles(gitPath, project.ignorePattern);

    // 3. 对每个服务器映射进行检测
    const serverResults = new Map<string, ServerSyncResult>();

    for (const mapping of project.mappings) {
      const server = servers.find(s => s.id === mapping.serverId);
      if (!server) continue;

      // 初始化或获取服务器结果
      let serverResult = serverResults.get(server.id);
      if (!serverResult) {
        serverResult = {
          serverId: server.id,
          serverName: server.name,
          status: 'success',
          files: [],
        };
        serverResults.set(server.id, serverResult);
      }

      try {
        // 获取服务器文件列表
        const serverFiles = await this.getServerFiles(server, mapping.serverPath, project.ignorePattern);

        // 确定要比对的 Git 子目录
        const gitSubPath = mapping.gitSubdir ? path.join(gitPath, mapping.gitSubdir) : gitPath;
        const subGitFiles = this.filterGitFiles(gitFiles, gitPath, gitSubPath);

        // 比对文件
        const diffs = await this.compareFiles(
          subGitFiles,
          serverFiles,
          gitSubPath,
          server,
          mapping.serverPath,
          project.checkContent
        );

        serverResult.files.push(...diffs);
      } catch (err) {
        serverResult.status = 'error';
        serverResult.error = String(err);
      }
    }

    result.servers = Array.from(serverResults.values());
    return result;
  }

  /**
   * 准备 Git 仓库（克隆或更新）
   * 每次都删除旧仓库重新克隆，确保获取最新代码
   */
  private async prepareGitRepo(project: ProjectConfig): Promise<string> {
    const repoHash = crypto.createHash('md5').update(project.gitUrl).digest('hex').slice(0, 8);
    const repoPath = path.join(this.tempDir, `repo_${repoHash}`);

    // 构建 Git URL（带 token）
    let gitUrl = project.gitUrl;
    if (project.gitToken && gitUrl.startsWith('https://')) {
      const urlObj = new URL(gitUrl);
      urlObj.username = project.gitToken;
      gitUrl = urlObj.toString();
    }

    // 每次都删除旧仓库重新克隆，确保获取最新代码
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
    }

    // 克隆仓库（使用 --depth 1 加速）
    execSync(`git clone --branch ${project.gitBranch} --depth 1 "${gitUrl}" "${repoPath}"`, {
      stdio: 'pipe',
      timeout: 120000,
    });

    return repoPath;
  }

  /**
   * 获取 Git 仓库文件列表
   */
  private async getGitFiles(gitPath: string, ignorePattern: string): Promise<Map<string, { size: number; hash: string }>> {
    const files = new Map<string, { size: number; hash: string }>();
    const ignoreRegex = ignorePattern ? new RegExp(ignorePattern) : null;

    const walkDir = (dir: string, relativePath: string = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

        // 跳过忽略的文件
        if (ignoreRegex && ignoreRegex.test(relPath)) continue;

        if (entry.isDirectory()) {
          walkDir(fullPath, relPath);
        } else if (entry.isFile()) {
          try {
            const stat = fs.statSync(fullPath);
            const content = fs.readFileSync(fullPath);
            const hash = crypto.createHash('md5').update(content).digest('hex');
            files.set(relPath, { size: stat.size, hash });
          } catch (err) {
            // 忽略无法读取的文件
          }
        }
      }
    };

    walkDir(gitPath);
    return files;
  }

  /**
   * 过滤 Git 文件到子目录
   */
  private filterGitFiles(
    allFiles: Map<string, { size: number; hash: string }>,
    gitPath: string,
    subPath: string
  ): Map<string, { size: number; hash: string }> {
    if (gitPath === subPath) return allFiles;

    const relativeSub = path.relative(gitPath, subPath);
    const filtered = new Map<string, { size: number; hash: string }>();

    for (const [filePath, info] of allFiles) {
      if (filePath.startsWith(relativeSub + '/')) {
        const newPath = filePath.slice(relativeSub.length + 1);
        filtered.set(newPath, info);
      }
    }

    return filtered;
  }

  /**
   * 获取服务器文件列表
   */
  private async getServerFiles(
    server: ServerConfig,
    serverPath: string,
    ignorePattern: string
  ): Promise<Map<string, { size: number; hash: string }>> {
    return new Promise((resolve, reject) => {
      const client = new Client();
      const files = new Map<string, { size: number; hash: string }>();
      const ignoreRegex = ignorePattern ? new RegExp(ignorePattern) : null;

      const timeout = setTimeout(() => {
        client.end();
        reject(new Error('服务器连接超时'));
      }, 30000);

      client.on('ready', () => {
        // 使用 find 命令获取文件列表，然后用 md5sum 计算哈希
        const findCmd = `find "${serverPath}" -type f 2>/dev/null | head -5000`;
        
        client.exec(findCmd, (err, stream) => {
          if (err) {
            clearTimeout(timeout);
            client.end();
            reject(err);
            return;
          }

          let output = '';
          stream.on('data', (data: Buffer) => {
            output += data.toString();
          });

          stream.on('close', () => {
            const filePaths = output.trim().split('\n').filter(p => p);
            
            if (filePaths.length === 0) {
              clearTimeout(timeout);
              client.end();
              resolve(files);
              return;
            }

            // 过滤忽略的文件
            const filteredPaths = filePaths.filter(p => {
              const relPath = p.replace(serverPath + '/', '');
              return !ignoreRegex || !ignoreRegex.test(relPath);
            });

            if (filteredPaths.length === 0) {
              clearTimeout(timeout);
              client.end();
              resolve(files);
              return;
            }

            // 批量获取文件大小和 MD5
            const statCmd = filteredPaths.map(p => `stat -c '%s' "${p}" 2>/dev/null && md5sum "${p}" 2>/dev/null | cut -d' ' -f1`).join('; echo "---"; ');
            
            client.exec(statCmd, (statErr, statStream) => {
              if (statErr) {
                clearTimeout(timeout);
                client.end();
                // 如果 stat 失败，只返回文件路径
                filteredPaths.forEach(p => {
                  const relPath = p.replace(serverPath + '/', '');
                  files.set(relPath, { size: 0, hash: '' });
                });
                resolve(files);
                return;
              }

              let statOutput = '';
              statStream.on('data', (data: Buffer) => {
                statOutput += data.toString();
              });

              statStream.on('close', () => {
                clearTimeout(timeout);
                
                const results = statOutput.split('---').map(s => s.trim());
                filteredPaths.forEach((p, i) => {
                  const relPath = p.replace(serverPath + '/', '');
                  const result = results[i] || '';
                  const lines = result.split('\n').filter(l => l);
                  const size = parseInt(lines[0]) || 0;
                  const hash = lines[1] || '';
                  files.set(relPath, { size, hash });
                });

                client.end();
                resolve(files);
              });
            });
          });
        });
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      try {
        client.connect({
          host: server.host,
          port: server.port,
          username: server.username,
          password: server.authType === 'password' ? server.password : undefined,
          privateKey: server.authType === 'key' ? server.privateKey : undefined,
          readyTimeout: 15000,
        });
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  }

  /**
   * 比对文件差异
   */
  private async compareFiles(
    gitFiles: Map<string, { size: number; hash: string }>,
    serverFiles: Map<string, { size: number; hash: string }>,
    gitPath: string,
    server: ServerConfig,
    serverPath: string,
    checkContent: boolean
  ): Promise<FileDiff[]> {
    const diffs: FileDiff[] = [];
    const allPaths = new Set([...gitFiles.keys(), ...serverFiles.keys()]);

    for (const filePath of allPaths) {
      const gitFile = gitFiles.get(filePath);
      const serverFile = serverFiles.get(filePath);

      if (gitFile && serverFile) {
        // 两边都有
        if (checkContent) {
          if (gitFile.hash !== serverFile.hash) {
            diffs.push({
              path: filePath,
              status: 'modified',
              gitSize: gitFile.size,
              serverSize: serverFile.size,
              gitHash: gitFile.hash,
              serverHash: serverFile.hash,
            });
          } else {
            diffs.push({
              path: filePath,
              status: 'synced',
              gitSize: gitFile.size,
              serverSize: serverFile.size,
            });
          }
        } else {
          // 只检查存在性
          diffs.push({
            path: filePath,
            status: 'synced',
            gitSize: gitFile.size,
            serverSize: serverFile.size,
          });
        }
      } else if (gitFile && !serverFile) {
        // Git 有，服务器没有
        diffs.push({
          path: filePath,
          status: 'added',
          gitSize: gitFile.size,
        });
      } else if (!gitFile && serverFile) {
        // 服务器有，Git 没有
        diffs.push({
          path: filePath,
          status: 'deleted',
          serverSize: serverFile.size,
        });
      }
    }

    return diffs;
  }

  /**
   * 获取文件内容
   */
  async getFileContent(
    server: ServerConfig,
    filePath: string
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    return new Promise((resolve) => {
      const client = new Client();
      const timeout = setTimeout(() => {
        client.end();
        resolve({ success: false, error: '连接超时' });
      }, 15000);

      client.on('ready', () => {
        client.exec(`cat "${filePath}" 2>/dev/null | head -c 1048576`, (err, stream) => {
          if (err) {
            clearTimeout(timeout);
            client.end();
            resolve({ success: false, error: err.message });
            return;
          }

          let content = '';
          stream.on('data', (data: Buffer) => {
            content += data.toString();
          });

          stream.on('close', () => {
            clearTimeout(timeout);
            client.end();
            resolve({ success: true, content });
          });
        });
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ success: false, error: err.message });
      });

      try {
        client.connect({
          host: server.host,
          port: server.port,
          username: server.username,
          password: server.authType === 'password' ? server.password : undefined,
          privateKey: server.authType === 'key' ? server.privateKey : undefined,
          readyTimeout: 15000,
        });
      } catch (err) {
        clearTimeout(timeout);
        resolve({ success: false, error: String(err) });
      }
    });
  }

  /**
   * 清理临时文件
   */
  cleanup(): void {
    try {
      if (fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.error('Failed to cleanup temp dir:', err);
    }
  }
}

export const syncManager = new SyncManager();
