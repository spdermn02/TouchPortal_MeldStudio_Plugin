import * as C from '../consts';
import TpAction from '../touchPortal/tpAction';

export default class VolumeStepper extends TpAction {
    tpAction: any = {
        id: C.Str.IdPrefix + 'volume-stepper',
        name: "Volume Stepper",
        lineFormat: "Volume Stepper",
        enabled: false
    }
    tpConnectorId: string = this.getTpActionId() + '-connector';
    trackInfo: any = {};
    //tpStates: Array<any> = [
    //    {}
    //];
    meldId: string = "";
    meld: any = null;
    tp: any = null;
    connectors: Array<any> = [];
    constructor( $MS: any, TPClient: any) {
        super();
        this.meld = $MS;
        this.tp = TPClient;
        this.initialize();
    }
    initialize() {
        this.tp.on('Action', (message: any, isHeld: boolean = false) => {
            if( this.compareActionId(message.actionId) ) {
                this.handleAction(message,isHeld);
            }
        });
        this.tp.on('ConnectorChange', (message: any) => {
            if( message.connectorId == this.tpConnectorId ) {
                this.handleConnectorChange(message);
            }
        });
        this.meld.on('gainChanged',({ trackId, gain, muted }) => {
            this.handleGainChange(trackId, gain, muted);
        });
    }
    handleAction(message: any, isHeld: boolean = false) {
        console.log(message);
        if( isHeld ) {
            this.meld.volumeUp();
        } else {
            this.meld.volumeDown();
        }
    }
    handleConnectorChange(message: any) {
        let track = message.data[0].value;
        if( track == null ) {
            return;
        }
        let newVol = parseInt(message.value,10);
        newVol = newVol > 100 ? 100 : newVol;
        newVol = newVol < 0 ? 0 : newVol;
    }
    handleGainChange(trackId: string, gain: number, muted: boolean) {
        console.log(trackId, gain, muted);
        // this.tp.updateState(this.tpStates[0].id, gain);
        
        // let info = this.trackInfo[trackId];
        //     info = { ...info, gain, muted };
        //     this.trackInfo[trackId] = info;
      
        //     for (const conn in this.connectors) {
        //         if (!track || conn.trackId != track) return;
        //         this.setGainAndMute(conn, metertype, info);
        //     }
        //     this.forAllContexts((context, { track, metertype }) => {
        //       });
    }
    
}