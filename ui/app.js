// Container page for dsh-desktop (minimal shell): hosts the harness UI in an
// <iframe> and drives the boot/error states around it. Talks to the Rust
// shell through Tauri IPC. The harness content inside the iframe never gets
// IPC access — window.__TAURI__ is injected into this top-level document
// only, and browsers don't propagate it into a cross-origin nested iframe.
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const { getCurrentWindow } = window.__TAURI__.window;

const els = {
  starting: document.getElementById("state-starting"),
  error: document.getElementById("state-error"),
  harnessFrame: document.getElementById("harness-frame"),
  startingDetail: document.getElementById("starting-detail"),
  errorMessage: document.getElementById("error-message"),
  logBox: document.getElementById("log-box"),
  logBoxStarting: document.getElementById("log-box-starting"),
  btnLogsStarting: document.getElementById("btn-logs-starting"),
  btnRetry: document.getElementById("btn-retry"),
  btnRestart: document.getElementById("btn-restart"),
  btnLogs: document.getElementById("btn-logs"),
  btnOpenBrowser: document.getElementById("btn-open-browser"),
  footer: document.getElementById("footer"),
  providerTip: document.getElementById("provider-tip"),
  btnProviderTipDismiss: document.getElementById("btn-provider-tip-dismiss"),
  toolbar: document.getElementById("toolbar"),
  windowControls: document.getElementById("window-controls"),
  btnWinMinimize: document.getElementById("btn-win-minimize"),
  btnWinMaximize: document.getElementById("btn-win-maximize"),
  btnWinClose: document.getElementById("btn-win-close"),
  btnAppMenu: document.getElementById("btn-app-menu"),
  appMenu: document.getElementById("app-menu"),
};

// Shown once (best-effort) during the first-ever boot wait, so new users
// discover the existing Settings → 模型 → 添加提供方 flow without us having
// to touch the harness page itself (it's iframed content with zero IPC
// access — see lib.rs).
const PROVIDER_TIP_DISMISSED_KEY = "dsh-desktop-provider-tip-dismissed";

function initProviderTip() {
  if (localStorage.getItem(PROVIDER_TIP_DISMISSED_KEY)) return;
  els.providerTip.classList.remove("hidden");
  els.btnProviderTipDismiss.addEventListener("click", () => {
    localStorage.setItem(PROVIDER_TIP_DISMISSED_KEY, "1");
    els.providerTip.classList.add("hidden");
  });
}

let logsVisible = false;
let logsStartingVisible = false;

function show(id) {
  for (const key of ["starting", "error"]) {
    els[key].classList.toggle("hidden", key !== id);
  }
  els.harnessFrame.classList.toggle("hidden", id !== "running");
}

async function loadLogsInto(box) {
  try {
    const lines = await invoke("get_log_tail", { n: 200 });
    box.textContent = lines.join("\n");
  } catch (err) {
    box.textContent = `无法读取日志: ${err}`;
  }
}

function toggleLogs() {
  logsVisible = !logsVisible;
  els.logBox.classList.toggle("hidden", !logsVisible);
  els.btnLogs.textContent = logsVisible ? "隐藏日志" : "查看日志";
  if (logsVisible) loadLogsInto(els.logBox);
}

function toggleLogsStarting() {
  logsStartingVisible = !logsStartingVisible;
  els.logBoxStarting.classList.toggle("hidden", !logsStartingVisible);
  els.btnLogsStarting.textContent = logsStartingVisible ? "隐藏日志" : "查看日志";
  if (logsStartingVisible) loadLogsInto(els.logBoxStarting);
}

function render(status) {
  switch (status.state) {
    case "running":
      show("running");
      els.harnessFrame.src = status.url;
      break;
    case "starting":
    case "idle":
      show("starting");
      els.startingDetail.textContent = status.detail || "准备本地服务";
      break;
    case "stopped":
      show("error");
      els.harnessFrame.src = "about:blank";
      els.errorMessage.textContent =
        `服务已停止（exit ${status.code ?? "?"}）。` +
        (status.message ? `\n${status.message}` : "");
      break;
    case "error":
      show("error");
      els.harnessFrame.src = "about:blank";
      els.errorMessage.textContent = status.message || "未知错误";
      break;
    default:
      show("starting");
  }
  // The status bar only matters while the harness isn't filling the window
  // (it's a boot/error diagnostic); hide it once the iframe takes over.
  els.footer.classList.toggle("hidden", status.state === "running");
}

