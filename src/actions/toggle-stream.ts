import * as C from '../consts';
//import * as T from '../meldStudio/types';
import TpAction from '../tpAction';

export default class ToggleStream extends TpAction {
    tpActionId: string = C.Str.IdPrefix + 'toggle-stream';
    tpFormat: string = 'Toggle Streaming'
    $MS: any = null;
    tp: any = null;
    tpStates: any = {
        'streaming': {
            id: 'streaming',
            desc: 'Streaming',
            type: 'choice',
            default: 'No',
            // Used below in this order [0]/False = "No", [1]/True = "Yes"
            valueChoices: [
                'No',
                'Yes'
            ]
        }
    };
    constructor( $MS: any, TPClient: any) {
        super();
        this.$MS = $MS;
        this.tp = TPClient;
        this.initialize();
    }
    initialize() {
        this.tp.on('Action', (message: any) => {
            if (message.actionId == this.tpActionId) {
                this.handleAction();
            }
        });
        this.$MS.on('isStreamingChanged', (streaming:boolean=false) => {
            this.updateState(streaming);
        });
        this.updateState(this.$MS.meld.isStreaming);
    }
    handleAction() {
        if( this.$MS?.meld?.toggleStream ) {
            this.$MS.meld.toggleStream();
        }
    }
    updateState(streaming:boolean=false) {
        const value = streaming ? 1 : 0;
        this.tp.stateUpdate( C.Str.IdPrefix + this.tpStates.streaming.id, this.tpStates.streaming.valueChoices[value]);
    }
}