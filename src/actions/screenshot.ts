import * as C from '../consts';
import TpAction from '../tpAction';

export default class Screenshot extends TpAction {
    tpActionId: string = C.Str.IdPrefix + 'screenshot';
    tpFormat: string = "Take Screenshot";
    // tpHoldable: boolean = false;
    // tpStates: Array<any> = [
    //     {}
    // ];
    // tpConnectors: Array<any> = [];
    tpAction: any = {
        name: "Take Screenshot",
        lineFormat: "Take Screenshot"
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
            if( message.actionId == this.tpActionId ) {
                this.handleAction();
            }
        });
    }
    handleAction() {
        this.$MS.meld?.sendEvent?.(this.meldId);
    }
}