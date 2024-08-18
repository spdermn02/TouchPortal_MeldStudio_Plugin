import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';

export default class Screenshot extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'screenshot',
        name: "Take Screenshot",
        lineFormat: "Take Screenshot",
        enabled: true
    }
    meldId: string = "co.meldstudio.events.screenshot";
    $MS: any = null;
    tp: any = null;
    constructor( $MS: any, TPClient: any) {
        super();
        this.$MS = $MS;
        this.tp = TPClient;
        this.initialize();
    }
    initialize() {
        this.tp.on('Action', (message: any) => {
            this.tp.logIt('INFO', 'Action', message);
            if( message.actionId == this.getTpActionId() ) {
                this.handleAction();
            }
        });
    }
    handleAction() {
        this.$MS.meld?.sendEvent?.(this.meldId);
    }
}