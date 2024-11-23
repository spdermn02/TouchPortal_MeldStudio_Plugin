import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';
import { utils } from '../meldStudio/utils';

export default class ToggleMute extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'toggle_mute',
        name: "Track Mute",
        lineFormat: "{$tp_meld_studio_mute-track-action$} track {$tp_meld_studio_mute-track-list$}",
        enabled: true,
        data: {
            'muteAction': {
                id: C.Str.IdPrefix + 'mute-track-action',
                type: 'choice',
                default: 'Toggle',
                valueChoices: [
                    'Toggle',
                    'Mute',
                    'Unmute'
                ]
            },
            'trackList': {
                id: C.Str.IdPrefix + 'mute-track-list',
                type: 'choice',
                default: '[No Selection]',
                valueChoices: () => {
                    const tracks = Object.keys(this.trackIdx).sort((a, b) => a.localeCompare(b));
                    return ['[No Selection]', ...tracks]
                }
            }
        }
    }
    $MS: any = null;
    tp: any = null;
    trackIdx: any = {}; // has name, value, data keys
    constructor($MS: any, TPClient: any) {
        super();
        this.$MS = $MS;
        this.tp = TPClient;
        this.initialize();
    }
    initialize() {
        this.tp.on('Action', (message: any) => {
            if (message.actionId == this.getTpActionId()) {
                this.handleAction(message);
            }
        });
        this.$MS.on('sessionChanged', () => {
            this.tp.logIt("DEBUG", "Something changed in the session");
            this.buildTrackIdx();
        });
    }
    handleAction(message: any) {
        this.tp.logIt("DEBUG", "Handling action", JSON.stringify(message));
        const action = message.data[0].value;
        const track = this.trackIdx[message.data[1].value];
        
        if (!this.$MS?.meld?.toggleMute) {
            return;
        }

        // Logic here pulled from the MeldStudio StreamDeck plugin code
        // available here;  https://github.com/MeldStudio/streamdeck/blob/9e8613c9f68244f4d9304aef9f8547a79da02d80/co.meldstudio.streamdeck.sdPlugin/actions/toggle-mute/plugin.js#L22
        if (action.toLowerCase() == 'toggle') {
            this.$MS.meld.toggleMute(track.value);
        }
        else {
            const action_mute = action.toLowerCase() === 'mute' ? 1 : 0;
            const state_mute = track.data.muted ? 1 : 0;

            const show = action_mute ^ state_mute;
            if (show) {
                this.$MS.meld.toggleMute(track.value);
            }
        }
    }
    buildTrackIdx() {
        this.trackIdx = {};
        utils.getItemsByType(this.$MS, 'track', null).forEach((item: any) => {
            const key = item.name + ' - ' + item.value;
            this.trackIdx[key] = item;
        });
        this.tp.choiceUpdate(this.tpAction.data.trackList.id, this.tpAction.data.trackList.valueChoices());
    }

}