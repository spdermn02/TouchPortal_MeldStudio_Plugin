import * as C from '../consts';
import { DEBUG_MODE, STATE_INIT_DELAY_MS, LAYER_PROPERTY_STATES } from '../consts';
import TpAction from '../touchPortal/tpAction';
import { utils } from '../meldStudio/utils';
import { stateManager } from '../utils/stateManager';
import { pathToFileURL } from 'url';

// Settable layer properties: display name -> session key. Meld ignores parent/type/index
const PROPERTIES: { [name: string]: { key: string, numeric: boolean } } = {
    'X': { key: 'x', numeric: true },
    'Y': { key: 'y', numeric: true },
    'Width': { key: 'width', numeric: true },
    'Height': { key: 'height', numeric: true },
    'Rotation': { key: 'rotation', numeric: true },
    'Name': { key: 'name', numeric: false },
    'Image Source': { key: 'source', numeric: false },
    'Browser URL': { key: 'url', numeric: false }
};
// Properties exposed as optional per-layer states (Name is already in every state description)
const STATE_PROPERTIES = ['X', 'Y', 'Width', 'Height', 'Rotation', 'Image Source', 'Browser URL'];
const SET_PROPERTY_MIN_VERSION = 2;

export default class LayerProperty extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'layer-property',
        name: "Set Layer Property",
        lineFormat: ["For Scene {$tp_meld_studio_layerprop-scene-list$}",
            "and Layer {$tp_meld_studio_layerprop-layer-list$}",
            "{$tp_meld_studio_layerprop-mode$} {$tp_meld_studio_layerprop-property$}",
            "to/by {$tp_meld_studio_layerprop-value$}"],
        holdable: false,
        enabled: true,
        data: {
            'sceneList': {
                id: C.Str.IdPrefix + 'layerprop-scene-list',
                type: 'choice',
                default: '[No Selection]',
                valueChoices: () => {
                    const scenes = Object.keys(this.sceneIdx).sort((a, b) => a.localeCompare(b));
                    return ['[No Selection]', ...scenes]
                }
            },
            'layerList': {
                id: C.Str.IdPrefix + 'layerprop-layer-list',
                type: 'choice',
                default: '[No Selection]',
                valueChoices: () => {
                    const layers = Object.keys(this.layerIdx).sort((a, b) => a.localeCompare(b));
                    return ['[No Selection]', ...layers]
                }
            },
            'mode': {
                id: C.Str.IdPrefix + 'layerprop-mode',
                type: 'choice',
                default: 'Set',
                valueChoices: [
                    'Set',
                    'Increase',
                    'Decrease'
                ]
            },
            'property': {
                id: C.Str.IdPrefix + 'layerprop-property',
                type: 'choice',
                default: 'X',
                valueChoices: Object.keys(PROPERTIES)
            },
            'value': {
                id: C.Str.IdPrefix + 'layerprop-value',
                type: 'text',
                default: ''
            }
        }
    }
    // Optional dynamic states - only created when the "Create Layer Property States" setting is on
    tpStates: any = {
        'layerProperty': {
            id: C.Str.IdPrefix + 'layer-prop',
            desc: 'Layer X/Y/Width/Height/Rotation/Source/URL (per layer, optional)',
            type: 'text',
            default: '',
            parentGroup: 'Meld Studio | Layer Properties',
            dynamic: true
        }
    }
    $MS: any = null;
    tp: any = null;
    sceneIdx: any = {}; // has name, value, data keys
    layerIdx: any = {}; // has name, value, data keys
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
            if (DEBUG_MODE) this.tp.logIt("DEBUG", "layer-property: Session changed");
            this.buildSceneIdx();
            this.buildLayerIdx();
        });
    }
    supportsSetProperty() {
        // `version` is undefined on API version 1
        return (this.$MS?.meld?.version ?? 1) >= SET_PROPERTY_MIN_VERSION && !!this.$MS?.meld?.setProperty;
    }
    stateId(property: string, layerId: string) {
        return C.Str.IdPrefix + 'layer-prop-' + PROPERTIES[property].key + '-' + layerId;
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
        utils.getItemsByType(this.$MS, 'layer', null).forEach((item: any) => {
            const key = item.name + ' - ' + item.value;
            this.layerIdx[key] = item;
        });
        if (instanceId) {
            this.tp.choiceUpdateSpecific(this.tpAction.data.layerList.id, this.tpAction.data.layerList.valueChoices(), instanceId);
            return;
        }
        this.tp.choiceUpdate(this.tpAction.data.layerList.id, this.tpAction.data.layerList.valueChoices());
        this.refreshPropertyStates();
    }
    /*
      Create/update the optional per-layer property states, or remove them when the setting is off.
      Called on session change and from index.ts when the setting changes
    */
    refreshPropertyStates() {
        if (!LAYER_PROPERTY_STATES) {
            this.removePropertyStates();
            return;
        }
        const sceneNames: { [id: string]: string } = {};
        utils.getItemsByType(this.$MS, 'scene', null).forEach((item: any) => { sceneNames[item.value] = item.name; });

        const currentStateIds = new Set<string>();
        for (const key in this.layerIdx) {
            const layer = this.layerIdx[key];
            const label = `${layer.name} (${sceneNames[layer.data.parent] ?? 'No Scene'})`;
            for (const property of STATE_PROPERTIES) {
                // Only create source/url states for layers that actually have them
                if (!PROPERTIES[property].numeric && layer.data[PROPERTIES[property].key] === undefined) continue;
                const stateId = this.stateId(property, layer.value);
                currentStateIds.add(stateId);
                if (!this.createdStates.has(stateId)) {
                    try {
                        this.tp.createState(stateId, `Layer ${property}: ${label}`, '', 'Meld Studio | Layer Properties');
                    } catch (error) {
                        this.tp.logIt("ERROR", `layer-property: Failed to create state: ${stateId}`);
                    }
                    this.createdStates.add(stateId);
                }
            }
        }
        // Drop states for layers that no longer exist
        this.createdStates.forEach((stateId) => {
            if (!currentStateIds.has(stateId)) this.removeState(stateId);
        });
        // Delay state updates to run after global STATES_READY is set
        setTimeout(() => {
            this.updateAllPropertyStates();
        }, STATE_INIT_DELAY_MS + 100);
    }
    updateAllPropertyStates() {
        if (!LAYER_PROPERTY_STATES) return;
        const states: Array<{ id: string, value: string }> = [];
        for (const key in this.layerIdx) {
            const layer = this.layerIdx[key];
            for (const property of STATE_PROPERTIES) {
                const stateId = this.stateId(property, layer.value);
                if (!this.createdStates.has(stateId)) continue;
                const value = layer.data[PROPERTIES[property].key];
                states.push({ id: stateId, value: value === undefined || value === null ? '' : String(value) });
            }
        }
        if (states.length > 0) {
            stateManager.updateStateMany(states);
        }
    }
    removeState(stateId: string) {
        try {
            this.tp.removeState(stateId);
        } catch (error) {
            // State may already be gone, ignore
        }
        this.createdStates.delete(stateId);
        stateManager.clearState(stateId);
    }
    removePropertyStates() {
        this.createdStates.forEach((stateId) => this.removeState(stateId));
    }
    handleAction(message: any) {
        if (DEBUG_MODE) this.tp.logIt("DEBUG", "layer-property: Handling action", JSON.stringify(message));
        if (!this.supportsSetProperty()) {
            if (!this.warnedVersion) {
                this.tp.logIt("WARN", `Set Layer Property needs Meld Studio WebChannel API v${SET_PROPERTY_MIN_VERSION}+ (connected: v${this.$MS?.meld?.version ?? 1}) - update Meld Studio`);
                this.warnedVersion = true;
            }
            return;
        }
        const layer = this.layerIdx[message.data[1]?.value];
        const mode = message.data[2]?.value ?? 'Set';
        const property = PROPERTIES[message.data[3]?.value];
        const rawValue = String(message.data[4]?.value ?? '').trim();
        if (!layer || !property) {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", "layer-property: Invalid layer or property selection");
            return;
        }

        let value: any;
        if (property.numeric) {
            const amount = parseFloat(rawValue);
            if (!Number.isFinite(amount)) {
                this.tp.logIt("WARN", `Set Layer Property: "${rawValue}" is not a number for ${message.data[3].value}`);
                return;
            }
            const current = Number(layer.data[property.key]) || 0;
            value = mode === 'Increase' ? current + amount : mode === 'Decrease' ? current - amount : amount;
            if (property.key === 'width' || property.key === 'height') value = Math.max(1, value);
            if (property.key !== 'rotation') value = Math.round(value);
        } else {
            if (mode !== 'Set') {
                this.tp.logIt("WARN", `Set Layer Property: ${message.data[3].value} only supports Set`);
                return;
            }
            value = property.key === 'source' ? this.toSourceUrl(rawValue) : rawValue;
            if (value === null) return;
        }

        if (DEBUG_MODE) this.tp.logIt("DEBUG", `layer-property: ${layer.value}.${property.key} = ${value}`);
        this.$MS.meld.setProperty(layer.value, property.key, value);
    }
    toSourceUrl(rawValue: string): string | null {
        // Meld stores image sources as file:// URLs - accept plain paths too (e.g. C:\images\frame.png)
        if (/^[a-z][a-z0-9+.-]*:\/\//i.test(rawValue)) return rawValue;
        try {
            return pathToFileURL(rawValue).href;
        } catch (error) {
            this.tp.logIt("WARN", `Set Layer Property: invalid image path "${rawValue}"`);
            return null;
        }
    }
    handleListChange(message: any) {
        if (message.listId == this.tpAction.data.sceneList.id) {
            const selection = this.sceneIdx[message.values[0].value]?.value;
            if (selection) {
                const layers = utils.getItemsByType(this.$MS, 'layer', selection)
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
