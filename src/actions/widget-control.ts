import * as C from '../consts';
import { DEBUG_MODE } from '../consts';
import TpAction from '../touchPortal/tpAction';

export default class WidgetControl extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'widget-control',
        name: "Widget Control",
        lineFormat: ["Trigger Widget Event {$tp_meld_studio_widget-event-type$}",
            "with Amount {$tp_meld_studio_widget-amount$}"],
        enabled: true,
        data: {
            'eventType': {
                id: C.Str.IdPrefix + 'widget-event-type',
                type: 'choice',
                default: 'STOPWATCH_RESET',
                valueChoices: [
                    // Stopwatch events
                    'STOPWATCH_RESET',
                    'STOPWATCH_PAUSE',
                    'STOPWATCH_RESUME',
                    // Countdown events
                    'COUNTDOWN_RESET',
                    'COUNTDOWN_PAUSE',
                    'COUNTDOWN_RESUME',
                    // Confetti events
                    'CONFETTIFALL_TRIGGER',
                    'CONFETTIPOP_TRIGGER',
                    // Subathon Timer events
                    'SUBATHONTIMER_RESET',
                    'SUBATHONTIMER_PAUSE',
                    'SUBATHONTIMER_RESUME',
                    'SUBATHONTIMER_ADDTIME',
                    // Wheel Spin events
                    'WHEELSPIN_SPIN',
                    // Counter events
                    'COUNTER_INCREMENT',
                    'COUNTER_DECREMENT'
                ]
            },
            'amount': {
                id: C.Str.IdPrefix + 'widget-amount',
                type: 'text',
                default: '0'
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
        const eventType = message.data[0].value;
        const amountStr = message.data[1].value;
        const amount = parseInt(amountStr, 10) || 0;

        if (!this.$MS?.meld?.sendStreamEvent) {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", "sendStreamEvent not available");
            return;
        }

        if (DEBUG_MODE) this.tp.logIt("DEBUG", `Triggering widget event: ${eventType} with amount: ${amount}`);

        // Build event data based on event type
        let eventData: any = {};

        // SUBATHONTIMER_ADDTIME requires an amount parameter
        if (eventType === 'SUBATHONTIMER_ADDTIME') {
            eventData = { amount: amount };
        }

        this.$MS.meld.sendStreamEvent(eventType, eventData);
    }
}
