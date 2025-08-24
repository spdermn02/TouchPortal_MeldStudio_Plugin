
import MeldStudio from './meldStudio';
import ProcessWatcher from './processWatcher';
import TP from 'touchportal-api';
import TPSettings from './touchPortal/tpSettings';
import * as C from './consts';
import { platform } from 'process';
import path from 'path';
import fs from 'fs';


let $MS; // Where MeldStudio instance will be stored

const pw = new ProcessWatcher();
const TPClient = new TP.Client();
let actions: any = {};
let modules: Array<any> = [];
let pluginSettings: TPSettings = new TPSettings();

/*
  Dynamically import a module from a path
*/
const dynamicImportModule = async (modulePath) => {
  try {
    // Dynamically import the module specified by the path
    const module = await import(modulePath);
    TPClient.logIt('DEBUG','Successfully loaded module:', modulePath);
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
    TPClient.logIt("DEBUG", "Loading module:", jsFile);
    await dynamicImportModule(path.join(__dirname, "/actions/", jsFile));
  }
})();

/*
  When processWatcher detects the MeldStudio process is ready, we can now
  create an instance of the MeldStudio class and connect to the MeldStudio
*/
pw.on('processReady', () => {
  TPClient.logIt('DEBUG', 'Detected Meld Studio process is ready');
  $MS = new MeldStudio();
  $MS.running = true;
  $MS.on('ready', () => {
    TPClient.logIt('DEBUG', 'MeldStudio instance is ready');
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
      TPClient.logIt('DEBUG','Creating instance of', ModuleClass.name);
      let instance = new ModuleClass($MS, TPClient);
      // Create a new instance of the class
      actions[instance.constructor.name] = instance;
    }
  });
  setTimeout(() => {
    $MS.initConnection(pluginSettings.getSetting("Meld Studio Websocket IP"));
  }, 2000);
});

/*
  When processWatcher detects the MeldStudio process has terminated, we can
  now close the connection to the MeldStudio instance, and destroy listeners
*/
pw.on('processTerminated', () => {
  TPClient.logIt('INFO', 'Detected Meld Studio process has terminated');
  $MS.running = false;
  $MS.socket.close();
  TPClient.removeAllListeners('Action');
  for (const key in actions) {
    if (actions.hasOwnProperty(key)) {
      delete actions[key];
    }
  }
  $MS = null;
});

// Start the processWatcher
pw.watch(platform === 'win32' ? 'MeldStudio.exe' : 'MeldStudio');

// Handle the Settings event from TouchPortal
TPClient.on("Settings", (data:any) => {
  TPClient.logIt("DEBUG", "Settings: New Settings from Touch-Portal ");
  data.forEach((setting) => {
    let key = Object.keys(setting)[0];
    pluginSettings.setSetting(key, setting[key]);
   
    TPClient.logIt("DEBUG", "Settings: Setting received for |" + key + "|");
  });

  const includePrerelease = pluginSettings.getSetting("Allow Pre-Release of Plugin").toLowerCase() === "true";
  TPClient.checkForUpdate(C.Str.GitHubUser, C.Str.GitHubRepo, includePrerelease)

});

// Connect to the TouchPortal API
TPClient.connect({ pluginId: C.Str.PluginId });