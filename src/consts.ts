export const enum Str {
    PluginId = "TouchPortal.MeldStudio.Plugin",
    PluginName = "Touch Portal Meld Studio Plugin",
    PluginShortName = "Meld Studio",
    IdPrefix = "tp_meld_studio_",         // prefix used in TP IDs for actions/data/states/etc
    IdSep = "_",          // action/data ID separator character
    Default = "default",  // used in action fields TP UI to indicate a default value
    DefaultChar = 'd',    // must match first char of `Default`, used in code for quick value comparisons
    GitHubUser = 'spdermn02', // GitHub user to check for updates
    GitHubRepo = 'TouchPortal_MeldStudio_Plugin', // GitHub repo to check for updates
    TPParentCategory = 'streaming' // Where in TP will this Plugin Showup
};

// Debug mode flag - set to true to enable verbose DEBUG logging
// Can also be enabled via environment variable: DEBUG_MODE=true
// Or via TouchPortal setting "Enable Debug Logging"
export let DEBUG_MODE: boolean = process.env.DEBUG_MODE === 'true' || false;

export function setDebugMode(enabled: boolean) {
    DEBUG_MODE = enabled;
}

// Optional per-layer property states (x/y/size/rotation/source/url) - off by default since
// they add several states per layer. Set via TouchPortal setting "Create Layer Property States"
export let LAYER_PROPERTY_STATES: boolean = false;

export function setLayerPropertyStates(enabled: boolean) {
    LAYER_PROPERTY_STATES = enabled;
}

// Global state readiness flag - prevents state updates until all modules have created their states
// This is set to true after a delay in index.ts once all action modules are initialized
export let STATES_READY: boolean = false;

export function setStatesReady(ready: boolean) {
    STATES_READY = ready;
}

// Delay in ms to wait after state creation before allowing updates
// Must be long enough for TouchPortal to process createState calls
export const STATE_INIT_DELAY_MS: number = 1500;

