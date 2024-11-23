import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';

export default class TransitionStepper extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'transition-stepper',
        name: "Transition",
        lineFormat: "Transition Stepper",
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