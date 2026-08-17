<div align="center">

# DeepSeek Harness Desktop

**A real desktop app for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)**

No more losing it in a sea of browser tabs — one icon, double-click to open, and it keeps
running quietly in the background when you close the window.

[中文](README.md) | English

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Latest release](https://img.shields.io/github/v/release/xiincs/deepseek-harness-desktop)](https://github.com/xiincs/deepseek-harness-desktop/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/xiincs/deepseek-harness-desktop/total)](https://github.com/xiincs/deepseek-harness-desktop/releases)

**[⬇️ Download now](https://github.com/xiincs/deepseek-harness-desktop/releases/latest)** ·
[Features](#-what-it-does) ·
[FAQ](#-faq)

<p align="center">
  <img src="docs/screenshots/app-boot.png" alt="Boot page" width="400">
</p>

</div>

---

## ✨ What is this

DeepSeek Harness ships as a web app — great on its own, but still just another browser tab:
easy to close by accident, easy to lose in a pile of other tabs, gone after a restart until you
dig it back up.

**DeepSeek Harness Desktop** turns it into an actual app: pin it to your taskbar like any other
program, double-click to open, and closing the window doesn't mean quitting — it sits quietly
in your system tray, one click away, exactly where you left it.

## 🚀 What it does

- **Double-click and go**: open the app and it gets everything running in the background for
  you — no terminal, no ports to figure out.
- **Closing isn't quitting**: hitting the close button just hides the window; work keeps going.
  Only "Quit" from the tray actually exits.
- **Same data as the web version**: sessions and settings live in one shared place — switch
  freely between the browser version and the desktop app with nothing to sync or lose.
- **Recovers from crashes on its own**: if the background service dies unexpectedly, the app
  restarts it automatically; if that fails too, it tells you why instead of leaving you guessing.
- **Small and fast**: uses your system's own browser engine instead of bundling a full Chromium
  like many similar apps do, so the installer is much smaller and it opens faster.

> This is a deliberately minimal build: no bundled Node runtime (it uses the Node.js already
> installed on your system), and no file panel / terminal / plugin market. It exists for one
> job — double-click to launch, live in the tray.

## ⬇️ Download

Head to the **[Releases page](https://github.com/xiincs/deepseek-harness-desktop/releases/latest)**
and grab the installer:

| Platform | Installer | Notes |
|---|---|---|
| Windows | `.exe` | Just double-click to install; no admin rights needed |

> [Node.js](https://nodejs.org/) must already be installed on your system (the app detects it
> and shows a hint if not). macOS / Linux branches still exist in the repo, but this minimal
> build ships Windows x64 installers only.

## ❓ FAQ

**Is this an official product?**
No. DeepSeek Harness itself is maintained by the official team; this desktop wrapper is an
independent, community-built app that solves one specific problem — the web version being
inconvenient to live with day to day.

**Is my data safe?**
The web UI inside the app (the actual DeepSeek Harness part) runs in an isolated sandbox with
no access to anything on your computer, exactly like the browser version. The desktop shell
itself reads and writes no workspace files.

**Can I use it offline?**
The app itself opens fine offline, but whether the DeepSeek Harness service inside it needs a
network connection depends entirely on how you've configured your model provider. On first use,
if no dsh runtime is found it will be downloaded once via npm.

**Want to contribute or build it yourself?**
Welcome — see the [development guide](docs/DEVELOPMENT.en.md).

## License

[MIT](./LICENSE)
