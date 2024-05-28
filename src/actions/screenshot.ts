import * as C from '../consts';

class Screenshot {
    tpActionId: string = C.Str.IdPrefix + 'screenshot';
    tpHoldable: boolean = false;
    tpStates: Array<any> = [
        {}
    ];
    meldId: string = "co.meldstudio.events.screenshot";
    $MS: any = null;
    tp: any = null;
    connectors: Array<any> = [];
    constructor( $MS: any, TPClient: any) {
        this.$MS = $MS;
        this.tp = TPClient;
        this.initialize();
    }
    initialize() {
        this.tp.on('Action', (message: any) => {
            if( message.actionId == this.tpActionId ) {
                this.handleAction();
            }
        });
    }
    handleAction() {
        this.$MS.meld.sendEvent(this.meldId);
    }
}