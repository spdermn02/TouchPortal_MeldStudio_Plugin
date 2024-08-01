import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';

export default class ToggleRecord extends TpAction{
    tpAction: any = {
        id: C.Str.IdPrefix + 'toggle-record',
        name: "Toggle Record",
        lineFormat: "Toggle Recording"
    }
    $MS: any = null;
    tp: any = null;
    tpStates: any = {
        'recording': {
            id: 'recording',
            desc: 'Recording',
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
            if ( message.actionId == this.getTpActionId()) {
                this.handleAction();
            }
        });
        this.$MS.on('isRecordingChanged', (recording:boolean=false) => {
            this.updateState(recording);
        });
        this.updateState(this.$MS.meld.isRecording);
    }
    updateState(recording:boolean=false) {
        const value = recording ? 1 : 0;
        this.tp.stateUpdate( C.Str.IdPrefix + this.tpStates.recording.id, this.tpStates.recording.valueChoices[value]);
    }
    handleAction() {
        if( this.$MS?.meld?.toggleRecord ) {
            this.$MS.meld.toggleRecord();
        }
    }
}