const AdmZip = require("adm-zip");
const path  = require("path");
const fs = require("fs");
const fse = require( "fs-extra" );
const pkg = require("pkg");
const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"))
const { exit } = require("process")

const BASE_SRC = "./base";  // source folder for icons and other meta data

// use CLI -p argument to override build target platforms
var targetPlatform = ["Windows", "MacOS"]
let targetArchitecture = ["x64", "arm64"]

// Handle CLI arguments
for (let i=2; i < process.argv.length; ++i) {
  const arg = process.argv[i];
  if (arg == "-p") targetPlatform = process.argv[++i].split(',');
  if (arg == "-a") targetArchitecture = process.argv[++i].split(',');
}

const build = async(platform, architecture, options ) => {
    const STAGING = `${BASE_SRC}/${platform}`  // temporary package build destination

    // Remove staging directory in case of leftovers, then (re)create it.
    if( fs.existsSync(STAGING) )
      fs.rmSync(STAGING, { recursive : true})
    fs.mkdirSync(STAGING)

    copyFileSync(`${BASE_SRC}/entry.tp`, `${STAGING}/`)

    // copy all icons
    const icons = fs.readdirSync(`${BASE_SRC}/icons`).filter(fn => fn.endsWith('.png'))
    icons.forEach(fn => copyFileSync(`${BASE_SRC}/icons/${fn}`, `${STAGING}/icons`));

    let osTarget = platform.toLowerCase()
    let execName = packageJson.name

    if( platform.toLowerCase() === "windows" ) {
      osTarget = 'win'
      execName += '.exe'
    }

    let node_version = packageJson.config.nodeTarget
    if( platform == "MacOS" ) {
      node_version = "node20-macos-"+architecture
      fs.copyFileSync("./base/start.sh", `./base/${platform}/start.sh`)
    }

    console.log(`Running pkg for ${node_version}-${osTarget}-${architecture}`)
    await pkg.exec([
      "--targets",
      `${node_version}-${osTarget}-${architecture}`,
      "--output",
      `${STAGING}/${execName}`,
      ".",
    ]);
    
    console.log("Running Zip File Creation")
    const zip = new AdmZip()
    zip.addLocalFolder(
      path.normalize(STAGING),
      packageJson.name
    );
    
    packageName = `./Installers/${packageJson.name}-${platform}-${architecture}-${packageJson.version}.tpp`

    zip.writeZip(path.normalize(packageName))

    console.log("Cleaning Up")
    //fs.unlinkSync(`./src/config.js`)
    fs.rmSync(`./base/${platform}`, { recursive : true})
}

const copyFileSync = function(filePath, destDir) {
    return fse.copySync(filePath, path.join(destDir, path.basename(filePath)))
}

const cleanInstallers  = () => {
    try {
      if( fs.existsSync('./Installers/') ) {
        fs.rmSync('./Installers/', { recursive : true})
      }
      fs.mkdirSync('./Installers/')
    } catch (err) {
        console.error(err);
    }
}

const executeBuilds = async function() {
  cleanInstallers()
  // for of loop for targetPlatform
  for (const platform of targetPlatform) {
    for (const architecture of targetArchitecture) {
      await build(platform, architecture );
    }
  }

}

executeBuilds();