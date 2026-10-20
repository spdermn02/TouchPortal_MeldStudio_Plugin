
import MeldStudio from './meldStudio';
import ProcessWatcher from './processWatcher';
import TP from 'touchportal-api';
import TPSettings from './touchPortal/tpSettings';
import * as C from './consts';
import { setDebugMode, DEBUG_MODE, setStatesReady, STATE_INIT_DELAY_MS } from './consts';
import { stateManager } from './utils/stateManager';
import { connectorShortIds } from './utils/connectorShortIds';
import { platform } from 'process';
import path from 'path';
import fs from 'fs';
import os from 'os';


let $MS; // Where MeldStudio instance will be stored

const pw = new ProcessWatcher();
const TPClient = new TP.Client();
// Increase max listeners to accommodate all action modules
TPClient.setMaxListeners(25);
// Initialize the centralized state manager
stateManager.init(TPClient);
let actions: any = {};
let modules: Array<any> = [];
let pluginSettings: TPSettings = new TPSettings();
let stateInitTimer: NodeJS.Timeout | null = null; // Timer for state initialization delay

/*
  Dynamically import a module from a path
*/
const dynamicImportModule = async (modulePath) => {
  try {
    // Dynamically import the module specified by the path
    const module = await import(modulePath);
    if (DEBUG_MODE) TPClient.logIt('DEBUG','Successfully loaded module:', modulePath);
    modules.push(module);
  } catch (error) {
    TPClient.logIt('ERROR','Failed to load module:', error);
  }
}

/*
  Load all the action files in the actions folder
*/
const files = fs.readdirSync(path.join(__dirname, "/actions/"));
const jsFiles = files.filter(f => f.split(".").pop() === 'js');
(async () => {
  for (const jsFile of jsFiles) {
    if (DEBUG_MODE) TPClient.logIt("DEBUG", "Loading module:", jsFile);
    await dynamicImportModule(path.join(__dirname, "/actions/", jsFile));
  }
})();

// TP events the action modules listen on - removed on teardown so restarts don't stack handlers
const ACTION_TP_EVENTS = ['Action', 'ListChange', 'ConnectorChange'];
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '::1'];

let connectedIp: string | null = null; // IP the current connection management was started for
let remoteMode: boolean = false; // true when Meld Studio is on another machine (no local process to watch)

const isLocalAddress = (ipAddress: string): boolean => {
  const ip = ipAddress.trim().toLowerCase();
  if (LOOPBACK_HOSTS.includes(ip) || ip.startsWith('127.')) return true;
  const interfaces = os.networkInterfaces();
  return Object.values(interfaces).some((addrs) => addrs?.some((addr) => addr.address.toLowerCase() === ip));
};

/*
  Create a MeldStudio instance and connect to it. Action modules are created
  once per instance - socket reconnects reuse them since they read $MS.meld live
*/
const startMeldStudio = (ipAddress: string) => {
  $MS = new MeldStudio();
  $MS.running = true;
  $MS.once('ready', () => {
    if (DEBUG_MODE) TPClient.logIt('DEBUG', 'MeldStudio instance is ready');

    // IMPORTANT: Register sessionChanged coordination FIRST, before action modules
    // This ensures STATES_READY is set to false before any module processing
    $MS.on('sessionChanged', () => {
      // Block state updates while modules create their states
      setStatesReady(false);
      stateManager.clearAll(); // Clear cached values on session change
      if (DEBUG_MODE) TPClient.logIt('DEBUG', 'Session changed - blocking state updates');

      // Cancel any existing timer
      if (stateInitTimer) {
        clearTimeout(stateInitTimer);
      }

      // After delay, allow state updates (all modules should have created states by now)
      stateInitTimer = setTimeout(() => {
        setStatesReady(true);
        if (DEBUG_MODE) TPClient.logIt('DEBUG', 'State initialization complete - updates enabled');
      }, STATE_INIT_DELAY_MS);
    });

    /*
      When the MeldStudio instance is ready, we can now create instances of the
      action classes and store them in the actions object.
    */
    for (const module of modules) {
      // Get the exported class (assuming it's the default export)
      const ModuleClass = module.default;
      if (typeof ModuleClass !== 'function') {
        TPClient.logIt('ERROR','ModuleClass is not a constructor:', ModuleClass);
        continue;
      }
      if (DEBUG_MODE) TPClient.logIt('DEBUG','Creating instance of', ModuleClass.name);
      let instance = new ModuleClass($MS, TPClient);
      // Create a new instance of the class
      actions[instance.constructor.name] = instance;
    }
  });
  const ms = $MS;
  setTimeout(() => {
    // Instance may have been torn down during the delay
    if (ms === $MS) ms.initConnection(ipAddress);
  }, 2000);
};

