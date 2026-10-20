import * as C from '../consts';
import { DEBUG_MODE } from '../consts';
import TpAction from '../touchPortal/tpAction';

const MAX_CLIP_SECONDS = 90;

export default class ClipRecording extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'clip-recording',
        name: "Record Clip",
        lineFormat: "Record Clip of {$tp_meld_studio_clip-duration$} seconds (0 = max)",
        enabled: true,
        data: {
            'duration': {
                id: C.Str.IdPrefix + 'clip-duration',
                type: 'number',
                default: 0,
                minValue: 0,
                maxValue: MAX_CLIP_SECONDS,
                allowDecimals: false
            }
        }
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
                this.handleAction(message);
            }
        });
    }
    handleAction(message: any) {
        // Buttons created before the duration option existed have no data - record the max duration
        const parsed = parseFloat(message.data?.[0]?.value);
        const duration = Number.isFinite(parsed) ? Math.max(0, Math.min(MAX_CLIP_SECONDS, Math.round(parsed))) : 0;

        if (duration > 0 && this.$MS?.meld?.sendCommandWithArgs) {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", `Triggering ${duration}s clip recording`);
            this.$MS.meld.sendCommandWithArgs("meld.recordClip", [duration]);
        } else if (this.$MS?.meld?.sendCommand) {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", "Triggering max length clip recording");
            this.$MS.meld.sendCommand("meld.recordClip");
        }
    }
}
