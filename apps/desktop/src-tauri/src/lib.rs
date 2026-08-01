use std::io::Write;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

struct HostState {
    process: Mutex<Option<Child>>,
    keep_running: Mutex<bool>,
}

#[cfg(target_os = "windows")]
fn spawn_host() -> Result<Child, String> {
    Command::new("kiddy-land-server.exe").stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::null()).spawn().map_err(|e| e.to_string())
}

#[cfg(not(target_os = "windows"))]
fn spawn_host() -> Result<Child, String> {
    Command::new("bun").args(["run", "--cwd", "../../packages/server", "start"]).stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::null()).spawn().map_err(|e| e.to_string())
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
fn host_running(state: tauri::State<'_, HostState>) -> Result<bool, String> {
    let mut process = state.process.lock().map_err(|_| "Host state unavailable")?;
    match process.as_mut() { Some(child) => Ok(child.try_wait().map_err(|e| e.to_string())?.is_none()), None => Ok(false) }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let process = spawn_host().expect("could not start Local Server host");
    tauri::Builder::default()
        .manage(HostState { process: Mutex::new(Some(process)), keep_running: Mutex::new(true) })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![stop_host, host_running])
        .setup(|app| { if let Some(window) = app.get_webview_window("main") { let _ = window.set_title("Kiddy Land — Local Operation Center"); } Ok(()) })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .build(tauri::generate_context!()).expect("error while building tauri application")
        .run(|app, event| { if let tauri::RunEvent::ExitRequested { .. } = event { if let Some(state) = app.try_state::<HostState>() { if let Ok(mut process) = state.process.lock() { if let Some(mut child) = process.take() { let _ = child.kill(); } } } } });
}
