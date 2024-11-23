import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';
import { utils } from '../meldStudio/utils';

export default class ToggleMonitor extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'toggle_monitor',
        name: "Track Monitor",
        lineFormat: ["For Track {$tp_meld_studio_track-list$}",
        "then {$tp_meld_studio_track-action$}"],
        enabled: true,
        data: {
            'trackList': {
                id: C.Str.IdPrefix + 'track-list',
                type: 'choice',
                default: '[No Selection]',
                valueChoices: () => {
                    const tracks = Object.keys(this.trackIdx).sort((a, b) => a.localeCompare(b));
                    return ['[No Selection]', ...tracks]
                }
            },
            'trackAction': {
                id: C.Str.IdPrefix + 'track-action',
                type: 'choice',
                default: 'Toggle',
                valueChoices: [
                    'Toggle',
                    'Cue',
                    'Uncue'
                ]
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
        const track = this.trackIdx[message.data[0].value];
        const action = message.data[1].value;

        if (!this.$MS?.meld?.toggleMonitor) {
            return;
        }

        // Logic here pulled from the MeldStudio StreamDeck plugin code
        // available here;  https://github.com/MeldStudio/streamdeck/blob/9e8613c9f68244f4d9304aef9f8547a79da02d80/co.meldstudio.streamdeck.sdPlugin/actions/toggle-monitor/plugin.js#L21
        if (action.toLowerCase() == 'toggle') {
            this.$MS.meld.toggleMonitor(track.value);
        }
        else {
            const action_monitor = action.toLowerCase() === 'cue' ? 1 : 0;
            const state_monitor = track.data.monitoring ? 1 : 0;

            const monitor = action_monitor ^ state_monitor;
            if (monitor) {
                this.$MS.meld.toggleMonitor(track.value);
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