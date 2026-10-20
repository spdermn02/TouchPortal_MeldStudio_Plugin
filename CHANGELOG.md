# Touch Portal Meld Studio Plugin - Change Log

## v0.0.1-alpha-8

### New Features

- Actions
  - Track Volume - step a track up/down by 1/3/6 dB or 1/5/10 %
  - Track Volume Slider (connector)
  - Transition Stepper - stage next/previous scene, show staged scene
  - Record Clip
  - Media Control - toggle/play/pause/restart media layers
  - Replay Control - show/dismiss replay, mute/cue replay audio
  - Widget Control - stopwatch/countdown stream events for widgets
- States
  - Per-track Volume, Volume dB and Volume % (created dynamically per track)
  - Per-track Muted and Cued
  - Per-layer Visible, per-effect Enabled, per-media-layer Playing
  - Replay Clip Muted / Cued / Active
  - Next / Previous Scene Name
- Settings
  - Enable Debug Logging

### Fixes

- Reconnects now use the configured Websocket IP instead of falling back to 127.0.0.1
- Remote Meld Studio (non-local Websocket IP) now connects directly instead of waiting for a local
  process that will never appear
- Changing the Websocket IP setting now reconnects without restarting the plugin
- Actions no longer fire multiple times after a websocket reconnect or Meld Studio restart
- Track volume observers are re-registered after a reconnect
- State updates are only sent when values change
- Debug logging only appears when Enable Debug Logging is on

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
