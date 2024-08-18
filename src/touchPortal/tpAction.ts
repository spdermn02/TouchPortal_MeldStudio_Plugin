export default class TpAction {
    tpAction: any = {};
    tpStates: any = {};
    
    getTpFormat(asObject:boolean = false) {
        return asObject ? { "lineFormat": this.tpAction.lineFormat } : this.tpAction.lineFormat;
    }
    getTpActionId() {
        return this.tpAction.id;
    }
    getTpActionName() {
        return this.tpAction.name;
    }
    getTpStates() {
        return this.tpStates;
    }
    compareActionId(actionId:string) {
        return this.getTpActionId() === actionId;
    }
}