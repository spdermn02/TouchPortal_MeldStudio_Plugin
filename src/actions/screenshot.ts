import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';

export default class Screenshot extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'screenshot',
        name: "Take Screenshot",
        lineFormat: "Take {$tp_meld_studio_screenshot-orientation$} Screenshot",
        enabled: true,
        data: {
            'orientation': {
                id: C.Str.IdPrefix + 'screenshot-orientation',
                type: 'choice',
                default: 'Horizontal',
                valueChoices: [
                    'Horizontal',
                    'Vertical'
                ]
            }
        }
    }
    // Deprecated sendEvent id, used only when sendCommand isn't available (older Meld Studio)
    legacyMeldId: string = "co.meldstudio.events.screenshot";
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
        // Buttons created before the orientation option existed have no data - default to horizontal
        const vertical = message.data?.[0]?.value === 'Vertical';
        if (this.$MS?.meld?.sendCommand) {
            this.$MS.meld.sendCommand(vertical ? 'meld.screenshot.vertical' : 'meld.screenshot');
        } else if (!vertical) {
            this.$MS?.meld?.sendEvent?.(this.legacyMeldId);
        }
    }
}
