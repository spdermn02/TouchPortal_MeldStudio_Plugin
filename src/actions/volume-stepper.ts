import * as C from '../consts';
import { DEBUG_MODE, STATE_INIT_DELAY_MS } from '../consts';
import TpAction from '../touchPortal/tpAction';
import { utils } from '../meldStudio/utils';
import { toDb, toGain, clampGain } from '../utils/audio';
import { stateManager } from '../utils/stateManager';

export default class VolumeStepper extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'volume-stepper',
        name: "Track Volume",
        lineFormat: ["Volume {$tp_meld_studio_volume-direction$} for {$tp_meld_studio_volume-track-list$}",
            "by {$tp_meld_studio_volume-step-size$}"],
        enabled: true,
        data: {
            'trackList': {
                id: C.Str.IdPrefix + 'volume-track-list',
                type: 'choice',
                default: '[No Selection]',
                valueChoices: () => {
                    const tracks = Object.keys(this.trackIdx).sort((a, b) => a.localeCompare(b));
                    return ['[No Selection]', ...tracks]
                }
            },
            'direction': {
                id: C.Str.IdPrefix + 'volume-direction',
                type: 'choice',
                default: 'Up',
                valueChoices: [
                    'Up',
                    'Down'
                ]
            },
            'stepSize': {
                id: C.Str.IdPrefix + 'volume-step-size',
                type: 'choice',
                default: '3dB',
                valueChoices: [
                    '1dB',
                    '3dB',
                    '6dB',
                    '1%',
                    '5%',
                    '10%'
                ]
            }
        }
    }
    // Connector definition for slider/dial control
    tpConnector: any = {
        id: C.Str.IdPrefix + 'volume-connector',
        name: 'Track Volume Slider',
        format: 'Volume for {$' + C.Str.IdPrefix + 'volume-connector-track$}',
        supportedTypes: ['slider', 'dial'],
        data: {
            'track': {
                id: C.Str.IdPrefix + 'volume-connector-track',
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
        'trackVolume': {
            id: C.Str.IdPrefix + 'track-volume',
            desc: 'Track Volume (per track, 0.000-1.000)',
            type: 'text',
            default: '0.000',
            parentGroup: 'Meld Studio | Audio',
            dynamic: true
        },
        'trackVolumeDb': {
            id: C.Str.IdPrefix + 'track-volume-db',
            desc: 'Track Volume dB (per track)',
            type: 'text',
            default: '-inf',
            parentGroup: 'Meld Studio | Audio',
            dynamic: true
        },
        'trackVolumePercent': {
            id: C.Str.IdPrefix + 'track-volume-percent',
            desc: 'Track Volume % (per track)',
            type: 'text',
            default: '0',
            parentGroup: 'Meld Studio | Audio',
            dynamic: true
        }
    }
    $MS: any = null;
    tp: any = null;
    trackIdx: any = {}; // has name, value, data keys
    trackGains: any = {}; // trackId -> gain value for caching
    createdStates: Set<string> = new Set(); // Track which dynamic states have been created
    registeredObservers: Set<string> = new Set(); // Track which track observers have been registered
    pendingUpdates: Map<string, NodeJS.Timeout> = new Map(); // Debounce timers per track
    static OBSERVER_CONTEXT: string = 'touchportal-volume';
    static DEBOUNCE_MS: number = 200; // Debounce delay for slider updates
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
        this.tp.on('ConnectorChange', (message: any) => {
            if (message.connectorId == this.tpConnector.id) {
                this.handleConnectorChange(message);
            }
        });
        this.$MS.on('sessionChanged', () => {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", "Volume stepper: Session changed");
            this.buildTrackIdx();
        });
        // Listen for real-time gain updates from MeldStudio
        this.$MS.on('gainUpdated', ({ trackId, gain, muted }: { trackId: string, gain: number, muted: boolean }) => {
            this.handleGainUpdate(trackId, gain, muted);
        });
        // Observers are bound to the socket, so a reconnect needs them registered again
        this.$MS.on('closed', () => {
            this.registeredObservers.clear();
        });
    }
    handleAction(message: any) {
        if (DEBUG_MODE) this.tp.logIt("DEBUG", "Volume stepper: Handling action", JSON.stringify(message));
        const track = this.trackIdx[message.data[0].value];
        const direction = message.data[1].value;
        const stepSize = message.data[2].value;

        if (!track || !this.$MS?.meld?.setGain) {
            return;
        }

        const trackId = track.value;
        const currentGain = this.trackGains[trackId] ?? track.data.gain ?? 1.0;
        let newGain: number;

        // Parse step size and apply direction
        if (stepSize.endsWith('dB')) {
            const dBStep = parseInt(stepSize.replace('dB', ''), 10);
            const currentDb = toDb(currentGain);
            const newDb = direction === 'Up' ? currentDb + dBStep : currentDb - dBStep;
            newGain = toGain(newDb);
        } else {
            // Percentage step
            const percentStep = parseInt(stepSize.replace('%', ''), 10) / 100;
            newGain = direction === 'Up' ? currentGain + percentStep : currentGain - percentStep;
        }

        newGain = clampGain(newGain);
        this.$MS.meld.setGain(trackId, newGain);
    }
    handleConnectorChange(message: any) {
        const trackKey = message.data?.[0]?.value;
        const track = this.trackIdx[trackKey];
        if (!track || !this.$MS?.meld?.setGain) {
            return;
        }

        // Connector value is 0-100, convert to 0.0-1.0 gain
        let newVol = parseInt(message.value, 10);
        newVol = Math.max(0, Math.min(100, newVol));
        const newGain = newVol / 100;

        this.$MS.meld.setGain(track.value, newGain);
    }
    handleGainUpdate(trackId: string, gain: number, _muted: boolean) {
        // Cache the gain value immediately (even if states aren't ready)
        this.trackGains[trackId] = gain;

        // Cancel any pending update for this track
        const existingTimer = this.pendingUpdates.get(trackId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Debounce: only send update after slider stops moving
        const timer = setTimeout(() => {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", `Volume stepper: Sending debounced update - trackId: ${trackId}, gain: ${gain}`);
            this.pendingUpdates.delete(trackId);

            // Update all volume states for this track (stateManager checks STATES_READY)
            this.updateVolumeStates(trackId, gain);

            // Update connector position if applicable
            this.updateConnectorPosition(trackId, gain);
        }, VolumeStepper.DEBOUNCE_MS);

        this.pendingUpdates.set(trackId, timer);
    }
    updateVolumeStates(trackId: string, gain: number) {
        const gainStr = gain.toFixed(3);
        const dbValue = toDb(gain);
        const dbStr = dbValue === -Infinity ? '-inf' : dbValue.toFixed(1);
        const percentStr = Math.round(gain * 100).toString();

        const states = [
            { id: C.Str.IdPrefix + 'track-volume-' + trackId, value: gainStr },
            { id: C.Str.IdPrefix + 'track-volume-db-' + trackId, value: dbStr },
            { id: C.Str.IdPrefix + 'track-volume-percent-' + trackId, value: percentStr }
        ];

        // Use stateManager to only send changed values
        stateManager.updateStateMany(states);
    }
    updateConnectorPosition(trackId: string, gain: number) {
        // Update the connector slider position when gain changes externally
        const connectorValue = Math.round(gain * 100);
        if (this.tp.connectorUpdate) {
            this.tp.connectorUpdate(this.tpConnector.id, connectorValue, { trackId });
        }
    }
    buildTrackIdx() {
        this.trackIdx = {};
        const currentTrackIds = new Set<string>();

        utils.getItemsByType(this.$MS, 'track', null).forEach((item: any) => {
            const key = item.name + ' - ' + item.value;
            this.trackIdx[key] = item;
            currentTrackIds.add(item.value);

            // Initialize cached gain from session data
            if (item.data.gain !== undefined) {
                this.trackGains[item.value] = item.data.gain;
            }
            // Create dynamic states for this track if not already created
            this.createTrackVolumeStates(item.value, item.name);

            // Register as observer for this track to receive gainUpdated signals
            this.registerTrackObserver(item.value);
        });

        // Unregister observers for tracks that no longer exist
        this.registeredObservers.forEach((trackId) => {
            if (!currentTrackIds.has(trackId)) {
                this.unregisterTrackObserver(trackId);
            }
        });

        this.tp.choiceUpdate(this.tpAction.data.trackList.id, this.tpAction.data.trackList.valueChoices());
        // Also update the connector's track list
        this.tp.choiceUpdate(this.tpConnector.data.track.id, this.tpConnector.data.track.valueChoices());

        // Delay initial state update to run after global STATES_READY is set
        // Use slightly longer delay to ensure it runs after the global flag is set
        setTimeout(() => {
            this.updateAllVolumeStates();
        }, STATE_INIT_DELAY_MS + 100);
    }

    registerTrackObserver(trackId: string) {
        if (!this.registeredObservers.has(trackId) && this.$MS?.meld?.registerTrackObserver) {
            try {
                // Note: parameter order is (context, trackId) per actual API
                this.$MS.meld.registerTrackObserver(VolumeStepper.OBSERVER_CONTEXT, trackId);
                this.registeredObservers.add(trackId);
                if (DEBUG_MODE) this.tp.logIt("DEBUG", `Volume stepper: Registered observer for track ${trackId}`);
            } catch (error) {
                this.tp.logIt("ERROR", `Volume stepper: Failed to register observer for track ${trackId}`);
            }
        }
    }

    unregisterTrackObserver(trackId: string) {
        if (this.registeredObservers.has(trackId) && this.$MS?.meld?.unregisterTrackObserver) {
            try {
                // Note: parameter order is (context, trackId) per actual API
                this.$MS.meld.unregisterTrackObserver(VolumeStepper.OBSERVER_CONTEXT, trackId);
                this.registeredObservers.delete(trackId);
                if (DEBUG_MODE) this.tp.logIt("DEBUG", `Volume stepper: Unregistered observer for track ${trackId}`);
            } catch (error) {
                this.tp.logIt("ERROR", `Volume stepper: Failed to unregister observer for track ${trackId}`);
            }
        }
    }
    createTrackVolumeStates(trackId: string, trackName: string) {
        const volumeStateId = C.Str.IdPrefix + 'track-volume-' + trackId;
        const dbStateId = C.Str.IdPrefix + 'track-volume-db-' + trackId;
        const percentStateId = C.Str.IdPrefix + 'track-volume-percent-' + trackId;

        if (!this.createdStates.has(volumeStateId)) {
            try {
                this.tp.removeState(volumeStateId);
            } catch (error) { }
            try {
                this.tp.createState(
                    volumeStateId,
                    `Track Volume: ${trackName}`,
                    '1.000',
                    'Meld Studio | Audio'
                );
            } catch (error) { }
            this.createdStates.add(volumeStateId);
        }

        if (!this.createdStates.has(dbStateId)) {
            try {
                this.tp.removeState(dbStateId);
            } catch (error) { }
            try {
                this.tp.createState(
                    dbStateId,
                    `Track Volume dB: ${trackName}`,
                    '0.0',
                    'Meld Studio | Audio'
                );
            } catch (error) { }
            this.createdStates.add(dbStateId);
        }

        if (!this.createdStates.has(percentStateId)) {
            try {
                this.tp.removeState(percentStateId);
            } catch (error) { }
            try {
                this.tp.createState(
                    percentStateId,
                    `Track Volume %: ${trackName}`,
                    '100',
                    'Meld Studio | Audio'
                );
                if (DEBUG_MODE) this.tp.logIt("DEBUG", `Created dynamic volume states for track: ${trackName}`);
            } catch (error) { }
            this.createdStates.add(percentStateId);
        }
    }
    updateAllVolumeStates() {
        const states: Array<{ id: string, value: string }> = [];
        for (const key in this.trackIdx) {
            const track = this.trackIdx[key];
            const trackId = track.value;
            const gain = this.trackGains[trackId] ?? track.data.gain ?? 1.0;
            const gainStr = gain.toFixed(3);
            const dbValue = toDb(gain);
            const dbStr = dbValue === -Infinity ? '-inf' : dbValue.toFixed(1);
            const percentStr = Math.round(gain * 100).toString();

            states.push({ id: C.Str.IdPrefix + 'track-volume-' + trackId, value: gainStr });
            states.push({ id: C.Str.IdPrefix + 'track-volume-db-' + trackId, value: dbStr });
            states.push({ id: C.Str.IdPrefix + 'track-volume-percent-' + trackId, value: percentStr });
        }
        if (states.length > 0) {
            stateManager.updateStateMany(states);
        }
    }
}
