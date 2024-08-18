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

