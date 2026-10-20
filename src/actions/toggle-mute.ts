import * as C from '../consts';
import { DEBUG_MODE, STATE_INIT_DELAY_MS } from '../consts';
import TpAction from '../touchPortal/tpAction';
import { utils } from '../meldStudio/utils';
import { stateManager } from '../utils/stateManager';

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
    // Dynamic states - created at runtime with track UUIDs
    tpStates: any = {
        'trackMuted': {
            id: C.Str.IdPrefix + 'track-muted',
            desc: 'Track Muted State (per track)',
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
            if (DEBUG_MODE) this.tp.logIt("DEBUG", "toggle-mute: Session changed");
            this.buildTrackIdx();
        });
        // Listen for real-time mute updates from MeldStudio
        this.$MS.on('gainUpdated', ({ trackId, muted }: { trackId: string, gain: number, muted: boolean }) => {
            // stateManager checks STATES_READY internally
            this.updateMutedState(trackId, muted);
        });
    }
    updateMutedState(trackId: string, muted: boolean) {
        const stateId = C.Str.IdPrefix + 'track-muted-' + trackId;
        const value = muted ? 'Yes' : 'No';
        stateManager.updateState(stateId, value);
    }
    updateAllMutedStates() {
        const states: Array<{ id: string, value: string }> = [];
        for (const key in this.trackIdx) {
            const track = this.trackIdx[key];
            const stateId = C.Str.IdPrefix + 'track-muted-' + track.value;
            const value = track.data.muted ? 'Yes' : 'No';
            states.push({ id: stateId, value });
        }
        if (states.length > 0) {
            stateManager.updateStateMany(states);
        }
    }
    handleAction(message: any) {
        if (DEBUG_MODE) this.tp.logIt("DEBUG", "toggle-mute: Handling action", JSON.stringify(message));
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
        if (DEBUG_MODE) this.tp.logIt("DEBUG", "toggle-mute: buildTrackIdx called");
        this.trackIdx = {};
        const tracks = utils.getItemsByType(this.$MS, 'track', null);
        if (DEBUG_MODE) this.tp.logIt("DEBUG", `toggle-mute: Found ${tracks.length} tracks`);
        tracks.forEach((item: any) => {
            const key = item.name + ' - ' + item.value;
            this.trackIdx[key] = item;
            // Create dynamic state for this track if not already created
            this.createTrackState(item.value, item.name);
        });
        this.tp.choiceUpdate(this.tpAction.data.trackList.id, this.tpAction.data.trackList.valueChoices());
        // Delay state updates to run after global STATES_READY is set
        setTimeout(() => {
            this.updateAllMutedStates();
        }, STATE_INIT_DELAY_MS + 100);
    }
    createTrackState(trackId: string, trackName: string) {
        const stateId = C.Str.IdPrefix + 'track-muted-' + trackId;
        if (DEBUG_MODE) this.tp.logIt("DEBUG", `toggle-mute: Attempting to create state: ${stateId}`);
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
                    `Track Muted: ${trackName}`,
                    'No',
                    'Meld Studio | Audio'
                );
                if (DEBUG_MODE) this.tp.logIt("DEBUG", `toggle-mute: Successfully created state: ${stateId}`);
            } catch (error) {
                this.tp.logIt("ERROR", `toggle-mute: Failed to create state ${stateId}: ${error}`);
            }
            this.createdStates.add(stateId);
        } else {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", `toggle-mute: State already exists in cache: ${stateId}`);
        }
    }

}