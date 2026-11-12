# Touch Portal Meld Studio Plugin - Change Log

## Unreleased

### New Features

- Actions
  - Chapter Marker - add a quick or named chapter marker to the current recording
  - Camera Background - toggle/enable/disable a camera layer's background blur/removal effect
    (Meld Studio 0.10.7.5+). Only camera layers that support it are listed
- States
  - Per-camera-layer Camera Background (Yes/No)
- Record Clip - maximum duration raised from 90 to 120 seconds, matching Meld Studio

### Fixes

- Quick repeated Background Effect toggles now alternate instead of repeating the first change (Meld's
  session updates lag behind writes, so a second press re-read the old value)

## v0.0.1-alpha-10

### New Features

- States
  - Per-layer Effectively Visible - `No` when the layer or any group it's in is hidden (Layer
    Visible only reflects the layer's own eye toggle)

### Fixes

- Layer Visibility, Effect Visibility, Track Monitor and Track Mute no longer crash when a dropdown
  is left on `[No Selection]` or the item was deleted in Meld Studio. Layer/Effect Visibility fall back
  to the item's own scene/layer if those dropdowns aren't set

## v0.0.1-alpha-9

### New Features

- Set Layer Property - Media Source (swap a media layer's file) and Background Effect (camera layer
  background blur/removal On/Off/Toggle, Meld Studio 0.10.7.5+)
- Set Layer Property - Text (change a text layer's text; undocumented by Meld, works on API v3)
- Layer property states for Text, Media Source and Background Effect

### Fixes

- macOS Intel (x64) release builds run again - the retired macos-13 runner was replaced with
  macos-15-intel (alpha-8 shipped without a macOS Intel package)

## v0.0.1-alpha-8

### New Features

- Actions
  - Track Volume - step a track up/down by 1/3/6 dB or 1/5/10 % of fader travel
  - Track Volume Slider / Dial (connector) - two-way, follows volume changes made in Meld Studio,
    dB-tapered like a mixer fader (-60 dB to 0 dB)
  - Transition Stepper - stage next/previous scene, show staged scene
  - Record Clip
  - Media Control - toggle/play/pause/restart media layers
  - Replay Control - show/dismiss replay, mute/cue replay audio
  - Widget Control - stopwatch/countdown stream events for widgets
  - Set Layer Property - set/increase/decrease layer X, Y, Width, Height, Rotation, or set Name,
    Image Source, Browser URL (needs Meld Studio WebChannel API v2+)
  - Toggle Virtual Camera
  - Toggle Stream / Toggle Recording - new Toggle/Start/Stop option
  - Record Clip - optional clip duration (seconds, 0 = maximum clip length)
  - Media Control - new Seek To (seconds) option
  - Take Screenshot - Horizontal/Vertical option
- States
  - Per-track Volume (gain), Volume dB and Volume % (fader position), created dynamically per track
  - Per-track Muted and Cued
  - Per-layer Visible, per-effect Enabled, per-media-layer Playing
  - Replay Clip Muted / Cued / Active
  - Next / Previous Scene Name
  - Per-layer X, Y, Width, Height, Rotation, Image Source, Browser URL (optional, see setting)
- Settings
  - Enable Debug Logging
  - Create Layer Property States

### Fixes

- Reconnects now use the configured Websocket IP instead of falling back to 127.0.0.1
- Remote Meld Studio (non-local Websocket IP) now connects directly instead of waiting for a local
  process that will never appear
- Changing the Websocket IP setting now reconnects without restarting the plugin
- Actions no longer fire multiple times after a websocket reconnect or Meld Studio restart
- Track volume observers are re-registered after a reconnect
- State updates are only sent when values change
- Debug logging only appears when Enable Debug Logging is on
- On/off settings (Enable Debug Logging, Allow Pre-Release of Plugin) never took effect - Touch Portal
  sends "On"/"Off", not "true"/"false"
- Translated action text no longer breaks `{$data-id$}` placeholders in some languages
- Number fields with a min of 0 or decimals disabled now carry those limits into entry.tp
- Release builds no longer fail when the translate service rate-limits GitHub runners - translations
  are cached in builders/translations.json

## v0.0.1-alpha-7

### New Features

- Actions
  - Take Screenshot
  - Toggle Stream
  - Toggle Recording
  - Show Scene
  - Stage Scene
  - Show Staged Scene
  - Toggle Effect
  - Toggle Layer
  - Toggle Monitor
  - Toggle Mute
- States
  - Current Scene Name / ID
  - Staged Scene Name / ID
  - Streaming / Recording
- Settings
  - Meld Studio Websocket IP
  - Allow Pre-Release of Plugin
