# Changelog

All notable changes to Architect will be documented in this file.

## [Unreleased]

### Added
- Leaderboard view toggle for friends vs world

### Changed
- Block palette previews now render BLOX texture pack sprites when available
- Removed grid opacity option from settings

### Fixed
- Profile page no longer renders empty during auth redirect

## [0.5.3] - 2026-02-25

### Added
- BLOX Pixel Editor: New texture creation tool with pixel-by-pixel drawing canvas
- Steam Overlay Integration: Added useSteamOverlay hook for Steam runtime detection and overlay control
- Per-Level Texture Packs: Texture pack system with automatic application when playing levels
- Support for 22 block types in texture customization
- Texture pack export/import as .blox JSON files
- BLOX Editor button in level editor toolbar with Palette icon

### Changed
- Enhanced GameCanvas rendering to support custom pixel textures
- Improved texture rendering performance with conditional block rendering
- Updated Editor.tsx with texture pack state management and apply workflow

### Technical
- Extended game type system with TexturePack and PixelData interfaces
- Added renderBlockTexture() function for pixel art rendering
- Implemented texture pack navigation flow (Editor -> BLOX Editor -> Editor)

## [0.5.2] - 2026-02-20

### Added
- Friend system integration in leaderboards with star indicator
- Settings page with performance options
- Grid opacity: Adjustable visual density
- Render distance: Performance scaling option
- Particle effects toggle: Optional visual effects control

### Changed
- Removed multiplayer option from leaderboards
- Removed multiplayer from level cards and browse UI
- Settings page with auto-save (debounced 1 second)

### Fixed
- Improved performance with performance settings options
- Better visual consistency in editor and gameplay

## [0.5.1] - 2026-02-15

### Added
- Coyote jump mechanic: 6-frame grace period after leaving ground
- Laser barriers at world edges with red dashed lines and glow effect
- Level editability: Players can now edit their own published levels
- Adjustable camera speed: 0.01-0.3 range with UI slider control
- Bigger editor canvas: Increased from 1440x720 to 1920x1080

### Changed
- Enhanced level editor interface for larger workspace
- Improved camera controls for better gameplay experience

### Fixed
- Resolved edge-case jumping mechanics with coyote time
- Improved visual feedback for level boundaries
