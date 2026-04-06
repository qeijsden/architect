#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::process::Command;

const STEAM_APP_ID: &str = "480";

#[cfg(target_family = "unix")]
unsafe extern "C" {
  fn getppid() -> i32;
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SteamIdentity {
  steam_id: String,
  persona_name: String,
  is_running_in_steam: bool,
}

fn steam_env_matches_app_id() -> bool {
  ["SteamAppId", "SteamGameId"]
    .iter()
    .filter_map(|key| std::env::var(key).ok())
    .any(|value| value == STEAM_APP_ID)
}

#[cfg(target_family = "unix")]
fn parent_process_looks_like_steam() -> bool {
  let parent_pid = unsafe { getppid() };

  if parent_pid <= 1 {
    return false;
  }

  Command::new("ps")
    .args(["-p", &parent_pid.to_string(), "-o", "comm="])
    .output()
    .ok()
    .and_then(|output| String::from_utf8(output.stdout).ok())
    .map(|stdout| {
      let command = stdout.trim().to_ascii_lowercase();
      command.contains("steam")
    })
    .unwrap_or(false)
}

#[cfg(not(target_family = "unix"))]
fn parent_process_looks_like_steam() -> bool {
  false
}

fn is_steam_launch_context() -> bool {
  steam_env_matches_app_id() || parent_process_looks_like_steam()
}

fn steam_env_identity() -> Option<SteamIdentity> {
  if !is_steam_launch_context() {
    return None;
  }

  let steam_id = ["SteamUser", "SteamID", "SteamAppUser"]
    .iter()
    .find_map(|key| std::env::var(key).ok())
    .filter(|v| !v.trim().is_empty())
    .unwrap_or_else(|| "steam_user".to_string());

  let persona_name = ["SteamPersonaName", "SteamAppUser", "SteamUser"]
    .iter()
    .find_map(|key| std::env::var(key).ok())
    .filter(|v| !v.trim().is_empty())
    .unwrap_or_else(|| "Steam Player".to_string());

  Some(SteamIdentity {
    steam_id,
    persona_name,
    is_running_in_steam: true,
  })
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn steam_identity() -> Option<SteamIdentity> {
  // On macOS, avoid Steam API init here to prevent null-call crashes seen in
  // Steam launch environments; rely on env/context identity instead.
  steam_env_identity()
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn steam_identity() -> Option<SteamIdentity> {
  if !is_steam_launch_context() {
    return None;
  }

  match steamworks::Client::init() {
    Ok((client, _single)) => {
      let user = client.user();

      if !user.logged_on() {
        return None;
      }

      let steam_id = user.steam_id().raw();
      if steam_id == 0 {
        return None;
      }

      let friends = client.friends();
      Some(SteamIdentity {
        steam_id: steam_id.to_string(),
        persona_name: friends.name().to_string(),
        is_running_in_steam: true,
      })
    }
    Err(_) => steam_env_identity(),
  }
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![steam_identity])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
