import translate  from "translate";
// const { MET } = require("bing-translate-api");


import fs from 'fs';
import path from 'path';
import { getGlobals } from 'common-es'
const { __dirname} = getGlobals(import.meta.url)

let modules = [];

function translation(text, to) {
  if( text === undefined || text === null || text === '') { return undefined; };
  console.log('Translating ' + text + ' to ' + to);
  let result = translate(text,to);
  return result;
}

const languages = ["es", "fr", "pt", "tr", "fi", "nl", "de", "it"];

/*
  Dynamically import a module from a path
*/
const dynamicImportModule = async (modulePath) => {
  try {
    console.log("DEBUG: Attempting to load module:", modulePath);
    // Dynamically import the module specified by the path
    const module = await import('file://'+modulePath);
    console.log("DEBUG: Successfully loaded module:", modulePath);
    modules.push(module);
  } catch (error) {
    console.log("ERROR: Failed to load module:", error);
  }
};

/*
  Load all the action files in the actions folder
*/
const files = fs.readdirSync(path.join(__dirname, "../dist/actions/"));
const jsFiles = files.filter((f) => f.split(".").pop() === "js");
(async () => {
  for (const jsFile of jsFiles) {
    await dynamicImportModule(path.join(__dirname, "../dist/actions/", jsFile));
  }

  let actions = {};
  const $MS = { on: (txt, func) => {}, meld: { isRecording: false, isStreaming: false} };
  const TPClient = { on: (txt, func) => {}, choiceUpdate: (text,value) => {}, stateUpdate: (text,value) => {} };
  /*
        When the MeldStudio instance is ready, we can now create instances of the
        action classes and store them in the actions object.
      */

  for (const module of modules) {
    // Get the exported class (assuming it's the default export)
    const ModuleClass = module.default.default;
    if (typeof ModuleClass !== "function") {
      console.log("ERROR: ModuleClass is not a constructor:", ModuleClass);
      continue;
    }
    console.log("DEBUG: Creating instance of", ModuleClass.name);
    let instance = new ModuleClass($MS, TPClient);
    // Create a new instance of the class
    actions[instance.constructor.name] = instance;
  }

  // loop over actions object
  for (const action in actions) {
    for (const lang of languages) {
      let text = await translation(actions[action].getTpFormat(), lang);
      console.log(text);
    }
  }

})();
