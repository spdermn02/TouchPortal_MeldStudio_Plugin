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

// Handle CLI arguments
for (let i=2; i < process.argv.length; ++i) {
  const arg = process.argv[i];
  if (arg == "-p") targetPlatform = process.argv[++i].split(',');
}

const build = async(platform, options ) => {
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

    if( platform.toLowerCase() === "Windows" ) {
      osTarget = 'win'
      execName += '.exe'
    }
      

    if( platform == "MacOS") {
        nodeVersion = 'node20-macos-x64'
        fs.copyFileSync("./base/start.sh", `./base/${platform}/start.sh`)
    }
    if( platform == "MacOS-Arm64") {
        nodeVersion = '???'
        fs.copyFileSync("./base/start.sh", `./base/${platform}/start.sh`)
    }

    console.log("Running pkg")
    await pkg.exec([
      "--targets",
      `${packageJson.config.nodeTarget}-${osTarget}-x64`,
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
    
    let packageName = `./Installers/${packageJson.name}-${platform}-${packageJson.version}.tpp`
    if( options?.type !== undefined ) {
      packageName = `./Installers/${packageJson.name}-${platform}-${options.type}-${packageJson.version}.tpp`
    }

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
      fs.rmSync('./Installers/', { recursive : true})
      fs.mkdirSync('./Installers/')
      } catch (err) {
        console.error(err);
      }
}

const executeBuilds = function() {
  cleanInstallers()
  targetPlatform.forEach(
     p => build(p)
  )
}

executeBuilds();