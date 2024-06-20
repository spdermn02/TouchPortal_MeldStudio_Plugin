// Types Documented based on info from: 
// https://github.com/MeldStudio/streamdeck/blob/main/WebChannelAPI.md

export type MeldScene = {
    type:string,
    index:number,
    name:string,
    current:boolean,
    staged:boolean
}

export type MeldAudioTrack = {
    type:string,
    parent?:string,
    name:string,
    monitoring:boolean,
    muted:boolean
}

export type MeldLayer = {
    type:string,
    parent:string,
    index:number,
    name:string,
    visible:boolean
}

export type MeldEffect = {
    type:string,
    parent:string,
    name:string,
    enabled:boolean
}

export type MeldItems = {
    [id: string]:MeldScene|MeldAudioTrack|MeldLayer|MeldEffect
}

export type MeldSession = {
    items:MeldItems
}

export type MeldGainUpdatedSignal = {
    connect:(fn:(trackId:string,gain:number,muted:boolean) => void) => void,
}

export type MeldDefaultSignal = {
    connect:(fn:() => void) => void
}

export type MeldStudio = {
    isRecording:boolean,
    isStreaming:boolean,
    session?:MeldSession,
    gainUpdated?:MeldGainUpdatedSignal,
    sessionChanged?:MeldDefaultSignal,
    isStreamingChanged?:MeldDefaultSignal,
    isRecordingChanged?:MeldDefaultSignal,
    sendEvent?:(event:string) => void
}