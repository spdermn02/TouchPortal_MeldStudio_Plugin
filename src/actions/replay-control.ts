import * as C from '../consts';
import { DEBUG_MODE, STATE_INIT_DELAY_MS } from '../consts';
import TpAction from '../touchPortal/tpAction';
import { utils } from '../meldStudio/utils';
import { clampGain } from '../utils/audio';
import { stateManager } from '../utils/stateManager';

export default class ReplayControl extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'replay-control',
        name: "Replay Control",
        lineFormat: "Replay: {$tp_meld_studio_replay-action$}",
        enabled: true,
        data: {
            'replayAction': {
                id: C.Str.IdPrefix + 'replay-action',
                type: 'choice',
                default: 'Show Replay',
                valueChoices: [
                    'Show Replay',
                    'Dismiss Replay',
                    'Toggle Mute',
                    'Mute',
                    'Unmute',
                    'Toggle Cue',
                    'Cue',
                    'Uncue',
                    'Volume Up',
                    'Volume Down'
                ]
            }
        }
    }
    // States for replay clip
    tpStates: any = {
        'replayMuted': {
            id: C.Str.IdPrefix + 'replay-muted',
            desc: 'Replay Clip Muted',
            type: 'choice',
            default: 'No',
            valueChoices: ['No', 'Yes'],
            parentGroup: 'Replay'
        },
        'replayCued': {
            id: C.Str.IdPrefix + 'replay-cued',
            desc: 'Replay Clip Cued',
            type: 'choice',
            default: 'No',
            valueChoices: ['No', 'Yes'],
            parentGroup: 'Replay'
        },
        'replayActive': {
            id: C.Str.IdPrefix + 'replay-active',
            desc: 'Replay Clip Active',
            type: 'choice',
            default: 'No',
            valueChoices: ['No', 'Yes'],
            parentGroup: 'Replay'
        }
    }
    $MS: any = null;
    tp: any = null;
    replayTrackId: string | null = null;
    replayGain: number = 1;
    replayMuted: boolean = false;
    replayCued: boolean = false;
    replayActive: boolean = false;
    volumeStep: number = 0.1; // 10% step for volume up/down
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
            if (DEBUG_MODE) this.tp.logIt("DEBUG", "replay-control: Session changed");
            this.findReplayTrack();
        });
        // Listen for gain updates to track replay volume/mute state
        this.$MS.on('gainUpdated', ({ trackId, gain, muted }: { trackId: string, gain: number, muted: boolean }) => {
            if (trackId === this.replayTrackId) {
                this.replayGain = gain;
                this.replayMuted = muted;
                this.updateMutedState(muted);
            }
        });
    }
    findReplayTrack() {
        this.replayTrackId = null;
        const tracks = utils.getItemsByType(this.$MS, 'track', null);
        for (const track of tracks) {
            // Look for the "Replay Clip" track by name
            if (track.name.toLowerCase() === 'replay clip' ||
                track.name.toLowerCase().includes('replay')) {
                this.replayTrackId = track.value;
                this.replayMuted = track.data.muted ?? false;
                this.replayCued = track.data.monitoring ?? false;
                if (track.data.gain !== undefined) {
                    this.replayGain = track.data.gain;
                }
                if (DEBUG_MODE) this.tp.logIt("DEBUG", `replay-control: Found replay track: ${track.name} (${this.replayTrackId})`);
                break;
            }
        }
        // Delay state updates to run after global STATES_READY is set
        setTimeout(() => {
            this.updateAllStates();
        }, STATE_INIT_DELAY_MS + 100);
    }
    handleAction(message: any) {
        const action = message.data[0].value;
        if (DEBUG_MODE) this.tp.logIt("DEBUG", `replay-control: Action ${action}`);

        switch (action) {
            case 'Show Replay':
                this.showReplay();
                break;
            case 'Dismiss Replay':
                this.dismissReplay();
                break;
            case 'Toggle Mute':
                this.toggleMute();
                break;
            case 'Mute':
                this.setMuted(true);
                break;
            case 'Unmute':
                this.setMuted(false);
                break;
            case 'Toggle Cue':
                this.toggleCue();
                break;
            case 'Cue':
                this.setCued(true);
                break;
            case 'Uncue':
                this.setCued(false);
                break;
            case 'Volume Up':
                this.volumeUp();
                break;
            case 'Volume Down':
                this.volumeDown();
                break;
        }
    }
    showReplay() {
        if (this.$MS?.meld?.sendCommand) {
            this.$MS.meld.sendCommand("meld.replay.show");
            this.replayActive = true;
            this.updateActiveState(true);
        }
    }
    dismissReplay() {
        if (this.$MS?.meld?.sendCommand) {
            this.$MS.meld.sendCommand("meld.replay.dismiss");
            this.replayActive = false;
            this.updateActiveState(false);
        }
    }
    toggleMute() {
        if (!this.replayTrackId) return;
        if (this.$MS?.meld?.toggleMute) {
            this.$MS.meld.toggleMute(this.replayTrackId);
        }
    }
    setMuted(muted: boolean) {
        if (!this.replayTrackId) return;
        // Only toggle if current state differs from desired state
        if (this.replayMuted !== muted) {
            if (this.$MS?.meld?.toggleMute) {
                this.$MS.meld.toggleMute(this.replayTrackId);
            } else if (this.$MS?.meld?.setProperty) {
                this.$MS.meld.setProperty(this.replayTrackId, 'muted', muted);
            }
        }
    }
    toggleCue() {
        if (!this.replayTrackId) return;
        if (this.$MS?.meld?.toggleMonitor) {
            this.$MS.meld.toggleMonitor(this.replayTrackId);
            this.replayCued = !this.replayCued;
            this.updateCuedState(this.replayCued);
        }
    }
    setCued(cued: boolean) {
        if (!this.replayTrackId) return;
        // Only toggle if current state differs from desired state
        if (this.replayCued !== cued) {
            if (this.$MS?.meld?.toggleMonitor) {
                this.$MS.meld.toggleMonitor(this.replayTrackId);
                this.replayCued = cued;
                this.updateCuedState(cued);
            } else if (this.$MS?.meld?.setProperty) {
                this.$MS.meld.setProperty(this.replayTrackId, 'monitoring', cued);
                this.replayCued = cued;
                this.updateCuedState(cued);
            }
        }
    }
    volumeUp() {
        if (!this.replayTrackId || !this.$MS?.meld?.setGain) return;
        const newGain = clampGain(this.replayGain + this.volumeStep);
        this.$MS.meld.setGain(this.replayTrackId, newGain);
        this.replayGain = newGain;
    }
    volumeDown() {
        if (!this.replayTrackId || !this.$MS?.meld?.setGain) return;
        const newGain = clampGain(this.replayGain - this.volumeStep);
        this.$MS.meld.setGain(this.replayTrackId, newGain);
        this.replayGain = newGain;
    }
    updateMutedState(muted: boolean) {
        const stateId = this.tpStates.replayMuted.id;
        const value = muted ? 'Yes' : 'No';
        stateManager.updateState(stateId, value);
    }
    updateCuedState(cued: boolean) {
        const stateId = this.tpStates.replayCued.id;
        const value = cued ? 'Yes' : 'No';
        stateManager.updateState(stateId, value);
    }
    updateActiveState(active: boolean) {
        const stateId = this.tpStates.replayActive.id;
        const value = active ? 'Yes' : 'No';
        stateManager.updateState(stateId, value);
    }
    updateAllStates() {
        const states = [
            { id: this.tpStates.replayMuted.id, value: this.replayMuted ? 'Yes' : 'No' },
            { id: this.tpStates.replayCued.id, value: this.replayCued ? 'Yes' : 'No' },
            { id: this.tpStates.replayActive.id, value: this.replayActive ? 'Yes' : 'No' }
        ];
        stateManager.updateStateMany(states);
    }
}
