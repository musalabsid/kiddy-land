use std::io::Write;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

struct HostState {
    process: Mutex<Option<Child>>,
    keep_running: Mutex<bool>,
    data_dir: Mutex<Option<String>>,
}

fn resolve_sidecar_path() -> Option<std::path::PathBuf> {
    // Tauri bundles externalBin as sidecar next to exe (Windows) or in ../lib (Linux)
    // Try: exe_dir/kiddy-land-server(.exe), exe_dir/../lib/desktop/kiddy-land-server, resources
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let candidates = [
                dir.join(if cfg!(windows) { "kiddy-land-server.exe" } else { "kiddy-land-server" }),
                dir.join("binaries").join(if cfg!(windows) { "kiddy-land-server.exe" } else { "kiddy-land-server" }),
                dir.join("../lib/desktop/kiddy-land-server"),
                dir.join("../../binaries/kiddy-land-server"),
            ];
            for c in candidates { if c.exists() { return Some(c); } }
        }
    }
    // dev fallback: binaries folder with triple suffix (Tauri dev)
    let dev = std::path::Path::new("binaries/kiddy-land-server").to_path_buf();
    if dev.exists() { return Some(dev); }
    let dev_exe = std::path::Path::new("binaries/kiddy-land-server.exe").to_path_buf();
    if dev_exe.exists() { return Some(dev_exe); }
    None
}

fn web_dist_from_resources() -> Option<String> {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            // Tauri bundles resources next to the binary (Windows) or in ../lib/<app>/resources (Linux)
            let cands = vec![
                dir.join("web-dist"),
                dir.join("resources/web-dist"),
                dir.join("../lib/desktop/web-dist"),
                dir.join("../lib/kiddy-land/web-dist"),
                dir.join("../lib/Kiddy Land/web-dist"),
                dir.join("../resources/web-dist"),
                dir.join("web/dist"),
                std::path::Path::new("../../../apps/web/dist").to_path_buf(),
                std::path::Path::new("../../apps/web/dist").to_path_buf(),
            ];
            for c in &cands {
                if c.join("index.html").exists() {
                    return Some(c.to_string_lossy().to_string());
                }
            }
        }
    }
    None
}

fn spawn_host(data_dir: Option<&str>) -> Result<Child, String> {
    // In release/sidecar mode, prefer bundled binary; fallback to `bun run` for dev
    if !cfg!(debug_assertions) {
        if let Some(bin) = resolve_sidecar_path() {
            let web_dist = web_dist_from_resources();
            let mut cmd = Command::new(bin);
            cmd.stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::null()).env("KIDDY_LAND_HTTPS", "1").env("KIDDY_LAND_HOST", "0.0.0.0");
            if let Some(wd) = web_dist { cmd.env("KIDDY_LAND_WEB_DIST", wd); }
            if let Some(dd) = data_dir { cmd.env("KIDDY_LAND_DATA_DIR", dd); }
            if let Ok(c) = cmd.spawn() { return Ok(c); }
        }
    }
    // Dev fallback: requires bun + source tree (cargo tauri dev)
    let mut dev = Command::new("bun");
    dev.args(["run", "--cwd", "../../packages/server", "start"]).env("KIDDY_LAND_HTTPS", "1").env("KIDDY_LAND_HOST", "0.0.0.0");
    if let Some(dd) = data_dir { dev.env("KIDDY_LAND_DATA_DIR", dd); }
    dev.stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::null()).spawn().map_err(|e| e.to_string())
}

#[tauri::command]
fn stop_host(state: tauri::State<'_, HostState>) -> Result<(), String> {
    let mut process = state.process.lock().map_err(|_| "Host state unavailable")?;
    if let Some(mut child) = process.take() {
        if let Some(mut stdin) = child.stdin.take() { let _ = stdin.write_all(b"stop\n"); }
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(5);
        loop {
            match child.try_wait() { Ok(Some(_)) => break, Ok(None) if std::time::Instant::now() < deadline => std::thread::sleep(std::time::Duration::from_millis(50)), _ => { let _ = child.kill(); let _ = child.wait(); break; } }
        }
    }
    *state.keep_running.lock().map_err(|_| "Host state unavailable")? = false;
    Ok(())
}

#[tauri::command]
fn start_host(state: tauri::State<'_, HostState>) -> Result<(), String> {
    let mut process = state.process.lock().map_err(|_| "Host state unavailable")?;
    if let Some(child) = process.as_mut() {
        if child.try_wait().map_err(|e| e.to_string())?.is_none() { return Ok(()); }
    }
    let data_dir = state.data_dir.lock().map_err(|e| e.to_string())?.clone();
    let child = spawn_host(data_dir.as_deref())?;
    *process = Some(child);
    *state.keep_running.lock().map_err(|_| "Host state unavailable")? = true;
    Ok(())
}

#[tauri::command]
fn host_running(state: tauri::State<'_, HostState>) -> Result<bool, String> {
    let mut process = state.process.lock().map_err(|_| "Host state unavailable")?;
    match process.as_mut() { Some(child) => Ok(child.try_wait().map_err(|e| e.to_string())?.is_none()), None => Ok(false) }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(HostState { process: Mutex::new(None), keep_running: Mutex::new(true), data_dir: Mutex::new(None) })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![stop_host, start_host, host_running])
        .setup(|app| {
            let data_dir = app.path().app_data_dir().ok().map(|d| d.to_string_lossy().to_string());
            let child = spawn_host(data_dir.as_deref()).expect("could not start Local Server host");
            let state = app.state::<HostState>();
            *state.process.lock().map_err(|e| e.to_string())? = Some(child);
            *state.data_dir.lock().map_err(|e| e.to_string())? = data_dir;
            if let Some(window) = app.get_webview_window("main") { let _ = window.set_title("Kiddy Land — Local Operation Center"); }
            Ok(())
        })
        .on_window_event(|window, event| {
            // X = quit: kill sidecar server so the app fully exits
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.app_handle().exit(0);
            }
        })
        .build(tauri::generate_context!()).expect("error while building tauri application")
        .run(|app, event| { if let tauri::RunEvent::ExitRequested { .. } = event { if let Some(state) = app.try_state::<HostState>() { if let Ok(mut process) = state.process.lock() { if let Some(mut child) = process.take() { let _ = child.kill(); } } } } });
}
