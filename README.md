<div align="center">

# DeepSeek Harness Desktop

**把 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 装进一个真正的桌面应用**

不用再守着浏览器标签页——一个图标，双击打开，关掉窗口它还在后台安静运行。

中文 | [English](README.en.md)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Latest release](https://img.shields.io/github/v/release/xiincs/deepseek-harness-desktop)](https://github.com/xiincs/deepseek-harness-desktop/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/xiincs/deepseek-harness-desktop/total)](https://github.com/xiincs/deepseek-harness-desktop/releases)

**[⬇️ 立即下载](https://github.com/xiincs/deepseek-harness-desktop/releases/latest)** ·
[功能一览](#-这个应用能做什么) ·
[常见问题](#-常见问题)

<p align="center">
  <img src="docs/screenshots/app-boot.png" alt="启动页" width="400">
</p>

</div>

---

## ✨ 这是什么

DeepSeek Harness 官方提供的是一个网页版工具——好用，但终究是浏览器里的一个标签页：不小心关错标签、
被一堆其他标签淹没、电脑重启后要重新找回来。

**DeepSeek Harness Desktop** 把它做成了一个真正的桌面应用：图标钉在任务栏上，双击就开，关窗口不等于
退出——它安静地待在系统托盘里，随时点一下就回来，之前的会话原封不动。

## 🚀 这个应用能做什么

- **双击即用**：打开应用，自动帮你把后台服务准备好，不需要敲命令行、不需要搞懂端口是什么。
- **关窗不等于退出**：点右上角的关闭按钮只是把窗口藏起来，工作还在继续；托盘图标右键才是真的退出。
- **数据和网页版完全通用**：所有会话、配置都存在同一个地方，网页版和桌面版随便切换，互不冲突。
- **崩溃了自己爬起来**：后台服务万一意外挂掉，应用会自动帮你重启一次；实在起不来也会告诉你原因，
  而不是一片空白让你猜。
- **体积小、开得快**：走的是系统自带的浏览器内核，不用像很多同类应用那样自带一个完整的 Chromium，
  装包小很多，打开也更快。

> 这是一个刻意做减法的精简版：不内置 Node 运行时（使用你系统上已装的 Node.js），也没有文件面板、
> 终端、插件市场等附加工作台——它就是「双击启动 + 托盘常驻」这一个核心用途的最小形态。

## ⬇️ 下载

前往 **[Releases 页面](https://github.com/xiincs/deepseek-harness-desktop/releases/latest)** 下载安装包：

| 系统 | 安装包 | 说明 |
|---|---|---|
| Windows | `.exe` | 双击安装即可，免管理员权限 |

> 使用前需要系统已安装 [Node.js](https://nodejs.org/)（应用会自动检测并给出提示）；macOS / Linux
> 分支代码仍在仓库中，但本精简版仅构建 Windows x64 安装包。

## ❓ 常见问题

**这是官方产品吗？**
不是。DeepSeek Harness 本体由官方维护，这个桌面壳是社区做的第三方封装，专门解决"网页版不方便"这一件事。

**我的数据安全吗？**
应用里的网页界面（也就是 DeepSeek Harness 本体的部分）运行在一个隔离的沙箱里，没有权限访问你电脑上
的任何东西，和你原本用网页版时完全一样。桌面壳本身不读写任何工作区文件。

**能不能带着走，不用联网也能用？**
应用本身可以离线打开，但里面加载的 DeepSeek Harness 服务该怎么工作还是怎么工作——具体取决于你配置的
模型服务本身是否需要联网。应用会优先复用你已有的 dsh（全局安装或用 npx 拉取过的副本），
只有什么都没找到时，才会在首次使用时通过 npm 下载一次。启动后若 npm 上有更新的版本，
界面底部会提示可更新（仅提示，不会自动下载）。

**想参与开发或者自己编译？**
欢迎，看 [开发指南](docs/DEVELOPMENT.md)。

## License

[MIT](./LICENSE)
