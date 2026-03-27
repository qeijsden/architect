fn main() {
  let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();

  if target_os == "macos" {
    println!("cargo:rustc-link-search=native=steamworks/osx");
    println!("cargo:rustc-link-lib=dylib=steam_api");
  } else if target_os == "windows" {
    println!("cargo:rustc-link-search=native=steamworks/win64");
    println!("cargo:rustc-link-lib=dylib=steam_api64");
  }

  tauri_build::build()
}
