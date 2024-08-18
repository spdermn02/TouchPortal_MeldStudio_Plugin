export default class TPSettings {
    private tpSettings: any = {
        "Allow Pre-Release of Plugin": {
            "type": "switch",
            "default": "false",
            "tooltip": {
                "body": "Allow the update checker to notify you of pre-release versions of the plugin."
            }
        }
    }
    private settings: any = {};
    constructor() {
        // loop over allowed settings and set their default
        for (let setting in this.tpSettings) {
            this.settings[setting] = this.tpSettings[setting].default;
        }
    }
    getTpSettings() {
        return this.tpSettings
    }
    getSettings() {
        // Get All settings
        return this.settings;
    }
    getSetting(settingName: string) {
       // if requested setting is not in tp settings, return null
        if (!this.tpSettings.hasOwnProperty(settingName)) {
            return null;
        }
        return this.settings[settingName];
    }
    setSetting(settingName: string, settingValue: any) {
        // if requested setting is not in tp settings, return false
        if (!this.tpSettings.hasOwnProperty(settingName)) {
            return false;
        }
        this.settings[settingName] = settingValue;
        return true;
    }
}