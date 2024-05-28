
import QWebChannel from 'qwebchannel';
import WebSocket from 'ws';
import EventEmitter from 'events';

const CONNECT_INTERVAL: number = 10000;

// Copyright (c) 2024 Meld Studio, Inc.
// Licensed under the MIT license. See LICENSE file in the project root for details.

export default class MeldStudio extends EventEmitter {
	connected: boolean = false;
	ready: boolean = false;
	meld: any = {};
	socket: any = {};
	channel: any = {};
	running: boolean = false;
	constructor() {
        super();
		this.connected = false;
	}

	initConnection() {
		if (!this.connected) {
		  this.connect();
		} else {
		  console.log('MeldStudio already connected.');
		}
	}

	connect(){
		const address: string = '127.0.0.1';
		const port: number = 13376;

		this.socket = new WebSocket(`ws://${address}:${port}`);
		this.socket.on('error',() => {
			console.log('Error: Connection Refused to MeldStudio, is it running?');
		});

		this.socket.onopen = () => {
			console.log('MeldStudio Connected!');

			this.connected = true;
			this.emit('connected');

			this.channel = QWebChannel.QWebChannel(this.socket, (channel: any) => {
				this.meld = channel.objects.meld;

				this.meld.sessionChanged.connect(() => {
					console.log('Session Changed');
					this.emit('sessionChanged', this.meld.session);
				});

				this.meld.isStreamingChanged.connect(() => {
					console.log('Streaming Changed');
					this.emit('isStreamingChanged', this.meld.isStreaming);
				});

				this.meld.isRecordingChanged.connect(() => {
					console.log('Recording Changed');
					this.emit('isRecordingChanged', this.meld.isRecording);
				});

				this.meld.gainUpdated.connect((trackId:string, gain:number, muted:boolean) => {
					this.emit('gainUpdated', { trackId, gain, muted });
					this.emit('gainChanged', { trackId, gain, muted });
				});

				this.ready = true;
				this.emit('ready');
				this.emit('sessionChanged', this.meld.session);
				this.emit('isStreamingChanged', this.meld.isStreaming);
				this.emit('isRecordingChanged', this.meld.isRecording);
			});
		};

		this.socket.onclose = () => {
			this.ready = false;
			this.connected = false;
			this.meld = {};

			this.emit('closed');

			if( this.running ) {
				// Retry connection after a delay
				setTimeout(() => {
					this.initConnection();
				}, CONNECT_INTERVAL);
			}
		};
	}
}