#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SteamIdentity {
  steam_id: String,
  persona_name: String,
  is_running_in_steam: bool,
}

#[tauri::command]
fn steam_identity() -> Option<SteamIdentity> {
  match steamworks::Client::init() {
    Ok((client, _single)) => {
      let user = client.user();
      let friends = client.friends();
      Some(SteamIdentity {
        steam_id: user.steam_id().raw().to_string(),
        persona_name: friends.name().to_string(),
        is_running_in_steam: true,
      })
    }
    Err(_) => None,
  }
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![steam_identity])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
