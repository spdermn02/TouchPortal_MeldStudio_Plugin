import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';
import { utils } from '../meldStudio/utils';

export default class ToggleLayer extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'toggle_layer',
        name: "Layer Visibility",
        lineFormat: ["For Scene {$tp_meld_studio_layer-scene-list$}",
            "then {$tp_meld_studio_layer-action$} the layer {$tp_meld_studio_layer-layer-list$}"],
        holdable: false,
        enabled: true,
        data: {
            'layerSceneList': {
                id: C.Str.IdPrefix + 'layer-scene-list',
                type: 'choice',
                default: '[No Selection]',
                valueChoices: () => {
                    const scenes = Object.keys(this.sceneIdx).sort((a, b) => a.localeCompare(b));
                    return ['[No Selection]', ...scenes]
                }
            },
            'layerAction': {
                id: C.Str.IdPrefix + 'layer-action',
                type: 'choice',
                default: 'Toggle',
                valueChoices: [
                    'Toggle',
                    'Show',
                    'Hide'
                ]
            },
            'layerLayerList': {
                id: C.Str.IdPrefix + 'layer-layer-list',
                type: 'choice',
                default: '[No Selection]',
                valueChoices: () => {
                    const layers = Object.keys(this.layerIdx).sort((a, b) => a.localeCompare(b));
                    return ['[No Selection]', ...layers]
                }
            },
        }
    }
    $MS: any = null;
    tp: any = null;
    sceneIdx: any = {}; // has name, value, data keys
    layerIdx: any = {}; // has name, value, data keys
    instances: any = {};
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
            this.tp.logIt("DEBUG", "Something changed in the session");
            this.buildSceneIdx();
            this.buildLayerIdx();
        });
    }
    buildSceneIdx(instanceId: string | null = null) {
        this.sceneIdx = {};
        utils.getItemsByType(this.$MS, 'scene', null).forEach((item: any) => {
            const key = item.name + ' - ' + item.value;
            this.sceneIdx[key] = item;
        });
        if (instanceId) {
            this.tp.choiceUpdateSpecific(this.tpAction.data.layerSceneList.id, this.tpAction.data.layerSceneList.valueChoices(), instanceId);
        }
        else {
            this.tp.choiceUpdate(this.tpAction.data.layerSceneList.id, this.tpAction.data.layerSceneList.valueChoices());
        }
    }
    buildLayerIdx(instanceId: string | null = null) {
        this.layerIdx = {};
        utils.getItemsByType(this.$MS, 'layer', null).forEach((item: any) => {
            const key = item.name + ' - ' + item.value;
            this.layerIdx[key] = item;
        });
        if (instanceId) {
            this.tp.choiceUpdateSpecific(this.tpAction.data.layerLayerList.id, this.tpAction.data.layerLayerList.valueChoices(), instanceId);
        }
        else {
            this.tp.choiceUpdate(this.tpAction.data.layerLayerList.id, this.tpAction.data.layerLayerList.valueChoices());
        }
    }
    handleAction(message: any) {
        this.tp.logIt("DEBUG", "Handling action", JSON.stringify(message));
        const sceneId = this.sceneIdx[message.data[0].value].value;
        const action = message.data[1].value;
        const layer = this.layerIdx[message.data[2].value];

        if (!this.$MS?.meld?.toggleLayer) {
            return;
        }

        // Logic here pulled from the MeldStudio StreamDeck plugin code
        // available here;  https://github.com/MeldStudio/streamdeck/blob/9e8613c9f68244f4d9304aef9f8547a79da02d80/co.meldstudio.streamdeck.sdPlugin/actions/toggle-layer/plugin.js#L21
        if (action.toLowerCase() == 'toggle') {
            this.$MS.meld.toggleLayer(sceneId, layer.value);
        }
        else {
            const action_show = action.toLowerCase() === 'show' ? 1 : 0;
            const state_show = layer.data.visible ? 1 : 0;

            const show = action_show ^ state_show;
            if (show) {
                this.$MS.meld.toggleLayer(sceneId, layer.value);
            }
        }
    }
    handleListChange(message: any) {
        this.instances[message.instanceId] = message.values;
        if (message.listId == this.tpAction.data.layerSceneList.id) {
            let selection = this.sceneIdx[message.values[0].value]?.value;
            if (selection) {
                let subLayers = {};
                utils.getItemsByType(this.$MS, 'layer', selection).forEach((item: any) => {
                    const key = item.name + ' - ' + item.value;
                    subLayers[key] = item.value;
                });
                const layers = Object.keys(subLayers).sort((a, b) => a.localeCompare(b));
                layers.unshift('[No Selection]');
                this.tp.choiceUpdateSpecific(this.tpAction.data.layerLayerList.id, layers, message.instanceId);
            }
            else {
                this.buildLayerIdx(message.instanceId);
            }
        }
    }

}