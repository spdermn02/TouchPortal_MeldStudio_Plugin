import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';
import { utils } from '../meldStudio/utils';

export default class ToggleEffect extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'toggle_effect',
        name: "Toggle Effect",
        lineFormat: ["For Scene {$tp_meld_studio_effect-scene-list$}",
            "and Layer {$tp_meld_studio_effect-layer-list$}",
            "then {$tp_meld_studio_effect-action$} the effect {$tp_meld_studio_effect-list$}"],
        holdable: false,
        data: {
            'effectSceneList': {
                id: C.Str.IdPrefix + 'effect-scene-list',
                type: 'choice',
                default: '[No Selection]',
                valueChoices: () => {
                    const scenes = Object.keys(this.sceneIdx).sort((a, b) => a.localeCompare(b));
                    return ['[No Selection]', ...scenes]
                }
            },
            'effectLayerList': {
                id: C.Str.IdPrefix + 'effect-layer-list',
                type: 'choice',
                default: '[No Selection]',
                valueChoices: () => {
                    const layers = Object.keys(this.layerIdx).sort((a, b) => a.localeCompare(b));
                    return ['[No Selection]', ...layers]
                }
            },
            'effectAction': {
                id: C.Str.IdPrefix + 'effect-action',
                type: 'choice',
                default: 'Toggle',
                valueChoices: [
                    'Toggle',
                    'Show',
                    'Hide'
                ]
            },
            'effectList': {
                id: C.Str.IdPrefix + 'effect-list',
                type: 'choice',
                default: '[No Selection]',
                valueChoices: () => {
                    const effects = Object.keys(this.effectIdx).sort((a, b) => a.localeCompare(b));
                    return ['[No Selection]', ...effects]
                }
            }
        },
        enabled: true
    }
    $MS: any = null;
    tp: any = null;
    sceneIdx: any = {}; // has name, value, data keys
    layerIdx: any = {}; // has name, value, data keys
    effectIdx: any = {}; // has name, value, data keys
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
            this.buildEffectIdx();
        });
    }
    handleAction(message: any) {
        this.tp.logIt("DEBUG", "Handling action", JSON.stringify(message));
        const sceneId = this.sceneIdx[message.data[0].value].value;
        const layerId = this.layerIdx[message.data[1].value].value;
        const action = message.data[2].value;
        const effect = this.effectIdx[message.data[3].value];

        if (!this.$MS?.meld?.toggleEffect) {
            return;
        }

        // Logic here pulled from the MeldStudio StreamDeck plugin code
        // available here;  https://github.com/MeldStudio/streamdeck/blob/9e8613c9f68244f4d9304aef9f8547a79da02d80/co.meldstudio.streamdeck.sdPlugin/actions/toggle-effect/plugin.js#L21
        if (action.toLowerCase() == 'toggle') {
            this.$MS.meld.toggleEffect(sceneId, layerId, effect.value);
        }
        else {
            const action_show = action.toLowerCase() === 'show' ? 1 : 0;
            const state_show = effect.data.enabled ? 1 : 0;

            const show = action_show ^ state_show;
            if (show) {
                this.$MS.meld.toggleEffect(sceneId, layerId, effect.value);
            }
        }

    }
    buildSceneIdx(instanceId: string | null = null) {
        this.sceneIdx = {};
        utils.getItemsByType(this.$MS, 'scene', null).forEach((item: any) => {
            const key = item.name + ' - ' + item.value;
            this.sceneIdx[key] = item;
        });
        if (instanceId) {
            this.tp.choiceUpdateSpecific(this.tpAction.data.effectSceneList.id, this.tpAction.data.effectSceneList.valueChoices(), instanceId);
        }
        else {
            this.tp.choiceUpdate(this.tpAction.data.effectSceneList.id, this.tpAction.data.effectSceneList.valueChoices());
        }
    }
    buildLayerIdx(instanceId: string | null = null) {
        this.layerIdx = {};
        utils.getItemsByType(this.$MS, 'layer', null).forEach((item: any) => {
            const key = item.name + ' - ' + item.value;
            this.layerIdx[key] = item;
        });
        if (instanceId) {
            this.tp.choiceUpdateSpecific(this.tpAction.data.effectLayerList.id, this.tpAction.data.effectLayerList.valueChoices(), instanceId);
        }
        else {
            this.tp.choiceUpdate(this.tpAction.data.effectLayerList.id, this.tpAction.data.effectLayerList.valueChoices());
        }
    }
    buildEffectIdx(instanceId: string | null = null) {
        this.effectIdx = {};
        utils.getItemsByType(this.$MS, 'effect', null).forEach((item: any) => {
            const key = item.name + ' - ' + item.value;
            this.effectIdx[key] = item;
        });
        if (instanceId) {
            this.tp.choiceUpdateSpecific(this.tpAction.data.effectList.id, this.tpAction.data.effectList.valueChoices(), instanceId);
        }
        else {
            this.tp.choiceUpdate(this.tpAction.data.effectList.id, this.tpAction.data.effectList.valueChoices());
        }
    }
    handleListChange(message) {
        this.instances[message.instanceId] = message.values;
        if (message.listId == this.tpAction.data.effectSceneList.id) {
            let selection = this.sceneIdx[message.values[0].value]?.value;
            if (selection) {
                let subLayers = {};
                utils.getItemsByType(this.$MS, 'layer', selection).forEach((item: any) => {
                    const key = item.name + ' - ' + item.value;
                    subLayers[key] = item.value;
                });
                const layers = Object.keys(subLayers).sort((a, b) => a.localeCompare(b));
                layers.unshift('[No Selection]');
                this.tp.choiceUpdateSpecific(this.tpAction.data.effectLayerList.id, layers, message.instanceId);
            }
            else {
                this.buildLayerIdx(message.instanceId);
            }
        }
        if (message.listId == this.tpAction.data.effectLayerList.id) {
            let selection = this.layerIdx[message.values[1].value]?.value;
            if (selection) {
                let subEffects = {};
                utils.getItemsByType(this.$MS, 'effect', selection).forEach((item: any) => {
                    const key = item.name + ' - ' + item.value;
                    subEffects[key] = item.value;
                });
                const effects = Object.keys(subEffects).sort((a, b) => a.localeCompare(b));
                effects.unshift('[No Selection]');
                this.tp.choiceUpdateSpecific(this.tpAction.data.effectList.id, effects, message.instanceId);
            }
            else {
                this.buildEffectIdx(message.instanceId);
            }
        }

    }
}