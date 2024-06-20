//import * as C from '../consts';
import * as T from '../meldStudio/types';
import TpAction from '../tpAction';

export default class ToggleEffect extends TpAction {
    $MS: T.MeldStudio = { isRecording: false, isStreaming: false };
    tp: any = null;
    constructor( $MS: any, TPClient: any) {
        super();
        this.$MS = $MS.meld;
        this.tp = TPClient;
    }
}