# 🚀 ToolHub - 智能工具集合平台

一个基于 Electron 的桌面应用，集成多个 AI 聊天平台和实用工具，提供统一、高效的工作环境。

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)

## ✨ 特性

### 🤖 AI 聊天平台
- **OpenAI ChatGPT**: 最先进的对话AI
- **Google Gemini**: Google的多模态AI助手  
- **DeepSeek**: 专业的代码生成AI
- **Kimi**: Moonshot AI的长文本处理专家
- **Grok**: xAI的实时信息AI

### �️ 内置实用工具
- **⏰ 时间戳工具**: Unix时间戳转换、实时时钟显示
- **� 密码生成器**: 安全密码生成、强度检测
- **🧮 计算器**: 简洁高效的数学计算器
- **🌐 DNS 解析**: 多源DNS查询、记录类型支持
- **📝 JSON 解析**: 智能格式化、树形展示、路径查询
- **🔤 编解码工具**: URL、Base64、Unicode编解码转换
- **🔐 加解密工具**: MD5哈希、AES/DES加解密

### 🎨 用户体验
- **现代化界面**: 深色主题、霓虹风格设计
- **智能布局**: 自适应窗口大小、响应式设计
- **会话持久化**: 自动保存聊天状态和工具数据
- **快捷操作**: 一键复制、粘贴、清空等便捷功能

## 🏗️ 项目结构

```
llm-hub/
├── electron-shell/          # Electron桌面应用主体
│   ├── src/
│   │   ├── main.ts          # 主进程 - 窗口管理、权限控制
│   │   ├── preload.ts       # 预加载脚本 - 安全API桥接
│   │   └── renderer/        # 渲染进程 - 用户界面
│   │       ├── index.html   # 主界面 - 集成所有工具和AI平台
│   │       └── assets/      # 图标资源
│   ├── package.json         # 项目配置和依赖
│   └── tsconfig.json        # TypeScript配置
├── app/                     # 辅助工具项目
├── pyproject.toml          # Python项目配置（备用后端）
└── package-lock.json       # 依赖锁定文件
```

## 🚀 快速开始

### 前置要求

- **Node.js** (v16+)
- **npm** 或 yarn
- **macOS/Windows/Linux** 操作系统

### 安装与运行

