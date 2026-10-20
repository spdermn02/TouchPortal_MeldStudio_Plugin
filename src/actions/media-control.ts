import * as C from '../consts';
import { DEBUG_MODE, STATE_INIT_DELAY_MS } from '../consts';
import TpAction from '../touchPortal/tpAction';
import { utils } from '../meldStudio/utils';
import { stateManager } from '../utils/stateManager';

export default class MediaControl extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'media-control',
        name: "Media Control",
        lineFormat: ["For Scene {$tp_meld_studio_media-scene-list$}",
            "and Layer {$tp_meld_studio_media-layer-list$}",
            "then {$tp_meld_studio_media-action$}",
            "Seek To {$tp_meld_studio_media-seek-seconds$} seconds"],
        holdable: false,
        enabled: true,
        data: {
            'mediaSceneList': {
                id: C.Str.IdPrefix + 'media-scene-list',
                type: 'choice',
                default: '[No Selection]',
                valueChoices: () => {
                    const scenes = Object.keys(this.sceneIdx).sort((a, b) => a.localeCompare(b));
                    return ['[No Selection]', ...scenes]
                }
            },
            'mediaLayerList': {
                id: C.Str.IdPrefix + 'media-layer-list',
                type: 'choice',
                default: '[No Selection]',
                valueChoices: () => {
                    const layers = Object.keys(this.mediaLayerIdx).sort((a, b) => a.localeCompare(b));
                    return ['[No Selection]', ...layers]
                }
            },
            'mediaAction': {
                id: C.Str.IdPrefix + 'media-action',
                type: 'choice',
                default: 'Toggle',
                valueChoices: [
                    'Toggle',
                    'Play',
                    'Pause',
                    'Restart',
                    'Seek To'
                ]
            },
            'mediaSeekSeconds': {
                id: C.Str.IdPrefix + 'media-seek-seconds',
                type: 'number',
                default: 0,
                minValue: 0,
                allowDecimals: true
            }
        }
    }
    // Dynamic states - created at runtime with layer UUIDs
    tpStates: any = {
        'mediaPlaying': {
            id: C.Str.IdPrefix + 'media-playing',
            desc: 'Media Playing State (per layer)',
            type: 'choice',
            default: 'No',
            valueChoices: ['No', 'Yes'],
            parentGroup: 'Meld Studio | Media',
            dynamic: true
        }
    }
    $MS: any = null;
    tp: any = null;
    sceneIdx: any = {}; // has name, value, data keys
    mediaLayerIdx: any = {}; // has name, value, data keys - only media layers
    allLayerIdx: any = {}; // all layers for lookup
    instances: any = {};
    mediaPlayingStates: any = {}; // layerId -> isPlaying
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
        this.tp.on('ListChange', (message: any) => {
            if (message.actionId == this.getTpActionId()) {
                this.handleListChange(message);
            }
        });
        this.$MS.on('sessionChanged', () => {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", "media-control: Session changed");
            this.buildSceneIdx();
            this.buildMediaLayerIdx();
        });
    }
    handleAction(message: any) {
        if (DEBUG_MODE) this.tp.logIt("DEBUG", "media-control: Handling action", JSON.stringify(message));
        const sceneKey = message.data[0].value;
        const layerKey = message.data[1].value;
        const action = message.data[2].value;

        const scene = this.sceneIdx[sceneKey];
        const layer = this.mediaLayerIdx[layerKey] || this.allLayerIdx[layerKey];

        if (!scene || !layer) {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", "media-control: Invalid scene or layer selection");
            return;
        }

        const layerId = layer.value;

        switch (action.toLowerCase()) {
            case 'toggle':
                this.togglePlayPause(layerId);
                break;
            case 'play':
                this.playMedia(layerId);
                break;
            case 'pause':
                this.pauseMedia(layerId);
                break;
            case 'restart':
                this.restartMedia(layerId);
                break;
            case 'seek to': {
                // Seek position only applies to Seek To; older buttons have no 4th data item
                const seconds = parseFloat(message.data[3]?.value);
                this.seekMedia(layerId, Number.isFinite(seconds) ? Math.max(0, seconds) : 0);
                break;
            }
        }
    }
    togglePlayPause(layerId: string) {
        const isPlaying = this.mediaPlayingStates[layerId] ?? false;
        if (isPlaying) {
            this.pauseMedia(layerId);
        } else {
            this.playMedia(layerId);
        }
    }
    playMedia(layerId: string) {
        if (this.$MS?.meld?.callFunction) {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", `media-control: Playing layer ${layerId}`);
            this.$MS.meld.callFunction(layerId, 'play');
            this.mediaPlayingStates[layerId] = true;
            this.updateMediaPlayingState(layerId, true);
        }
    }
    pauseMedia(layerId: string) {
        if (this.$MS?.meld?.callFunction) {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", `media-control: Pausing layer ${layerId}`);
            this.$MS.meld.callFunction(layerId, 'pause');
            this.mediaPlayingStates[layerId] = false;
            this.updateMediaPlayingState(layerId, false);
        }
    }
    restartMedia(layerId: string) {
        if (this.$MS?.meld?.callFunctionWithArgs) {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", `media-control: Restarting layer ${layerId}`);
            this.$MS.meld.callFunctionWithArgs(layerId, 'seekTo', [0]);
            // After seeking to 0, play the media
            if (this.$MS?.meld?.callFunction) {
                this.$MS.meld.callFunction(layerId, 'play');
                this.mediaPlayingStates[layerId] = true;
                this.updateMediaPlayingState(layerId, true);
            }
        }
    }
    seekMedia(layerId: string, seconds: number) {
        if (this.$MS?.meld?.callFunctionWithArgs) {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", `media-control: Seeking layer ${layerId} to ${seconds}s`);
            this.$MS.meld.callFunctionWithArgs(layerId, 'seekTo', [seconds]);
        }
    }
    createMediaState(layerId: string, layerName: string) {
        const stateId = C.Str.IdPrefix + 'media-playing-' + layerId;
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
                    `Media Playing: ${layerName}`,
                    'No',
                    'Meld Studio | Media'
                );
                if (DEBUG_MODE) this.tp.logIt("DEBUG", `media-control: Created dynamic state: ${stateId}`);
            } catch (error) {
                this.tp.logIt("ERROR", `media-control: Failed to create state: ${stateId}`);
            }
            this.createdStates.add(stateId);
        }
    }
    updateMediaPlayingState(layerId: string, isPlaying: boolean) {
        const stateId = C.Str.IdPrefix + 'media-playing-' + layerId;
        const value = isPlaying ? 'Yes' : 'No';
        stateManager.updateState(stateId, value);
    }
    buildSceneIdx(instanceId: string | null = null) {
        this.sceneIdx = {};
        utils.getItemsByType(this.$MS, 'scene', null).forEach((item: any) => {
            const key = item.name + ' - ' + item.value;
            this.sceneIdx[key] = item;
        });
        if (instanceId) {
            this.tp.choiceUpdateSpecific(this.tpAction.data.mediaSceneList.id, this.tpAction.data.mediaSceneList.valueChoices(), instanceId);
        } else {
            this.tp.choiceUpdate(this.tpAction.data.mediaSceneList.id, this.tpAction.data.mediaSceneList.valueChoices());
        }
    }
    buildMediaLayerIdx(instanceId: string | null = null) {
        this.mediaLayerIdx = {};
        this.allLayerIdx = {};
        utils.getItemsByType(this.$MS, 'layer', null).forEach((item: any) => {
            const key = item.name + ' - ' + item.value;
            this.allLayerIdx[key] = item;
            // Filter to only media layers (layers with mediaSource property)
            if (item.data.mediaSource !== undefined) {
                this.mediaLayerIdx[key] = item;
                // Initialize playing state
                if (item.data.isPlaying !== undefined) {
                    this.mediaPlayingStates[item.value] = item.data.isPlaying;
                }
                // Create dynamic state for this media layer
                this.createMediaState(item.value, item.name);
            }
        });
        if (instanceId) {
            this.tp.choiceUpdateSpecific(this.tpAction.data.mediaLayerList.id, this.tpAction.data.mediaLayerList.valueChoices(), instanceId);
        } else {
            this.tp.choiceUpdate(this.tpAction.data.mediaLayerList.id, this.tpAction.data.mediaLayerList.valueChoices());
        }
        // Delay state updates to run after global STATES_READY is set
        setTimeout(() => {
            this.updateAllMediaPlayingStates();
        }, STATE_INIT_DELAY_MS + 100);
    }
    updateAllMediaPlayingStates() {
        const states: Array<{ id: string, value: string }> = [];
        for (const key in this.mediaLayerIdx) {
            const layer = this.mediaLayerIdx[key];
            const layerId = layer.value;
            const isPlaying = this.mediaPlayingStates[layerId] ?? false;
            const stateId = C.Str.IdPrefix + 'media-playing-' + layerId;
            const value = isPlaying ? 'Yes' : 'No';
            states.push({ id: stateId, value });
        }
        if (states.length > 0) {
            stateManager.updateStateMany(states);
        }
    }
    handleListChange(message: any) {
        this.instances[message.instanceId] = message.values;
        if (message.listId == this.tpAction.data.mediaSceneList.id) {
            let selection = this.sceneIdx[message.values[0].value]?.value;
            if (selection) {
                // Filter media layers to only those under the selected scene
                let subLayers: any = {};
                utils.getItemsByType(this.$MS, 'layer', selection).forEach((item: any) => {
                    // Only include media layers
                    if (item.data.mediaSource !== undefined) {
                        const key = item.name + ' - ' + item.value;
                        subLayers[key] = item.value;
                    }
                });
                const layers = Object.keys(subLayers).sort((a, b) => a.localeCompare(b));
                layers.unshift('[No Selection]');
                this.tp.choiceUpdateSpecific(this.tpAction.data.mediaLayerList.id, layers, message.instanceId);
            } else {
                this.buildMediaLayerIdx(message.instanceId);
            }
        }
    }
}
