export default class TpAction {
    tpFormat: string = '';
    tpActionId: string = '';
    tpStates: any = {};
    constructor() {
    }
    getTpFormat() {
        return this.tpFormat;
    }
    getTpActionId() 
    {
        return this.tpActionId;
    }
    getTpStates() {
        return this.tpStates;
    }
    
}