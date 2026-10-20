# TouchPortal MeldStudio Plugin
Plugin for Touch Portal to control Meld Studio

- [TouchPortal MeldStudio Plugin](#touchportal-meldstudio-plugin)
- [What Is This?](#what-is-this)
- [TO DO](#to-do)
- [Change Log](#change-log)
- [Documentation](#documentation)
- [Remote Meld Studio](#remote-meld-studio)
- [Volume Slider / Dial](#volume-slider--dial)
- [Layer Properties](#layer-properties)
- [Building](#building)
- [Development Dependencies](#development-dependencies)
- [Versioning](#versioning)
- [Authors](#authors)
- [License](#license)
- [Bugs/Enhancements](#bugsenhancements)
- [Acknowledgements](#acknowledgements)

# What Is This?

Meld Studio is a newer live streaming platform, so this plugin will allow "remote" control access to Meld Studio.

# TO DO
- [X] Take Screenshot Action
- [X] Show Scene Action
- [X] Current Scene State Values
- [X] Toggle Record Action
- [X] Toggle Stream Action
- [X] Toggle Effect Action
- [X] Toggle Layer Action
- [X] Toggle Monitor Action
- [X] Toggle Mute Action
- [X] Set Staged Scene Action 
- [X] Staged Scene State Values 
- [X] Show Staged Scene 
- [X] Volume Stepper Action
- [X] Volume Slider
- [X] Transition Stepper Action
- [X] Record Clip Action
- [X] Media Control Action
- [X] Replay Control Action
- [X] Widget Control Action
- [X] Set Layer Property Action
- [X] Toggle Virtual Camera Action
- [X] Start/Stop Stream & Record
- [X] Media Seek
- [X] Vertical Screenshot

- [X] Effect Visible/Hidden State Values
- [X] Layer Visible/Hidden State Values
- [X] Track Cued/Un-cued State Values
- [X] Track Un-muted/Muted State Values
- [X] Track Volume State Values
- [X] Layer Property State Values (optional)
- [X] Remote Meld Studio connection (non-local Websocket IP)

# Change Log

See [CHANGELOG.md](CHANGELOG.md)

# Documentation

See the **[Full Documentation](https://github.com/spdermn02/TouchPortal_MeldStudio_Plugin/wiki/Documentation)** in the wiki.

# Remote Meld Studio

Set the **Meld Studio Websocket IP** setting to the machine running Meld Studio. If the IP is local, the plugin
waits for the Meld Studio process to start. If it's remote, the plugin connects directly and retries every 10
seconds until Meld Studio is reachable. Changing the setting reconnects immediately.

Meld Studio's websocket (port `13376`) is unencrypted and unauthenticated, so only use remote mode on a trusted network.

# Volume Slider / Dial

The **Track Volume Slider** connector works on sliders and dials, and follows volume changes made in Meld Studio.

| Position | Volume |
|---|---|
| 100 | 0 dB |
| 90 | -6 dB |
| 50 | -30 dB |
| 1 | -59.4 dB |
| 0 | Silent |

Position maps linearly to dB from -60 dB to 0 dB, so it moves like a mixer fader. The `Track Volume %` state and
the `%` stepper sizes use the same fader position. **Set dials to a 0-100 range** - Touch Portal doesn't tell the
plugin a dial's configured range, and values outside 0-100 are clamped.

# Layer Properties

**Set Layer Property** changes a layer's X, Y, Width, Height, Rotation, Name, Image Source or Browser URL.
Numeric properties support Set, Increase and Decrease. Image Source accepts a plain file path or a URL. It
needs Meld Studio WebChannel API v2 or newer; on older versions the action logs a warning and does nothing.

Turn on **Create Layer Property States** to get a state per layer property (grouped under
`Meld Studio | Layer Properties`). It's off by default because it adds 5-6 states per layer: X, Y, Width,
Height, Rotation, plus Image Source or Browser URL when the layer has one.

# Building

Requires Node.js 20.

```sh
npm install
npm run build-entry          # compile TypeScript and generate base/entry.tp
npm run build-windows-x64    # or build-mac-arm64, build-mac-x64, build-windows-arm64
```

Packages are written to `Installers/` as `.tpp` files. `build-entry` machine-translates action text, so it needs
network access. Set `DEBUG_MODE=true` (or turn on the **Enable Debug Logging** setting) for verbose logs.

Release builds run in GitHub Actions when a release is published.

# Development Dependencies
(These are included in the plugin's official releases.)

1. [qwebchannel](https://www.npmjs.com/package/qwebchannel)
2. [touchportal-api](https://www.npmjs.com/package/touchportal-api)
3. [ws](https://www.npmjs.com/package/ws)

# Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the Releases section

# Authors

- **Jameson Allen** - _Initial work_ - [Spdermn02](https://github.com/spdermn02)

# License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

# Bugs/Enhancements
Use the Github Issues tab to report any bugs/enhancements for this plug-in. Or mention them in the Official Touch Portal discord channel #meld-studio

# Acknowledgements
1. Thank you to Reinier and Ty, the Touch Portal Creators
2. Thank you [Meld Studio](https://www.streamwithmeld.com/) for the support and [documentation](https://github.com/MeldStudio/streamdeck/blob/main/WebChannelAPI.md) and the open sourcing of the [Meld Studio StreamDeck Plugin](https://github.com/MeldStudio/streamdeck)