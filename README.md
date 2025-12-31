# ToolHub - All-in-One Developer Toolkit

> A powerful Electron-based desktop app that brings together AI chat platforms and 20+ essential developer tools in one unified workspace.

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)

## Why ToolHub?

**Stop switching between dozens of browser tabs and apps.** ToolHub combines everything developers need into a single, beautiful desktop application:

- 🤖 **7 AI Assistants** - ChatGPT, Gemini, DeepSeek, Kimi, Grok, Perplexity, LMArena
- 🛠️ **20+ Built-in Tools** - JSON formatter, Base64 encoder, JWT decoder, and more
- 💾 **Database Clients** - MySQL, PostgreSQL, SQLite, Redis, MongoDB
- 🎨 **Modern Dark UI** - Neon-style design that's easy on the eyes

## Features

### AI Chat Platforms

| Platform | Description |
|----------|-------------|
| [ChatGPT](https://chat.openai.com) | OpenAI's powerful conversational AI |
| [Gemini](https://gemini.google.com) | Google's multimodal AI assistant |
| [DeepSeek](https://chat.deepseek.com) | Professional code generation AI |
| [Kimi](https://kimi.moonshot.cn) | Long-context processing expert |
| [Grok](https://grok.x.ai) | xAI's real-time information AI |
| [Perplexity](https://www.perplexity.ai/) | AI-powered search engine |
| [LMArena](https://lmarena.ai/zh) | LLM leaderboard & comparison |

### Developer Tools

| Category | Tools |
|----------|-------|
| **Encoding** | Base64, URL, Unicode, JWT |
| **Crypto** | MD5, SHA, AES, DES encryption |
| **Data** | JSON formatter, Diff viewer, Regex tester |
| **Network** | cURL builder, DNS lookup |
| **Utilities** | Timestamp converter, Password generator, Calculator |
| **Media** | Color picker, Image compressor |
| **Database** | MySQL, PostgreSQL, SQLite, Redis, MongoDB clients |

### User Experience

- **Custom Websites** - Add any website to the app with custom icons and categories
- **Session Persistence** - Your chat history and tool data are automatically saved
- **Keyboard Shortcuts** - Navigate quickly with hotkeys
- **Responsive Layout** - Adapts to any window size
- **Cross-Platform** - Works on macOS, Windows, and Linux

## Download

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | [ToolHub-0.1.0-arm64.dmg](#) |
| macOS (Intel) | [ToolHub-0.1.0-x64.dmg](#) |
| Windows | [ToolHub-0.1.0-Setup.exe](#) |
| Linux | [ToolHub-0.1.0.AppImage](#) |

> **macOS 用户注意**: 如果下载的应用提示"已损坏"或"无法打开"，请在终端执行：
> ```bash
> xattr -cr /Applications/ToolHub.app
> ```

## Tech Stack

- **Framework**: Electron 28
- **Language**: TypeScript 5.4
- **Database**: better-sqlite3, mysql2, pg, mongodb, ioredis
- **Build**: electron-builder

## Roadmap

- [ ] Plugin system for custom tools
- [ ] Cloud sync for settings

**Made with ❤️ for developers who value productivity**

⭐ **Star this repo if ToolHub helps your workflow!**
