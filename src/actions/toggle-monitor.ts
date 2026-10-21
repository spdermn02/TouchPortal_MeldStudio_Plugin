import * as C from '../consts';
import { DEBUG_MODE, STATE_INIT_DELAY_MS } from '../consts';
import TpAction from '../touchPortal/tpAction';
import { utils } from '../meldStudio/utils';
import { stateManager } from '../utils/stateManager';

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
    // Dynamic states - created at runtime with track UUIDs
    tpStates: any = {
        'trackCued': {
            id: C.Str.IdPrefix + 'track-cued',
            desc: 'Track Cued State (per track)',
            type: 'choice',
            default: 'No',
            valueChoices: ['No', 'Yes'],
            parentGroup: 'Meld Studio | Audio',
            dynamic: true
        }
    }
    $MS: any = null;
    tp: any = null;
    trackIdx: any = {}; // has name, value, data keys
    createdStates: Set<string> = new Set(); // Track which dynamic states have been created
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
            if (DEBUG_MODE) this.tp.logIt("DEBUG", "toggle-monitor: Session changed");
            this.buildTrackIdx();
        });
    }
    updateCuedState(trackId: string, monitoring: boolean) {
        const stateId = C.Str.IdPrefix + 'track-cued-' + trackId;
        const value = monitoring ? 'Yes' : 'No';
        stateManager.updateState(stateId, value);
    }
    updateAllCuedStates() {
        const states: Array<{ id: string, value: string }> = [];
        for (const key in this.trackIdx) {
            const track = this.trackIdx[key];
            const stateId = C.Str.IdPrefix + 'track-cued-' + track.value;
            const value = track.data.monitoring ? 'Yes' : 'No';
            states.push({ id: stateId, value });
        }
        if (states.length > 0) {
            stateManager.updateStateMany(states);
        }
    }
    handleAction(message: any) {
        if (DEBUG_MODE) this.tp.logIt("DEBUG", "toggle-monitor: Handling action", JSON.stringify(message));
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
            // Create dynamic state for this track if not already created
            this.createTrackState(item.value, item.name);
        });
        this.tp.choiceUpdate(this.tpAction.data.trackList.id, this.tpAction.data.trackList.valueChoices());
        // Delay state updates to run after global STATES_READY is set
        setTimeout(() => {
            this.updateAllCuedStates();
        }, STATE_INIT_DELAY_MS + 100);
    }
    createTrackState(trackId: string, trackName: string) {
        const stateId = C.Str.IdPrefix + 'track-cued-' + trackId;
        if (!this.createdStates.has(stateId)) {
            try {
                // Remove state first to ensure clean creation
                this.tp.removeState(stateId);
            } catch (error) {
                // State may not exist yet, ignore
            }
            try {
                this.tp.createState(
                    stateId,
                    `Track Cued: ${trackName}`,
                    'No',
                    'Meld Studio | Audio'
                );
                if (DEBUG_MODE) this.tp.logIt("DEBUG", `toggle-monitor: Created dynamic state: ${stateId}`);
            } catch (error) {
                this.tp.logIt("ERROR", `toggle-monitor: Failed to create state: ${stateId}`);
            }
            this.createdStates.add(stateId);
        }
    }

}