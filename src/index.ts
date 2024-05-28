
import MeldStudio from './meldStudio';
import ProcessWatcher from './processWatcher';
import TP from 'touchportal-api';
import * as C from './consts';
import { platform } from 'process';
let $MS; // Where MeldStudio instance will be stored

const pw = new ProcessWatcher();
const TPClient = new TP.Client();

pw.on('processReady', () => {
    console.log('Process Ready');
    $MS = new MeldStudio();
    $MS.running = true;
    setTimeout(() => {
        $MS.initConnection();
    }, 2000);
});

pw.on('processTerminated', () => {
    console.log('Process Terminated');
    $MS.running = false;
    $MS.socket.close();
    $MS = null;
});

pw.watch(platform === 'win32' ? 'MeldStudio.exe' : 'MeldStudio');cd
TPClient.connect({ pluginId: C.Str.PluginId, updateUrl: C.Str.UpdateUrl });