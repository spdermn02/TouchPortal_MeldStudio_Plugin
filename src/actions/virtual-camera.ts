import * as C from '../consts';
import { DEBUG_MODE } from '../consts';
import TpAction from '../touchPortal/tpAction';

export default class VirtualCamera extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'virtual-camera',
        name: "Virtual Camera",
        lineFormat: "Toggle Virtual Camera",
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
        // Meld Studio doesn't expose virtual camera status, so this is toggle only with no state
        if (this.$MS?.meld?.sendCommand) {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", "Toggling virtual camera");
            this.$MS.meld.sendCommand("meld.toggleVirtualCameraAction");
        }
    }
}
