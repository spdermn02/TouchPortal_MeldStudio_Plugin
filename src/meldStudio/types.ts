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
    muted:boolean,
    gain?:number
}

export type MeldLayer = {
    type:string,
    parent:string,
    index:number,
    name:string,
    visible:boolean,
    mediaSource?:string,
    isPlaying?:boolean
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
    // API version - undefined means version 1. setProperty requires version 2
    version?:number,
    isRecording:boolean,
    isStreaming:boolean,
    session?:MeldSession,
    gainUpdated?:MeldGainUpdatedSignal,
    sessionChanged?:MeldDefaultSignal,
    isStreamingChanged?:MeldDefaultSignal,
    isRecordingChanged?:MeldDefaultSignal,
    // Client identification
    setClientName?:(name:string) => void,
    sendEvent?:(event:string) => void,
    // Scene methods
    showScene?:(sceneId:string) => void,
    showStagedScene?:() => void,
    setStagedScene?:(sceneId:string) => void,
    // Layer methods
    toggleLayer?:(sceneId:string, layerId:string) => void,
    // Effect methods
    toggleEffect?:(sceneId:string, layerId:string, effectId:string) => void,
    // Audio methods
    toggleMute?:(trackId:string) => void,
    toggleMonitor?:(trackId:string) => void,
    setGain?:(trackId:string, gain:number) => void,
    volumeUp?:() => void,
    volumeDown?:() => void,
    // Track observer methods - required for receiving gainUpdated signals
    // Note: parameter order is (context, trackId) not (trackId, context)
    registerTrackObserver?:(context:string, trackId:string) => void,
    unregisterTrackObserver?:(context:string, trackId:string) => void,
    // Recording/Streaming
    toggleRecord?:() => void,
    toggleStream?:() => void,
    // Generic property setter
    setProperty?:(objectId:string, property:string, value:any) => void,
    // Function calls for media layers
    callFunction?:(layerId:string, command:string) => void,
    callFunctionWithArgs?:(layerId:string, command:string, args:any[]) => void,
    // Command sending
    sendCommand?:(command:string) => void,
    sendCommandWithArgs?:(command:string, args:any[]) => void,
    // Stream events for widgets
    sendStreamEvent?:(type:string, data:any) => void
}
