import * as C from '../consts';
import { DEBUG_MODE } from '../consts';
import TpAction from '../touchPortal/tpAction';

// Meld only honours these while recording and ignores them otherwise, so presses are always sent
// rather than second-guessed from a possibly stale isRecording flag
const CHAPTER_COMMANDS: { [choice: string]: string } = {
    'Quick': 'meld.insertRecordingChapterMarker',
    'Named': 'meld.insertNamedRecordingChapterMarker'
};

export default class ChapterMarker extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'chapter-marker',
        name: "Chapter Marker",
        lineFormat: "Add {$tp_meld_studio_chapter-marker-type$} Chapter Marker to the recording",
        enabled: true,
        data: {
            'markerType': {
                id: C.Str.IdPrefix + 'chapter-marker-type',
                type: 'choice',
                default: 'Quick',
                valueChoices: Object.keys(CHAPTER_COMMANDS)
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
        // Buttons without data (or an unknown choice) add a quick marker
        const command = CHAPTER_COMMANDS[message.data?.[0]?.value] ?? CHAPTER_COMMANDS['Quick'];
        if (this.$MS?.meld?.sendCommand) {
            if (DEBUG_MODE) this.tp.logIt("DEBUG", `Sending ${command}`);
            this.$MS.meld.sendCommand(command);
        }
    }
}
