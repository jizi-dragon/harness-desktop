# Development guide

[中文](DEVELOPMENT.md) | English

For contributors, people building from source, or anyone curious how the app works internally.
For day-to-day usage, see the [main README](../README.en.md).

## Prerequisites

- [Rust](https://rustup.rs/) (MSVC toolchain) — for the Tauri shell
- [Node.js](https://nodejs.org/) >= 22 — required by `dsh` itself (the app locates it on `PATH`)
- [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (preinstalled on
  Windows 11 / most Windows 10)

## Development

```bash
npm install          # installs @tauri-apps/cli
npm run tauri dev    # builds the Rust shell and opens the app window
```

On startup the app resolves `dsh` in the following order, reusing an existing copy and only
downloading when nothing is found:

1. a copy explicitly pointed to by `DSH_DESKTOP_DSH_BIN` / `DSH_DESKTOP_RUNTIME_DIR`;
2. a global `@deepseek-ai/dsh` install (`npm install -g`, located via `npm root -g`);
3. a copy in the npx cache (left under `<npm cache>/_npx/` by `npx @deepseek-ai/dsh`; with
   several present, the most recently pulled one wins; a cleaned cache just falls through);
4. the per-user runtime dir (`%LOCALAPPDATA%\dev.dsh.desktop\runtime`) from a previous
   managed install;
5. none of the above → first-use `npm install` into the runtime dir (cached by npm, so a
   reinstall needs no network).

In other words: if you pulled `dsh` yourself via `npm install -g` or `npx`, the app uses your
copy and never re-downloads; to upgrade, pull a newer copy and the next start picks it up. The
version shown in the boot page footer is read from the resolved copy's `package.json`.

Once the server is ready, the shell runs a background update check (the version-compare half of
a terminal `dsh-check`: resolved copy vs `npm view @deepseek-ai/dsh version`) and, when a newer
release exists, shows `dsh x.y.z (update available → a.b.c)` in the footer plus a log line.
Detect-only, never auto-downloading — the copy may be the user's own global/npx install, which
the shell must not rewrite; offline simply skips the check silently.

### Environment overrides

| Variable | Purpose |
|---|---|
| `DSH_DESKTOP_NODE` | Absolute path to `node.exe` to use instead of the one on `PATH` |
| `DSH_DESKTOP_DSH_BIN` | Absolute path to a `dsh` `lib/bin.js` (e.g. a local checkout) |
| `DSH_DESKTOP_RUNTIME_DIR` | Where the managed `@deepseek-ai/dsh` runtime lives (default: app cache dir); when set explicitly and a dsh copy is already there, it takes precedence over global/npx auto-discovery; when set but empty, the fallback install goes there |
| `DSH_DESKTOP_DSH_VERSION` | npm version spec for the managed runtime (default `0.1.0-rc.7`) |
| `DSH_DESKTOP_PORT` | Default bind port override (default `3080`); handy for running several instances |
| `DSH_DESKTOP_CWD` | Working directory for the `dsh` server process (default: user home) |
| `DSH_HOME` | Passed through to the server; harness data root (default `~/.dsh`) |

## Architecture

```
┌─ Tauri app (Rust, WebView2) ─────────────────────────────┐
│ local boot page (loading / error / retry)                │
│   └─ <iframe> points to → http://127.0.0.1:<port>        │
│ server manager (src-tauri/src/server.rs)                 │
│   locate system node → resolve dsh (explicit > global    │
│   > npx cache > managed dir, install only as a           │
│   fallback) → probe 3080 → spawn `node dsh web --port …` │
│   → parse stdout URL → watch → taskkill tree on exit     │
│ native menu & tray (src-tauri/src/menu.rs)               │
└─────────────────────────┬────────────────────────────────┘
                          │ spawn
                 ┌────────▼────────┐
                 │  dsh web server │  data → ~/.dsh (DSH_HOME)
                 └─────────────────┘
```

The harness page is loaded from `http://127.0.0.1:<port>` and is intentionally **not** granted
Tauri IPC access (`dangerousRemoteDomainIpcAccess` is never enabled), so the web UI cannot reach
the shell — every shell action goes through the native menu/tray or the local boot page.

## Building the installer

```bash
npm install
npm run build         # → src-tauri/target/release/bundle/nsis/DeepSeek Harness_<version>_x64-setup.exe
```

Before cutting a release, run `npm run check:dsh-version` — upstream is in developer preview and
publishes new RCs without notice; this checks the pinned `@deepseek-ai/dsh` default (in
`src-tauri/src/server.rs`) against npm's latest. The release workflow runs this same check and
fails the build on a mismatch.

### Two version axes

This app has two independent version numbers that must not be conflated:

- **Shell version** (`tauri.conf.json`'s `version`) — the desktop wrapper itself.
- **Runtime version** (`DSH_VERSION_DEFAULT` in `server.rs`) — the `@deepseek-ai/dsh` spec used
  **only for the fallback install**. The app prefers a copy the user already has (explicit >
  global > npx cache > managed dir — see the resolution order above); in that case the actual
  version is whatever the boot page footer shows (read from the resolved copy's `package.json`,
  then compared against npm latest once ready, with an update hint when behind). To use a newer
  `dsh`, pull one yourself (`npm install -g` / `npx`) and the next start picks it up;
  `DSH_DESKTOP_DSH_VERSION` only affects the fallback install.
