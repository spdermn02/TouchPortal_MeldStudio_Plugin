import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';

export default class ToggleMonitor extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'toggle_monitor',
        name: "Toggle Monitor",
        lineFormat: "Toggle Monitor"
    }
    $MS: any = null;
    tp: any = null;
    constructor( $MS: any, TPClient: any) {
        super();
        this.$MS = $MS.meld;
        this.tp = TPClient;
    }
}