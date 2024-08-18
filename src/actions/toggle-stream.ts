import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';

export default class ToggleStream extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'toggle-stream',
        name: "Toggle Stream",
        lineFormat: "Toggle Streaming",
        enabled: true
    }
    $MS: any = null;
    tp: any = null;
    tpStates: any = {
        'streaming': {
            id: C.Str.IdPrefix + 'streaming',
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
            if (this.compareActionId(message.actionId) ) {
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
        this.tp.stateUpdate( this.tpStates.streaming.id, this.tpStates.streaming.valueChoices[value]);
    }
}