/*
  Close the connection to the MeldStudio instance, and destroy listeners
*/
const stopMeldStudio = () => {
  if (!$MS) return;
  $MS.disconnect();
  $MS.removeAllListeners();
  ACTION_TP_EVENTS.forEach((event) => TPClient.removeAllListeners(event));
  for (const key in actions) {
    if (actions.hasOwnProperty(key)) {
      delete actions[key];
    }
  }
  if (stateInitTimer) {
    clearTimeout(stateInitTimer);
    stateInitTimer = null;
  }
  setStatesReady(false);
  stateManager.clearAll();
  $MS = null;
};

/*
  Local Meld Studio: wait for the process via processWatcher.
  Remote Meld Studio: there is no local process to watch, so connect directly
  and let MeldStudio's retry loop handle it being offline
*/
const startConnectionManagement = (ipAddress: string) => {
  connectedIp = ipAddress;
  remoteMode = !isLocalAddress(ipAddress);
  if (remoteMode) {
    TPClient.logIt('INFO', `Meld Studio Websocket IP ${ipAddress} is remote - connecting directly`);
    startMeldStudio(ipAddress);
  } else {
    // Start the processWatcher
    pw.watch(platform === 'win32' ? 'MeldStudio.exe' : 'MeldStudio');
  }
};

const stopConnectionManagement = () => {
  pw.stopWatch();
  stopMeldStudio();
  connectedIp = null;
};

/*
  When processWatcher detects the MeldStudio process is ready, we can now
  create an instance of the MeldStudio class and connect to the MeldStudio
*/
pw.on('processReady', () => {
  if (DEBUG_MODE) TPClient.logIt('DEBUG', 'Detected Meld Studio process is ready');
  if (remoteMode || connectedIp === null) return;
  startMeldStudio(connectedIp);
});

/*
  When processWatcher detects the MeldStudio process has terminated, we can
  now close the connection to the MeldStudio instance, and destroy listeners
*/
pw.on('processTerminated', () => {
  TPClient.logIt('INFO', 'Detected Meld Studio process has terminated');
  stopMeldStudio();
});

// Handle the Settings event from TouchPortal
TPClient.on("Settings", (data:any) => {
  data.forEach((setting) => {
    let key = Object.keys(setting)[0];
    pluginSettings.setSetting(key, setting[key]);
  });

  // Update debug mode based on setting
  const debugEnabled = pluginSettings.getSetting("Enable Debug Logging")?.toLowerCase() === "true";
  setDebugMode(debugEnabled);

  // Settings arrive after connecting to TP (and again on every change), so the
  // Meld connection starts here once the configured IP is known
  const ipAddress = (pluginSettings.getSetting("Meld Studio Websocket IP") || "127.0.0.1").trim();
  if (ipAddress !== connectedIp) {
    if (connectedIp !== null) {
      TPClient.logIt("INFO", `Meld Studio Websocket IP changed to ${ipAddress} - reconnecting`);
      stopConnectionManagement();
    }
    startConnectionManagement(ipAddress);
  }

  if (debugEnabled) {
    TPClient.logIt("INFO", "Debug logging enabled");
  }

  const includePrerelease = pluginSettings.getSetting("Allow Pre-Release of Plugin").toLowerCase() === "true";
  TPClient.checkForUpdate(C.Str.GitHubUser, C.Str.GitHubRepo, includePrerelease)

});

// TP sends shortIds for connector instances at connect, before Meld/action modules are ready
TPClient.on("ConnectorShortIdNotification", (message: any) => {
  connectorShortIds.set(message.connectorId, message.shortId);
  if (DEBUG_MODE) TPClient.logIt("DEBUG", `Connector shortId ${message.shortId} for ${message.connectorId}`);
});

// Handle the Info event - TouchPortal is ready
TPClient.on("Info", (_data: any) => {
  if (DEBUG_MODE) TPClient.logIt("DEBUG", "TouchPortal Info received - plugin is fully connected");
});

// Connect to the TouchPortal API
TPClient.connect({ pluginId: C.Str.PluginId });