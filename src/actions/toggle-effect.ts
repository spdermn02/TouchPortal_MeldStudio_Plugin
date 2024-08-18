import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';

export default class ToggleEffect extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'toggle_effect',
        name: "Toggle Effect",
        lineFormat: "Toggle Effect",
        enabled: false
    }
    $MS: any = null;
    tp: any = null;
    constructor( $MS: any, TPClient: any) {
        super();
        this.$MS = $MS.meld;
        this.tp = TPClient;
    }
}