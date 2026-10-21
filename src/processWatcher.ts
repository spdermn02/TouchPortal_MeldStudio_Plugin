import { exec }  from 'child_process';
import EventEmitter from 'events';
import { platform }  from 'process';

const LOOP_INTERVAL: number = 10000;

export default class ProcessWatcher extends EventEmitter {
  loop: any = null;
  processNames: any = {};
  constructor() {
      super();
      this.loop = null;
      this.processNames = {};
  }
  watch(processName) {
      this.processNames[processName] = { isRunning: false };
      let that = this;
      this.loop = setInterval(() => {
          that.isProcessReady(processName);
      }, LOOP_INTERVAL);
      this.isProcessReady(processName);
  }
  stopWatch(){
      clearInterval(this.loop);
      this.loop = null;
  }
  findProcess(processName:string = ""){
      return new Promise((resolve, reject) => {
          let command: string = '';
      
          if (platform === 'win32') {
            command = 'tasklist /fo csv /nh';
          } else if (platform === 'darwin' || platform === 'linux' ) {
            command = 'ps aux | grep '+processName;
          } else {
            reject(new Error('Unsupported platform'));
            return;
          }
      
          exec(command, (error, stdout) => {
            if (error) {
              reject(error);
            } else {
              const processes = platform === 'win32' ? stdout.split('\r\n').slice(1) : stdout.split('\n');
              const isRunning = processes.some(process => process.includes(processName));
              resolve(isRunning);
            }
          });
        });
  }
  async isProcessReady(processName:string = ''){
      await this.findProcess(processName).then((isRunning) => {
          if( isRunning  && this.processNames[processName]?.isRunning === false ) {
              this.emit('processReady');
          } else if( !isRunning && this.processNames[processName]?.isRunning === true) {
              this.emit('processTerminated');
          }  
          this.processNames[processName].isRunning = isRunning; 
      }).catch((error) => {
          this.emit('processError');
          console.log(error);
      });
      
  }
}