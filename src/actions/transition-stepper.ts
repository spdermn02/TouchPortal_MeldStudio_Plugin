import * as C from '../consts';
import { DEBUG_MODE } from '../consts';
import TpAction from '../touchPortal/tpAction';
import { utils } from '../meldStudio/utils';

export default class TransitionStepper extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'transition-stepper',
        name: "Transition Stepper",
        lineFormat: "Scene Navigation: {$tp_meld_studio_transition-action$}",
        enabled: true,
        data: {
            'transitionAction': {
                id: C.Str.IdPrefix + 'transition-action',
                type: 'choice',
                default: 'Next',
                valueChoices: [
                    'Next',
                    'Previous',
                    'Show Staged'
                ]
            }
        }
    }
    // States for scene navigation
    tpStates: any = {
        'nextSceneName': {
            id: C.Str.IdPrefix + 'next-scene-name',
            desc: 'Next Scene Name',
            type: 'text',
            default: '',
            parentGroup: 'Scene'
        },
        'prevSceneName': {
            id: C.Str.IdPrefix + 'prev-scene-name',
            desc: 'Previous Scene Name',
            type: 'text',
            default: '',
            parentGroup: 'Scene'
        }
    }
    $MS: any = null;
    tp: any = null;
    scenes: Array<{ name: string, value: string, data: any }> = [];
    currentSceneIndex: number = -1;
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
            if (DEBUG_MODE) this.tp.logIt("DEBUG", "Transition stepper: Session changed");
            this.buildSceneList();
        });
    }
    buildSceneList() {
        this.scenes = [];
        this.currentSceneIndex = -1;

        // Get all scenes and sort by index (or name if no index)
        const allScenes = utils.getItemsByType(this.$MS, 'scene', null);

        // Sort scenes by their index property
        this.scenes = allScenes.sort((a: any, b: any) => {
            const indexA = a.data.index ?? 0;
            const indexB = b.data.index ?? 0;
            return indexA - indexB;
        });

        // Find current scene index
        for (let i = 0; i < this.scenes.length; i++) {
            if (this.scenes[i].data.current) {
                this.currentSceneIndex = i;
                break;
            }
        }

        // Update next/prev scene name states
        this.updateNavigationStates();
    }
    getNextSceneIndex(): number {
        if (this.scenes.length === 0) return -1;
        if (this.currentSceneIndex === -1) return 0;

        // Circular navigation
        let nextIndex = this.currentSceneIndex + 1;
        if (nextIndex >= this.scenes.length) {
            nextIndex = 0;
        }
        return nextIndex;
    }
    getPrevSceneIndex(): number {
        if (this.scenes.length === 0) return -1;
        if (this.currentSceneIndex === -1) return this.scenes.length - 1;

        // Circular navigation
        let prevIndex = this.currentSceneIndex - 1;
        if (prevIndex < 0) {
            prevIndex = this.scenes.length - 1;
        }
        return prevIndex;
    }
    updateNavigationStates() {
        const nextIndex = this.getNextSceneIndex();
        const prevIndex = this.getPrevSceneIndex();

        const nextName = nextIndex >= 0 ? this.scenes[nextIndex].name : '';
        const prevName = prevIndex >= 0 ? this.scenes[prevIndex].name : '';

        const states = [
            { id: this.tpStates.nextSceneName.id, value: nextName },
            { id: this.tpStates.prevSceneName.id, value: prevName }
        ];

        if (this.tp.stateUpdateMany) {
            this.tp.stateUpdateMany(states);
        }
    }
    handleAction(message: any) {
        const action = message.data[0].value;
        if (DEBUG_MODE) this.tp.logIt("DEBUG", `Transition stepper: Action ${action}`);

        switch (action) {
            case 'Next':
                this.stageNextScene();
                break;
            case 'Previous':
                this.stagePrevScene();
                break;
            case 'Show Staged':
                this.showStagedScene();
                break;
        }
    }
    stageNextScene() {
        const nextIndex = this.getNextSceneIndex();
        if (nextIndex < 0) return;

        const nextScene = this.scenes[nextIndex];
        if (this.$MS?.meld?.setStagedScene) {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", `Transition stepper: Staging next scene ${nextScene.name}`);
            this.$MS.meld.setStagedScene(nextScene.value);
        }
    }
    stagePrevScene() {
        const prevIndex = this.getPrevSceneIndex();
        if (prevIndex < 0) return;

        const prevScene = this.scenes[prevIndex];
        if (this.$MS?.meld?.setStagedScene) {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", `Transition stepper: Staging previous scene ${prevScene.name}`);
            this.$MS.meld.setStagedScene(prevScene.value);
        }
    }
    showStagedScene() {
        if (this.$MS?.meld?.showStagedScene) {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", "Transition stepper: Showing staged scene");
            this.$MS.meld.showStagedScene();
        }
    }
}
