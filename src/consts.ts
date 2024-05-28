export const enum Str {
    PluginId = "TouchPortal.MeldStudio.Plugin",
    PluginName = "Touch Portal Meld Studio Plugin",
    PluginShortName = "Meld Studio",
    IdPrefix = "tp_meld_studio_",         // prefix used in TP IDs for actions/data/states/etc
    IdSep = "_",          // action/data ID separator character
    Default = "default",  // used in action fields TP UI to indicate a default value
    DefaultChar = 'd',    // must match first char of `Default`, used in code for quick value comparisons
    UpdateUrl = '',       // URL to check for updates
};