1. **克隆项目**

   ```bash
   git clone <repository-url>
   cd llm-hub/electron-shell
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **构建并运行**

   ```bash
   # 构建项目
   npm run build
   
   # 启动应用
   npm start
   ```

4. **开发模式**（实时编译）

   ```bash
   npm run dev
   ```

### 打包发布

- **macOS 打包**:
  ```bash
  npm run dist:mac
  ```
  
- **目录打包**（所有平台）:
  ```bash
  npm run dist:dir
  ```

## 🎮 使用方法

### AI 聊天平台
1. **选择平台**: 点击顶部导航的 OpenAI、Gemini、DeepSeek、Kimi 或 Grok
2. **开始对话**: 在选定平台中登录并开始聊天
3. **切换平台**: 随时点击其他标签页切换到不同的AI助手
4. **会话保持**: 应用会自动保存各平台的登录状态和对话历史

### 实用工具

#### ⏰ 时间戳工具
- **实时时钟**: 显示当前日期和时间
- **Unix转换**: 时间戳与人类可读时间的双向转换
- **快速复制**: 一键复制时间戳或格式化时间

#### 🔐 密码生成器
- **自定义长度**: 8-64位密码长度调节
- **字符集选择**: 大小写字母、数字、符号可选组合
- **强度检测**: 实时显示密码强度评估
- **安全生成**: 使用加密随机数生成器

#### 🧮 计算器
- **基础运算**: 加减乘除、百分比运算
- **表达式计算**: 支持括号和复合表达式
- **快捷操作**: 支持键盘输入和鼠标点击
- **错误处理**: 友好的错误提示和恢复

#### 🌐 DNS 解析
- **多源查询**: 同时查询 Google、Cloudflare DNS
- **记录类型**: 支持 A、AAAA、CNAME、TXT、MX、NS、SRV、CAA、PTR
- **自定义端点**: 支持添加自定义 DoH 服务器
- **结果展示**: 表格/列表模式切换，支持复制结果

#### 📝 JSON 解析
- **智能解析**: 自动检测和格式化 JSON
- **树形展示**: 可折叠的交互式树形结构
- **工具栏**: 格式化、压缩、按键排序、复制粘贴
- **便捷操作**: 展开/折叠全部、键值对导航

#### 🔤 编解码工具
- **URL 编解码**: 网址参数编码/解码转换
- **Base64 编解码**: 文本与Base64格式互相转换
- **Unicode 编解码**: 文本与Unicode编码互相转换
- **双向操作**: 支持编码和解码的双向转换

#### 🔐 加解密工具
- **MD5 哈希**: 生成32位/16位大小写MD5值
- **AES 加解密**: 对称加密算法，支持自定义密钥
- **DES 加解密**: 经典加密算法，8字节密钥
- **结果复制**: 一键复制加密/解密结果

## 🛠️ 技术栈

### 前端技术

- **Electron**: 跨平台桌面应用框架
- **TypeScript**: 类型安全的JavaScript超集  
- **HTML5/CSS3**: 现代化Web标准
- **WebView**: 嵌入式浏览器组件
- **DOM API**: 原生浏览器接口

### 核心特性

- **会话隔离**: 每个AI平台独立的持久化会话
- **权限管理**: 细粒度的剪贴板和媒体权限控制
- **响应式设计**: 自适应不同屏幕尺寸的界面布局
- **安全沙箱**: 渲染进程隔离和上下文安全

### 开发工具

- **npm**: 包管理和脚本运行
- **TSC**: TypeScript编译器
- **electron-builder**: 应用打包和分发
- **concurrently**: 并行开发任务管理
- **wait-on**: 依赖就绪检测

## 📁 核心文件说明

### 主要组件

- **`main.ts`**: Electron主进程，管理窗口、菜单、权限
- **`preload.ts`**: 安全桥接脚本，暴露受控的Node.js API  
- **`index.html`**: 单页面应用，集成所有AI平台和工具
- **`package.json`**: 项目配置、依赖管理和构建脚本

### 关键功能模块

- **框架绕过**: 动态移除X-Frame-Options和CSP限制
- **用户代理**: 按域名自定义UA字符串提升兼容性
- **上下文菜单**: 全局右键复制粘贴功能

## 🔧 开发指南

### 添加新工具

1. **定义工具配置**: 在 `builtinSites` 中添加新条目
2. **创建UI函数**: 实现 `buildXxxHTML()` 和 `wireXxx()` 
3. **集成到导航**: 在 `switchSite()` 中添加处理逻辑
4. **添加样式**: 在 CSS 部分定义工具专用样式

### 添加新AI平台

1. **更新站点列表**: 修改 `builtinSites` 数组
2. **配置会话隔离**: 设置独立的 `partition` 
3. **权限适配**: 在 `FRAME_BYPASS_HOSTS` 中添加域名
4. **可选UA设置**: 在 `UA_MAP` 中配置用户代理

### 调试技巧

- **开发者工具**: `Cmd+Option+I` (macOS) 或 `Ctrl+Shift+I` (Windows/Linux)
- **重载应用**: `Cmd+R` (macOS) 或 `Ctrl+R` (Windows/Linux)  
- **网络调试**: 查看各AI平台的网络请求和响应

## � 常见问题

### Q: 页面显示区域太小怎么办？

A: 查看页面右上角的布局检测器，它会自动诊断并尝试修复布局问题。

### Q: 如何添加新的LLM平台？

A: 修改 `fallbackSites` 数组，添加新的站点配置。

### Q: 应用启动失败怎么办？

A: 确保已安装所有依赖，运行 `npm install` 重新安装。

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献指南

欢迎为 ToolHub 做出贡献！你可以通过以下方式参与：

- **报告Bug**: 在 GitHub Issues 中描述问题
- **功能建议**: 提出新工具或改进建议
- **代码贡献**: 提交 Pull Request
- **文档改进**: 完善使用说明和开发文档

### 贡献流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📞 联系方式

- **GitHub Issues**: 报告问题和建议
- **邮件联系**: 项目维护者邮箱
- **社区讨论**: GitHub Discussions

---

**⭐ 如果 ToolHub 对你有帮助，请给个星标支持！**

> ToolHub - 让AI和工具触手可及，提升你的工作效率
