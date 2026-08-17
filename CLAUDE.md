# dsh-desktop

Tauri（Rust + WebView2）桌面壳，托管 `@deepseek-ai/dsh` 的 `dsh web` 服务并把窗口指向它。真正的界面是 `dsh web` 提供的网页（本机 `http://127.0.0.1:<port>`），这个仓库只是一个启动/管理它的原生外壳：双击图标 → 用系统 Node 拉起服务 → 关闭窗口即隐藏到托盘常驻。

面向终端用户的产品介绍见 [README.md](README.md)；搭建开发环境、打包发布见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。这份文档只写给未来在这个仓库里工作的开发者/AI 助手：架构、代码里不写在注释里就容易被忽略的隐性约束、以及会反复浪费时间的坑。不记录"最近一轮做了什么"这类会过时的内容——那类信息看 `git log`，或找 `docs/internal/HANDOFF.md`（每轮开发结束会被重写，只反映最新一轮）。

## 架构

```
┌─ Tauri 外壳 (Rust, src-tauri/) ───────────────────────────┐
│ 本地启动页 (ui/index.html + app.js)：加载中 / 出错 / 重试    │
│   └─ 就绪后 <iframe> 指向 → http://127.0.0.1:<port>        │
│ 服务管理器 (server.rs)                                      │
│   定位系统 node → 解析 dsh（显式指定 > 全局安装 > npx 缓存   │
│   > 托管目录，仅兜底时安装）→ 探测端口 → 拉起进程            │
│   → 解析 stdout 里的真实 URL → 监视 → 退出时杀整棵进程树      │
│   就绪后后台比对 npm 最新版（仅提示，不自动下载/更新）        │
│ 原生菜单/托盘 (menu.rs)                                      │
└─────────────────────────┬──────────────────────────────────┘
                          │ 拉起子进程
                 ┌────────▼────────┐
                 │  dsh web 服务    │  数据 → ~/.dsh (DSH_HOME)
                 └─────────────────┘
```

`ui/` 只有一层：`index.html` + `app.js` + `styles.css`，无构建步骤、无框架，纯手写 DOM。`<iframe>` 里加载的 harness 页面**没有** Tauri IPC 访问权限（`dangerousRemoteDomainIpcAccess` 从不开启）——所有外壳层面的操作（菜单/托盘、启动页按钮）都是 `ui/app.js` 直接调 `invoke()`，跟 iframe 内容完全隔离，harness 页面本身接触不到桌面能力。

> 注意：本仓库是**阉割后的最小版**。历史上曾有右侧 dock（文件面板 `panel.rs`、内嵌终端 `terminal.rs`、插件市场）与内置 Node 运行时（`resources/runtime`，随安装包分发），均已被移除，请勿以为漏写。

## 关键约束（会反复踩，务必记住）

- **改了 `ui/*` 任何文件，必须 `cargo build`（或 `npm run tauri dev`/`build`）才会生效，不能只重跑已有的 `.exe`。** `tauri.conf.json` 的 `frontendDist` 指向 `../ui`，Tauri 在**编译期**把整个 `ui/` 目录内嵌进二进制（`tauri.localhost` 自定义协议从内嵌资源读，不是运行时读磁盘）。改完前端代码却"重跑旧进程"是这个项目里最容易踩、最容易误诊为"代码有 bug"的坑——先确认是不是在跑旧二进制，再往 CSS/JS 逻辑里找。
- **Windows 上调用 npm 生态的 CLI（npm/pnpm/…）不能直接 `Command::new("npm")`。** 这些工具在 Windows 上装成 `.cmd`/`.ps1` shim，`Command::new` 直接调 `CreateProcess`，不会像交互式 shell 那样查 `PATHEXT` 去尝试 `.cmd` 后缀，会报"program not found"。项目里正确的调法是 `server.rs` 的 `npm_ecosystem_command(program, args)`（Windows 上转发到 `cmd /C <program> <args>`），新增任何 shell 出去调这类工具的代码都要走这个，不要重新手写 `Command::new`。
- **`effective_path()`（`server.rs`）会展开注册表 PATH 里的 `%VAR%` 占位符，但这需要显式调用 `expand_env_string`（Win32 `ExpandEnvironmentStringsW`）。** `winreg` 的 `get_value::<String, _>` 对 `REG_EXPAND_SZ` 类型的值只做原样字符串解码，从不展开——如果直接读注册表 PATH 而不经过这层展开，任何装在 `%SOME_VAR%\...` 这类路径下的工具（常见于 nvm-for-windows 等版本管理器）会在子进程里彻底找不到，且没有任何报错线索指向真正原因。这是这个项目里已经踩过一次、排查耗时最长的坑。
- **`server.rs` 里所有子进程启动，PATH 都要显式设成 `effective_path()` 的返回值，不能依赖继承的进程环境。** 从 Explorer/开始菜单启动的 GUI 进程，PATH 只在登录时计算一次；装了新工具但没注销重登，旧进程（以及它派生的所有子进程）看到的 PATH 是过时的，可能完全找不到刚装好的工具。
- **`docs/DEVELOPMENT.md` 里写的环境变量覆盖项（`DSH_DESKTOP_NODE`/`DSH_DESKTOP_DSH_BIN`/`DSH_DESKTOP_RUNTIME_DIR` 等）是诊断"找不到 node/dsh"类问题时的第一入口**，不要在 `resolve_node`/`resolve_bin` 之外另起一套定位逻辑。
- **测试原生窗口时，关闭方式必须带上子进程清理。** `taskkill` 要 `/F /T`（不带 `/T` 会留下孤儿 `dsh` Node 服务，下次重新编译/启动时可能撞端口冲突或读到脏状态）。
- **手动验证原生窗口界面的改动（截图、点击、拖拽）应该让用户直接在真实窗口里操作确认，不要依赖自动化工具反复截图/读无障碍树来回合调试。** 桌面自动化对这个项目某些原生窗口的截图本身不可靠（历史上记录过纯黑图），反复来回的诊断成本远高于直接问用户"你看到的是什么"。

## 目录速查

- `src-tauri/src/server.rs` — dsh 子进程生命周期、系统 node/dsh 运行时解析、PATH 处理、端口探测与崩溃自愈
- `src-tauri/src/menu.rs` — 原生菜单栏（仅 macOS）+ 托盘
- `src-tauri/src/lib.rs` — 窗口/安全配置、全部 IPC 命令、托盘动作分发、退出清理
- `ui/app.js` — 唯一的前端逻辑文件：启动页状态机（加载/出错/重试）、日志、汉堡菜单、窗口控制按钮
- `docs/internal/HANDOFF.md` — 最近一轮开发的交接记录，每轮重写，读之前先看 git log 确认没有更新的版本
