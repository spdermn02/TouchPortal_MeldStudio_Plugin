import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';

export default class ToggleLayer extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'toggle_layer',
        name: "Toggle Layer",
        lineFormat: "Toggle Layer"
    }
    $MS: any = null;
    tp: any = null;
    constructor( $MS: any, TPClient: any) {
        super();
        this.$MS = $MS.meld;
        this.tp = TPClient;
    }
}