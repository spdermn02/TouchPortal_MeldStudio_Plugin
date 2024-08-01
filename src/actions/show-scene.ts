import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';
import { utils } from '../meldStudio/utils';

export default class ShowScene extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'show-scene',
        name: "Show Scene",
        lineFormat: "Show Scene {$tp_meld_studio_scene-list$}",
        holdable: false,
        data: {
            'sceneList': {
                id: C.Str.IdPrefix + 'scene-list',
                type: 'choice',
                default: '',
                valueChoices: () => {
                    return Object.keys(this.sceneIdx).sort((a, b) => a.localeCompare(b));
                }
            },
        }
    }
    $MS: any = null;
    tp: any = null;
    currentSceneId: string = '';
    sceneIdx: any = {}; // has name, value, data keys
    tpStates: any = {
        'currentScene': {
            id: C.Str.IdPrefix + 'current-scene',
            desc: 'Current Scene Name',
            type: 'text',
            default: '',
            parentGroup: 'Scene'
        },
        'currentSceneId': {
            id: C.Str.IdPrefix + 'current-scene-id',
            desc: 'Current Scene ID',
            type: 'text',
            default: '',
            parentGroup: 'Scene'
        },
        'currentSceneNameId': {
            id: C.Str.IdPrefix + 'current-scene-name-id',
            desc: 'Current Scene Name & ID',
            type: 'text',
            default: '',
            parentGroup: 'Scene'
        }
    }
    constructor($MS: any, TPClient: any) {
        super();
        this.$MS = $MS;
        this.tp = TPClient;
        this.initialize();
    }
    initialize() {
        this.tp.on('Action', (message: any) => {
            if (message.actionId == this.getTpActionId() ) {
                this.handleAction(message);
            }
        });
        this.$MS.on('sessionChanged', () => {
            this.tp.logIt("DEBUG","Something changed in the session");
            this.buildSceneIdx();
        });
        this.buildSceneIdx();
    }
    handleAction(message: any) {
        const scene = this.sceneIdx[message.data[0].value];
        if (!scene) {
            return;
        }
        if (this.$MS?.meld?.showScene) {
            this.$MS.meld.showScene(scene);
        }
    }
    buildSceneIdx() {
        this.sceneIdx = {};
        utils.getItemsByType(this.$MS, 'scene', null).forEach((item: any) => {
            const key = item.name + ' - ' + item.value;
            this.sceneIdx[key] = item.value;
            // Only run the state update to TouchPortal if we actually
            // have a change in scene.
            if (item.data.current && this.currentSceneId !== key) {
                this.updateCurrentSceneStates(key, item);
                this.currentSceneId = key;
            }
        });
        this.tp.choiceUpdate(this.tpAction.data.sceneList.id, this.tpAction.data.sceneList.valueChoices());
    }
    updateCurrentSceneStates(key: string, item: any) {
        const states = [
            {
                id: this.tpStates.currentScene.id,
                value: item.name
            },
            {
                id: this.tpStates.currentSceneId.id,
                value: item.value
            },
            {
                id: this.tpStates.currentSceneNameId.id,
                value: key
            }
        ]
        this.tp.stateUpdateMany(states);
    }
}