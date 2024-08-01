import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';

export default class ToggleMute extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'toggle_mute',
        name: "Toggle Mute",
        lineFormat: "Toggle Mute"
    }
    $MS: any = null;
    tp: any = null;
    constructor( $MS: any, TPClient: any) {
        super();
        this.$MS = $MS.meld;
        this.tp = TPClient;
    }
}