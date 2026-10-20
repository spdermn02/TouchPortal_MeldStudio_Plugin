import * as C from '../consts';
import { DEBUG_MODE } from '../consts';
import TpAction from '../touchPortal/tpAction';

export default class ClipRecording extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'clip-recording',
        name: "Record Clip",
        lineFormat: "Record 90-second Clip",
        enabled: true
    }
    $MS: any = null;
    tp: any = null;
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
        if (this.$MS?.meld?.sendCommand) {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", "Triggering clip recording");
            this.$MS.meld.sendCommand("meld.recordClip");
        }
    }
}
