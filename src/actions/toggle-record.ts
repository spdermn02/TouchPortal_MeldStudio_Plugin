import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';

export default class ToggleRecord extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'toggle-record',
        name: "Record",
        lineFormat: "{$tp_meld_studio_record-action$} Recording",
        enabled: true,
        data: {
            'recordAction': {
                id: C.Str.IdPrefix + 'record-action',
                type: 'choice',
                default: 'Toggle',
                valueChoices: [
                    'Toggle',
                    'Start',
                    'Stop'
                ]
            }
        }
    }
    $MS: any = null;
    tp: any = null;
    tpStates: any = {
        'recording': {
            id: C.Str.IdPrefix + 'recording',
            desc: 'Recording',
            type: 'choice',
            default: 'No',
            // Used below in this order [0]/False = "No", [1]/True = "Yes"
            valueChoices: [
                'No',
                'Yes'
            ],
            parentGroup: 'Status'
        }
    };
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
        this.$MS.on('isRecordingChanged', (recording: boolean = false) => {
            this.updateState(recording);
        });
        this.updateState(this.$MS.meld.isRecording);
    }
    updateState(recording: boolean = false) {
        const value = recording ? 1 : 0;
        this.tp.stateUpdate(this.tpStates.recording.id, this.tpStates.recording.valueChoices[value]);
    }
    handleAction(message: any) {
        // Buttons created before Start/Stop existed have no data - treat as Toggle
        const action = message.data?.[0]?.value ?? 'Toggle';
        if (action === 'Toggle') {
            this.$MS?.meld?.toggleRecord?.();
            return;
        }
        const start = action === 'Start';
        if (this.$MS?.meld?.sendCommand) {
            this.$MS.meld.sendCommand(start ? 'meld.startRecordingAction' : 'meld.stopRecordingAction');
        } else if (start !== !!this.$MS?.meld?.isRecording) {
            // Older Meld Studio without sendCommand - only toggle when not already in the requested state
            this.$MS?.meld?.toggleRecord?.();
        }
    }
}