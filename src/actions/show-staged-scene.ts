import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';

export default class StageScene extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'show-staged-scene',
        name: "Show Staged Scene",
        lineFormat: "Show Staged Scene",
        holdable: false,
        enabled: true
    }
    $MS: any = null;
    tp: any = null;
    stagedSceneId: string = '';
    sceneIdx: any = {}; // has name, value, data keys
    tpStates: any = {
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
                this.handleAction();
            }
        });
    }
    handleAction() {
        if (this.$MS?.meld?.showStagedScene) {
            this.$MS.meld.showStagedScene();
        }
    }
}