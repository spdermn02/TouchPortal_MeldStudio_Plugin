import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';
import { utils } from '../meldStudio/utils';

export default class StageScene extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'stage-scene',
        name: "Stage Scene",
        lineFormat: "Stage Scene {$tp_meld_studio_stage-scene-list$}",
        holdable: false,
        data: {
            'sceneList': {
                id: C.Str.IdPrefix + 'stage-scene-list',
                type: 'choice',
                default: '',
                valueChoices: () => {
                    const scenes = Object.keys(this.sceneIdx).sort((a, b) => a.localeCompare(b));
                    return ['[No Selection]', ...scenes]
                }
            },
        },
        enabled: true
    }
    $MS: any = null;
    tp: any = null;
    stagedSceneId: string = '';
    sceneIdx: any = {}; // has name, value, data keys
    tpStates: any = {
        'stagedScene': {
            id: C.Str.IdPrefix + 'staged-scene',
            desc: 'Staged Scene Name',
            type: 'text',
            default: '',
            parentGroup: 'Scene'
        },
        'stagedSceneId': {
            id: C.Str.IdPrefix + 'staged-scene-id',
            desc: 'Staged Scene ID',
            type: 'text',
            default: '',
            parentGroup: 'Scene'
        },
        'stagedSceneNameId': {
            id: C.Str.IdPrefix + 'staged-scene-name-id',
            desc: 'Staged Scene Name & ID',
            type: 'text',
            default: '',
            parentGroup: 'Scene'
        },
        'sceneIsStaged': {
            id: C.Str.IdPrefix + 'scene-is-staged',
            desc: 'Is There a Scene Staged',
            type: 'choice',
            default: 'No',
            valueChoices:  [
                'No',
                'Yes'
            ] 
        },
    }
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
            this.tp.logIt("DEBUG", "Something changed in the session");
            this.buildSceneIdx();
        });
        this.buildSceneIdx();
    }
    handleAction(message: any) {
        const scene = this.sceneIdx[message.data[0].value];
        if (!scene) {
            return;
        }
        if (this.$MS?.meld?.setStagedScene) {
            this.tp.logIt("DEBUG","Does this even work");
            this.$MS.meld.setStagedScene(scene);
        }
    }
    buildSceneIdx() {
        this.sceneIdx = {};
        let foundStaged = false;
        let newScene = false;
        utils.getItemsByType(this.$MS, 'scene', null).forEach((item: any) => {
            const key = item.name + ' - ' + item.value;
            if( !this.sceneIdx[key] ) {
                newScene = true;
            }
            this.sceneIdx[key] = item.value;
            // Only run the state update to TouchPortal if we actually
            // have a change in scene.
            if (item.data.staged && this.stagedSceneId !== key) {
                foundStaged = true;
                this.updateStagedSceneStates(key, item,'Yes');
                this.stagedSceneId = key;
            }
        });
        if( !foundStaged ) {
            this.updateStagedSceneStates("", {"value":"","name":""}, 'No');
            this.stagedSceneId = "";
        }
        if( newScene ) {
            this.tp.choiceUpdate(this.tpAction.data.sceneList.id, this.tpAction.data.sceneList.valueChoices());
        }
    }
    updateStagedSceneStates(key: string, item: any, isStaged: string) {
        const states = [
            {
                id: this.tpStates.stagedScene.id,
                value: item.name
            },
            {
                id: this.tpStates.stagedSceneId.id,
                value: item.value
            },
            {
                id: this.tpStates.stagedSceneNameId.id,
                value: key
            },
            {
                id: this.tpStates.sceneIsStaged.id,
                value: isStaged
            }
        ]
        if( this.tp.stateUpdateMany ) {
            this.tp.stateUpdateMany(states);
        }
    }
}