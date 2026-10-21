import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';

export default class ToggleStream extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'toggle-stream',
        name: "Go Live",
        lineFormat: "{$tp_meld_studio_stream-action$} Streaming",
        enabled: true,
        data: {
            'streamAction': {
                id: C.Str.IdPrefix + 'stream-action',
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
        'streaming': {
            id: C.Str.IdPrefix + 'streaming',
            desc: 'Streaming',
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
            if (this.compareActionId(message.actionId)) {
                this.handleAction(message);
            }
        });
        this.$MS.on('isStreamingChanged', (streaming: boolean = false) => {
            this.updateState(streaming);
        });
        this.updateState(this.$MS.meld.isStreaming);
    }
    handleAction(message: any) {
        // Buttons created before Start/Stop existed have no data - treat as Toggle
        const action = message.data?.[0]?.value ?? 'Toggle';
        if (action === 'Toggle') {
            this.$MS?.meld?.toggleStream?.();
            return;
        }
        const start = action === 'Start';
        if (this.$MS?.meld?.sendCommand) {
            this.$MS.meld.sendCommand(start ? 'meld.startStreamingAction' : 'meld.stopStreamingAction');
        } else if (start !== !!this.$MS?.meld?.isStreaming) {
            // Older Meld Studio without sendCommand - only toggle when not already in the requested state
            this.$MS?.meld?.toggleStream?.();
        }
    }
    updateState(streaming: boolean = false) {
        const value = streaming ? 1 : 0;
        this.tp.stateUpdate(this.tpStates.streaming.id, this.tpStates.streaming.valueChoices[value]);
    }
}