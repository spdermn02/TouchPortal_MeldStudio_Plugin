import * as C from '../consts';
import { DEBUG_MODE, STATE_INIT_DELAY_MS } from '../consts';
import TpAction from '../touchPortal/tpAction';
import { utils } from '../meldStudio/utils';
import { stateManager } from '../utils/stateManager';
import { pendingValues } from '../utils/pendingValues';

// Camera layers publish this key on Meld Studio 0.10.7.5+; older builds omit it on every layer.
// Blur vs removal is a device-level setting in Meld - this only switches the effect on/off
const BACKGROUND_KEY = 'backgroundEffectEnabled';
const SET_PROPERTY_MIN_VERSION = 2;

export default class CameraBackground extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'camera-background',
        name: "Camera Background",
        lineFormat: ["For Scene {$tp_meld_studio_camerabg-scene-list$}",
            "then {$tp_meld_studio_camerabg-action$} the background effect on {$tp_meld_studio_camerabg-layer-list$}"],
        holdable: false,
        enabled: true,
        data: {
            'sceneList': {
                id: C.Str.IdPrefix + 'camerabg-scene-list',
                type: 'choice',
                default: '[No Selection]',
                valueChoices: () => {
                    const scenes = Object.keys(this.sceneIdx).sort((a, b) => a.localeCompare(b));
                    return ['[No Selection]', ...scenes]
                }
            },
            'action': {
                id: C.Str.IdPrefix + 'camerabg-action',
                type: 'choice',
                default: 'Toggle',
                valueChoices: [
                    'Toggle',
                    'Enable',
                    'Disable'
                ]
            },
            'layerList': {
                id: C.Str.IdPrefix + 'camerabg-layer-list',
                type: 'choice',
                default: '[No Selection]',
                valueChoices: () => {
                    const layers = Object.keys(this.layerIdx).sort((a, b) => a.localeCompare(b));
                    return ['[No Selection]', ...layers]
                }
            }
        }
    }
    // Dynamic states - one per camera layer
    tpStates: any = {
        'backgroundEffect': {
            id: C.Str.IdPrefix + 'camera-background',
            desc: 'Camera Background Effect (per camera layer)',
            type: 'choice',
            default: 'No',
            valueChoices: ['No', 'Yes'],
            parentGroup: 'Meld Studio | Camera',
            dynamic: true
        }
    }
    $MS: any = null;
    tp: any = null;
    sceneIdx: any = {}; // has name, value, data keys
    layerIdx: any = {}; // camera layers only - has name, value, data keys
    createdStates: Set<string> = new Set(); // Track which dynamic states have been created
    warnedVersion: boolean = false;
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
            if (DEBUG_MODE) this.tp.logIt("DEBUG", "camera-background: Session changed");
            this.buildSceneIdx();
            this.buildLayerIdx();
        });
    }
    stateId(layerId: string) {
        return C.Str.IdPrefix + 'camera-background-' + layerId;
    }
    cameraLayers(sceneId: string | null = null) {
        return utils.getItemsByType(this.$MS, 'layer', sceneId).filter((item: any) => item.data[BACKGROUND_KEY] !== undefined);
    }
    buildSceneIdx(instanceId: string | null = null) {
        this.sceneIdx = {};
        utils.getItemsByType(this.$MS, 'scene', null).forEach((item: any) => {
            const key = item.name + ' - ' + item.value;
            this.sceneIdx[key] = item;
        });
        if (instanceId) {
            this.tp.choiceUpdateSpecific(this.tpAction.data.sceneList.id, this.tpAction.data.sceneList.valueChoices(), instanceId);
        }
        else {
            this.tp.choiceUpdate(this.tpAction.data.sceneList.id, this.tpAction.data.sceneList.valueChoices());
        }
    }
    buildLayerIdx(instanceId: string | null = null) {
        this.layerIdx = {};
        this.cameraLayers().forEach((item: any) => {
            const key = item.name + ' - ' + item.value;
            this.layerIdx[key] = item;
            this.createLayerState(item.value, item.name);
        });
        if (instanceId) {
            this.tp.choiceUpdateSpecific(this.tpAction.data.layerList.id, this.tpAction.data.layerList.valueChoices(), instanceId);
            return;
        }
        this.tp.choiceUpdate(this.tpAction.data.layerList.id, this.tpAction.data.layerList.valueChoices());
        // Delay state updates to run after global STATES_READY is set
        setTimeout(() => {
            this.updateAllStates();
        }, STATE_INIT_DELAY_MS + 100);
    }
    createLayerState(layerId: string, layerName: string) {
        const stateId = this.stateId(layerId);
        if (!this.createdStates.has(stateId)) {
            try {
                this.tp.createState(stateId, `Camera Background: ${layerName}`, 'No', 'Meld Studio | Camera');
                if (DEBUG_MODE) this.tp.logIt("DEBUG", `camera-background: Created dynamic state: ${stateId}`);
            } catch (error) {
                this.tp.logIt("ERROR", `camera-background: Failed to create state: ${stateId}`);
            }
            this.createdStates.add(stateId);
        }
    }
    updateAllStates() {
        const states: Array<{ id: string, value: string }> = [];
        for (const key in this.layerIdx) {
            const layer = this.layerIdx[key];
            states.push({ id: this.stateId(layer.value), value: layer.data[BACKGROUND_KEY] ? 'Yes' : 'No' });
        }
        if (states.length > 0) {
            stateManager.updateStateMany(states);
        }
    }
    supportsSetProperty() {
        // `version` is undefined on API version 1
        return (this.$MS?.meld?.version ?? 1) >= SET_PROPERTY_MIN_VERSION && !!this.$MS?.meld?.setProperty;
    }
    handleAction(message: any) {
        if (DEBUG_MODE) this.tp.logIt("DEBUG", "camera-background: Handling action", JSON.stringify(message));
        const action = message.data[1]?.value ?? 'Toggle';
        const layer = this.layerIdx[message.data[2]?.value];
        if (!layer) {
            // [No Selection], not a camera layer, or deleted in Meld since the button was set up
            if (DEBUG_MODE) this.tp.logIt("DEBUG", "camera-background: No valid camera layer selected");
            return;
        }
        if (!this.supportsSetProperty()) {
            if (!this.warnedVersion) {
                this.tp.logIt("WARN", `Camera Background needs Meld Studio WebChannel API v${SET_PROPERTY_MIN_VERSION}+ - update Meld Studio`);
                this.warnedVersion = true;
            }
            return;
        }
        // Toggle from the pending write if one is in flight so quick double presses undo each other
        const current = !!pendingValues.get(layer.value, BACKGROUND_KEY, !!layer.data[BACKGROUND_KEY]);
        const next = action === 'Enable' ? true : action === 'Disable' ? false : !current;
        if (DEBUG_MODE) this.tp.logIt("DEBUG", `camera-background: ${layer.value} ${BACKGROUND_KEY} = ${next}`);
        pendingValues.set(layer.value, BACKGROUND_KEY, next);
        this.$MS.meld.setProperty(layer.value, BACKGROUND_KEY, next);
    }
    handleListChange(message: any) {
        if (message.listId == this.tpAction.data.sceneList.id) {
            const selection = this.sceneIdx[message.values[0].value]?.value;
            if (selection) {
                const layers = this.cameraLayers(selection)
                    .map((item: any) => item.name + ' - ' + item.value)
                    .sort((a: string, b: string) => a.localeCompare(b));
                layers.unshift('[No Selection]');
                this.tp.choiceUpdateSpecific(this.tpAction.data.layerList.id, layers, message.instanceId);
            }
            else {
                this.buildLayerIdx(message.instanceId);
            }
        }
    }
}