async function refresh() {
  try {
    const status = await invoke("get_status");
    render(status);
  } catch (err) {
    show("error");
    els.errorMessage.textContent = `无法获取状态: ${err}`;
  }
}

// ── app menu (hamburger, left of the drag region) ──────────────────────
//
// Fronts the same five actions menu.rs's tray menu already offers
// (MENU_OPEN_BROWSER/RESTART/OPEN_DATA_DIR/TOGGLE_AUTOSTART/QUIT) — those
// are otherwise only reachable via the tray icon on Windows/Linux, since
// decorations:false leaves no native menu bar for them to live in (see
// menu.rs's set_menu() macOS-only gate). trigger_menu_action forwards the
// clicked id straight to lib.rs's handle_menu_action, the same dispatcher
// the tray's own on_menu_event already calls — no action logic duplicated
// here, this is only presentation. Not wired up at all on macOS (see
// init()'s own !IS_MACOS guard below) — the native menu bar already covers
// this, and the hamburger button itself is hidden there (styles.css
// body.platform-decorated).

function isAppMenuOpen() {
  return !els.appMenu.classList.contains("hidden");
}

async function openAppMenu() {
  // Re-read on every open rather than caching: the tray's own "开机自动
  //启动" checkbox can be toggled independently of this menu (or the OS
  // setting changed outside the app entirely), so a stale cached value
  // could show a checkmark that no longer matches reality.
  let enabled = false;
  try {
    enabled = await invoke("get_autostart_enabled");
  } catch {
    /* leave unchecked rather than block opening the menu over this */
  }
  els.appMenu.querySelector(".app-menu-check").classList.toggle("hidden", !enabled);
  els.appMenu.classList.remove("hidden");
  els.btnAppMenu.setAttribute("aria-expanded", "true");
}

function closeAppMenu() {
  els.appMenu.classList.add("hidden");
  els.btnAppMenu.setAttribute("aria-expanded", "false");
}

function initAppMenu() {
  els.btnAppMenu.addEventListener("click", (event) => {
    event.stopPropagation();
    if (isAppMenuOpen()) {
      closeAppMenu();
    } else {
      openAppMenu();
    }
  });

  for (const item of els.appMenu.querySelectorAll(".app-menu-item")) {
    item.addEventListener("click", () => {
      const id = item.dataset.menuId;
      closeAppMenu();
      invoke("trigger_menu_action", { id });
    });
  }

  // Outside click / Escape — the two standard ways a dropdown expects to
  // be dismissed without acting on anything.
  document.addEventListener("click", (event) => {
    if (isAppMenuOpen() && !els.appMenu.contains(event.target)) closeAppMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isAppMenuOpen()) closeAppMenu();
  });
}

// ── window chrome (per-platform) ────────────────────────────────────────
//
// decorations:false in tauri.conf.json removes the OS title bar on every
// platform. On Windows/Linux the shell keeps that frameless look: #toolbar
// carries data-tauri-drag-region (see index.html) so its own empty space
// moves the window, and the three custom buttons below stand in for the
// native minimize/maximize/close. On macOS lib.rs re-enables the native
// title bar (real traffic lights on the left, native drag), so the custom
// replacements are hidden and the toolbar stops acting as a drag region —
// see initWindowChrome() below.
// lib.rs's on_window_event CloseRequested handler (hide-to-tray) is keyed
// off the window-close request itself, not off which button drew it — so
// appWindow.close() below re-enters that exact same Rust-side path with
// nothing to change there.

const appWindow = getCurrentWindow();

// Mirrors lib.rs's compile-time `#[cfg(target_os = "macos")]` decorations
// split. The UA is deterministic at load time, unlike querying isDecorated()
// which could race with the Rust-side set_decorations(true) during setup.
const IS_MACOS = navigator.userAgent.includes("Macintosh");

