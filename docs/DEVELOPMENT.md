# 开发指南

中文 | [English](DEVELOPMENT.en.md)

面向想要参与开发、自行构建，或者只是想搞清楚这个应用内部是怎么运作的读者。日常使用请看
[主 README](../README.md)。

## 开发环境要求

- [Rust](https://rustup.rs/)（MSVC 工具链）——用于构建 Tauri 外壳
- [Node.js](https://nodejs.org/) >= 22——`dsh` 本身依赖（应用会从 `PATH` 里定位它）
- [WebView2 运行时](https://developer.microsoft.com/microsoft-edge/webview2/)（Windows 11 已预装，
  多数 Windows 10 也已预装）

## 开发

```bash
npm install          # 安装 @tauri-apps/cli
npm run tauri dev    # 编译 Rust 外壳并打开应用窗口
```

应用启动时按以下顺序解析 `dsh`，复用已有副本，只有什么都没有时才联网安装一次：

1. `DSH_DESKTOP_DSH_BIN` / `DSH_DESKTOP_RUNTIME_DIR` 显式指定的副本；
2. 全局安装的 `@deepseek-ai/dsh`（`npm install -g`，经 `npm root -g` 定位）；
3. npx 缓存中的副本（`npx @deepseek-ai/dsh` 拉取后留在 `<npm cache>/_npx/` 下，多份时取
   最近拉取的那份；缓存被清理后自动落到下一级）；
4. 每用户运行时目录（`%LOCALAPPDATA%\dev.dsh.desktop\runtime`）里上次托管安装的副本；
5. 都没有 → 首次使用时 `npm install` 到运行时目录（结果会被 npm 缓存，重装不需要联网）。

也就是说：你自己用 `npm install -g` 或 `npx` 拉过 `dsh`，应用会直接用你那份，不会重新下载；
想升级就自己再拉一份，下次启动自动生效。启动页底部显示的版本号读自实际解析到的
`package.json`。

服务就绪后，外壳会在后台做一次更新检查（等价于在终端里跑 `dsh-check` 的版本对比部分：
本地副本版本 vs `npm view @deepseek-ai/dsh version`），有新版本时在启动页底部提示
`dsh x.y.z（可更新 → a.b.c）`并写入日志。仅检测、不自动下载——副本可能是用户自己的
全局/npx 安装，外壳不越权重写；离线时静默跳过。

### 环境变量覆盖项

| 变量 | 作用 |
|---|---|
| `DSH_DESKTOP_NODE` | 指定 `node.exe` 的绝对路径，代替 `PATH` 上那个 |
| `DSH_DESKTOP_DSH_BIN` | 指定某个 `dsh` `lib/bin.js` 的绝对路径（比如本地某个 checkout） |
| `DSH_DESKTOP_RUNTIME_DIR` | 托管 `@deepseek-ai/dsh` 运行时的位置（默认是应用缓存目录）；显式设置且其中已有 dsh 时优先于全局/npx 自动解析，指向空目录则兜底安装会装到那里 |
| `DSH_DESKTOP_DSH_VERSION` | 托管运行时使用的 npm 版本号（默认 `0.1.0-rc.7`） |
| `DSH_DESKTOP_PORT` | 默认绑定端口覆盖（默认 `3080`）；同时跑多个实例时很有用 |
| `DSH_DESKTOP_CWD` | `dsh` 服务进程的工作目录（默认是用户主目录） |
| `DSH_HOME` | 透传给服务端；harness 数据根目录（默认 `~/.dsh`） |

## 架构

```
┌─ Tauri 应用 (Rust, WebView2) ─────────────────────────────┐
│ 本地启动页（加载中 / 出错 / 重试）                          │
│   └─ 就绪后 <iframe> 指向 → http://127.0.0.1:<port>        │
│ 服务管理器 (src-tauri/src/server.rs)                       │
│   定位系统 node → 解析 dsh（显式指定 > 全局 > npx 缓存      │
│   > 托管目录，必要时兜底安装）→ 探测 3080 端口              │
│   → 拉起 `node dsh web --port …` → 从 stdout 解析真实 URL   │
│   → 监视进程 → 退出时 taskkill 整棵进程树                    │
│ 原生菜单与托盘 (src-tauri/src/menu.rs)                      │
└─────────────────────────┬────────────────────────────────┘
                          │ 拉起
                 ┌────────▼────────┐
                 │  dsh web 服务    │  数据 → ~/.dsh (DSH_HOME)
                 └─────────────────┘
```

harness 页面从 `http://127.0.0.1:<port>` 加载，故意**不**授予 Tauri IPC 访问权限
（`dangerousRemoteDomainIpcAccess` 始终不开启），所以 Web 界面本身接触不到桌面外壳——所有外壳层面的
操作都得走原生菜单/托盘，或者本地启动页。

## 打包安装程序

```bash
npm install
npm run build         # → src-tauri/target/release/bundle/nsis/DeepSeek Harness_<version>_x64-setup.exe
```

正式发布前先跑一下 `npm run check:dsh-version`——上游还在开发者预览阶段，会毫无预警地发布新的 RC；
这个脚本会检查写死的 `@deepseek-ai/dsh` 默认版本号（在 `src-tauri/src/server.rs`）是否落后于 npm 上的
最新版本。发布 CI workflow 也会跑同一个检查，版本号对不上会直接让构建失败。

### 两条独立的版本轴线

这个应用有两个互相独立、不能混为一谈的版本号：

- **外壳版本**（`tauri.conf.json` 里的 `version`）——桌面外壳本身的版本。
- **运行时版本**（`server.rs` 里的 `DSH_VERSION_DEFAULT`）——仅在**兜底安装**时使用的
  `@deepseek-ai/dsh` 版本号。应用优先复用用户已有的副本（显式指定 > 全局安装 > npx 缓存 >
  托管目录，见上文解析顺序），此时实际版本以启动页底部显示的为准（读自解析到的
  `package.json`，就绪后还会与 npm 最新版比对、有更新时提示）。想用更新的 `dsh`，自己
  `npm install -g` / `npx` 拉一份即可，下次启动自动生效；`DSH_DESKTOP_DSH_VERSION` 只影响
  兜底安装的版本。
