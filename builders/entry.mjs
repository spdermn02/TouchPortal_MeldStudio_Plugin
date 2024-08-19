import translate from "translate";

import * as C from "../dist/consts.js";

import * as TP from "../dist/touchPortal/tpSettings.js";

import fs from "fs";
import path from "path";
import { getGlobals } from "common-es";
import { type } from "os";
const { __dirname } = getGlobals(import.meta.url);

// read the package.json file in to a variable
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));

const languages = ["es", "fr", "pt", "tr", "fi", "nl", "de", "it"];

let modules = [];
let debug = process.argv.includes("--debug");

// we have to mock the $MS and TPClient objects for the actions to work
const $MS = {
  on: (txt, func) => {},
  meld: { isRecording: false, isStreaming: false },
};
const TPClient = {
  on: (txt, func) => {},
  choiceUpdate: (text, value) => {},
  stateUpdate: (text, value) => {},
};

function translation(text, to) {
  if (text === undefined || text === null || text === "") {
    return undefined;
  }
  if (debug) console.debug("Translating " + text + " to " + to);
  let result = translate(text, to);
  return result;
}

/*
  Dynamically import a module from a path
*/
const dynamicImportModule = async (modulePath) => {
  try {
    if (debug) console.debug("DEBUG: Attempting to load module:", modulePath);
    // Dynamically import the module specified by the path
    const module = await import("file://" + modulePath);
    if (debug) console.debug("DEBUG: Successfully loaded module:", modulePath);
    modules.push(module);
  } catch (error) {
    console.error("ERROR: Failed to load module:", error);
  }
};

const buildLineTranslations = async (action) => {
  const tpFormat = action.getTpFormat();
  if (tpFormat === undefined || tpFormat === null || tpFormat === "") {
    return undefined;
  }
  let lines = [];
  if( Array.isArray(tpFormat) ) {
    let data = [];
    for( const line of tpFormat ) {
      data.push({lineFormat: line});
    }
    lines= [
      { 
        language:"default",
        data: data
      }
    ]
  }
  else {
    lines = [
      {
        language: "default",
        data: [
          {
            lineFormat: action.getTpFormat(),
          },
        ],
      }
    ];
  }
  
  for (const lang of languages) {
    const tpFormat = action.getTpFormat();
    if( Array.isArray(tpFormat) ) {
      let data = [];
      for( const line of tpFormat ) {
        let text = await translation(line, lang);
        data.push({
          lineFormat: text,
        });
      }
      lines.push({
        language: lang,
        data: data
      });
    }
    else {
      let text = await translation(action.getTpFormat(), lang);
      lines.push({
        language: lang,
        data: [
          {
            lineFormat: text,
          },
        ],
      });
    }
  }
  return lines;
};

const buildActionData = (action) => {
  let data = [];
  for (const key in action.tpAction.data) {
    let dataElement = action.tpAction.data[key];
    let tpData = {
      id: dataElement.id,
      default: dataElement?.default,
      type: dataElement.type,
    };

    if (dataElement?.valueChoices) {
      if (typeof dataElement.valueChoices === "function") {
        tpData.valueChoices = dataElement.valueChoices();
      } else {
        tpData.valueChoices = dataElement.valueChoices;
      }
    }

    if (dataElement?.extensions) {
      tpData.extensions = dataElement.extensions;
    }
    if (dataElement?.allowDecimals) {
      tpData.allowDecimals = dataElement.allowDecimals;
    }
    if (dataElement?.minValue) {
      tpData.minValue = dataElement.minValue;
    }
    if (dataElement?.maxValue) {
      tpData.maxValue = dataElement.maxValue;
    }

    data.push(tpData);
  }
  return data;
};

const loadActionData = async () => {
  let tpStates = []; // Where we will put the entry.tp states
  let tpActions = []; // Where we will put the entry.tp actions
  let actions = {}; // where the action modules will be stored for processing
  /*
    Load all the action files in the actions folder
  */
  const files = fs.readdirSync(path.join(__dirname, "../dist/actions/"));
  const jsFiles = files.filter((f) => f.split(".").pop() === "js");

  for (const jsFile of jsFiles) {
    await dynamicImportModule(path.join(__dirname, "../dist/actions/", jsFile));
  }

  for (const module of modules) {
    // Get the exported class (assuming it's the default export)
    const ModuleClass = module.default.default;
    if (typeof ModuleClass !== "function") {
      console.error("ERROR: ModuleClass is not a constructor:", ModuleClass);
      continue;
    }
    if (debug) console.debug("DEBUG: Creating instance of", ModuleClass.name);
    let instance = new ModuleClass($MS, TPClient);
    // Create a new instance of the class
    actions[instance.constructor.name] = instance;
  }

  // loop over actions object to build the actions for the entry.tp file
  for (const action in actions) {
    let actionObj = actions[action];

    if( actionObj.tpAction.enabled === false ) {
      continue;
    }
    if (debug) console.log("DEBUG: Building TP entry for", action);
    let tpAction = {
      id: actionObj.getTpActionId(),
      name: actionObj.getTpActionName(),
      lines: {},
      type: "communicate",
    };

    for (const lang of languages) {
      let name = await translation(actionObj.getTpActionName(), lang);
      tpAction["name_" + lang] = name;
    }

    // Load to TP entry output
    tpAction.lines.action = await buildLineTranslations(actionObj);

    if (actionObj?.tpAction?.holdable) {
      tpAction.lines.onHold = await buildLineTranslations(actionObj);
    }

    if (actionObj?.tpAction?.data) {
      tpAction.data = buildActionData(actionObj);
    }

    if( actionObj?.tpStates ) {
      for( const state in actionObj.tpStates ) {
        tpStates.push(actionObj.tpStates[state]);
      }
    }

    tpActions.push(tpAction);
  }

  return [tpActions, tpStates];
};

const loadTPSettings = () => {
  const settings = new TP.default.default();
  const tpSettingsObj = settings.getTpSettings();
  let tpSettings = [];
  // for each setting in the settings object, build the settings object for the entry.tp file
  for (const setting in tpSettingsObj) {
    let settingObj = tpSettingsObj[setting];
    let tpSetting = {
      name: setting,
      ...settingObj
    };
    tpSettings.push(tpSetting);
  }
  return tpSettings;

}

const buildEntry = async () => {
  // remove ../base/entry.tp first
  fs.rmSync(path.join(__dirname, "../base/entry.tp"), { force: true });

  const entry = {
    "api": 10,
    "version": 1,
    "name": C.Str.PluginName,
    "id": C.Str.PluginId,
    "configuration": {
      "colorDark": "#05133b",
      "colorLight": "#016076",
      "parentCategory": C.Str.TPParentCategory
    },
   "plugin_start_cmd_windows": "\"%TP_PLUGIN_FOLDER%"+packageJson.name+"\\"+packageJson.name+".exe\"",
   "plugin_start_cmd_mac": "sh %TP_PLUGIN_FOLDER%"+packageJson.name+"/start.sh "+packageJson.name,
    "categories": []
  }
  const [ actions, states ] = await loadActionData();
  entry.categories[0] = {
    "id": C.Str.PluginId + "_main_category",
    "name": C.Str.PluginShortName,
    "imagepath":"%TP_PLUGIN_FOLDER%"+packageJson.name+"/icons/category-main.png",
    "actions": actions,
    "states": states
  }

  entry.settings = loadTPSettings();

  //write out a file to ../base/entry.tp containing pretty printed json of entry object
  fs.writeFileSync(path.join(__dirname, "../base/entry.tp"), JSON.stringify(entry, null, 2));
};

buildEntry();