function initWindowChrome() {
  // #window-controls is hidden by default in index.html so it can never
  // paint before this decision runs — on macOS the native traffic lights
  // take over, and a cold-start frame with BOTH the native lights and the
  // custom buttons would otherwise flash. Only the frameless Windows/Linux
  // chrome reveals the custom controls.
  if (IS_MACOS) {
    // Native title bar takes over window dragging and min/max/close — the
    // custom replacements would only duplicate it (and its drag region would
    // fight the native double-click-to-zoom on the title bar).
    els.toolbar.removeAttribute("data-tauri-drag-region");
    // Left-align the remaining toolbar actions like a standard macOS toolbar
    // (see styles.css body.platform-decorated).
    document.body.classList.add("platform-decorated");
  } else {
    els.windowControls.classList.remove("hidden");
  }
}

const ICON_MAXIMIZE =
  '<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor"/></svg>';
const ICON_RESTORE =
  '<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"><rect x="3" y="0.5" width="6.5" height="6.5" fill="none" stroke="currentColor"/><rect x="0.5" y="3" width="6.5" height="6.5" fill="none" stroke="currentColor"/></svg>';

async function syncMaximizeIcon() {
  const maximized = await appWindow.isMaximized();
  els.btnWinMaximize.innerHTML = maximized ? ICON_RESTORE : ICON_MAXIMIZE;
  els.btnWinMaximize.title = maximized ? "还原" : "最大化";
}

function initWindowControls() {
  els.btnWinMinimize.addEventListener("click", () => appWindow.minimize());
  els.btnWinMaximize.addEventListener("click", () => appWindow.toggleMaximize());
  els.btnWinClose.addEventListener("click", () => appWindow.close());
  syncMaximizeIcon();
  appWindow.onResized(syncMaximizeIcon);
}

// ── init ─────────────────────────────────────────────────────────────────

// Footer state: `get_info` payload, later mutated by the async `dsh-update`
// event so the update hint appears without re-fetching everything.
let footerInfo = null;

function renderFooter() {
  if (!footerInfo) return;
  const bits = [];
  if (footerInfo.dshVersion) {
    let label = `dsh ${footerInfo.dshVersion}`;
    if (footerInfo.dshUpdate?.state === "available") {
      label += `（可更新 → ${footerInfo.dshUpdate.latest}）`;
    }
    bits.push(label);
  }
  if (footerInfo.nodePath) bits.push(`Node ${footerInfo.nodePath}`);
  if (footerInfo.dshHome) bits.push(`数据目录 ${footerInfo.dshHome}`);
  els.footer.textContent = bits.join(" · ");
}

async function init() {
  initWindowChrome();
  // macOS uses the native title bar buttons and native top menu bar; the
  // custom window controls and the in-window hamburger menu are both
  // hidden there (see styles.css body.platform-decorated) and would only
  // double up with chrome that already exists natively.
  if (!IS_MACOS) {
    initWindowControls();
    initAppMenu();
  }

  try {
    const info = await invoke("get_info");
    footerInfo = info;
    renderFooter();
  } catch {
    /* footer is cosmetic */
  }

  listen("server-status", (event) => render(event.payload));
  // Async result of the shell's one-shot update check (local dsh copy vs
  // npm latest). Only the "available" state changes what the footer shows.
  listen("dsh-update", (event) => {
    if (!footerInfo) return;
    footerInfo.dshUpdate = event.payload;
    renderFooter();
  });
  els.btnRetry.addEventListener("click", () => {
    els.btnRetry.disabled = true;
    invoke("start_server")
      .catch((err) => {
        els.errorMessage.textContent = `启动失败: ${err}`;
      })
      .finally(() => {
        els.btnRetry.disabled = false;
      });
  });
  els.btnRestart.addEventListener("click", () => {
    els.btnRestart.disabled = true;
    invoke("restart_server")
      .catch((err) => {
        els.errorMessage.textContent = `重启失败: ${err}`;
      })
      .finally(() => {
        els.btnRestart.disabled = false;
      });
  });
  els.btnLogs.addEventListener("click", toggleLogs);
  els.btnLogsStarting.addEventListener("click", toggleLogsStarting);
  els.btnOpenBrowser.addEventListener("click", () => invoke("open_in_browser"));
  initProviderTip();

  await refresh();
}

init();
