
import QWC from 'qwebchannel';
import WebSocket from 'ws';
import EventEmitter from 'events';
import * as T from './meldStudio/types';
import { DEBUG_MODE } from './consts';

const CONNECT_INTERVAL: number = 10000;

// Copyright (c) 2024 Meld Studio, Inc.
// Licensed under the MIT license. See LICENSE file in the project root for details.

export default class MeldStudio extends EventEmitter {
	connected: boolean = false;
	ready: boolean = false;
	meld: T.MeldStudio = { isRecording: false, isStreaming: false };
	socket: any = {};
	channel: any = {};
	running: boolean = false;
	ipAddress: string = '127.0.0.1';
	constructor() {
        super();
		// Increase max listeners to accommodate all action modules
		this.setMaxListeners(25);
		this.connected = false;
	}

	initConnection(ipAddress: string = this.ipAddress) {
		this.ipAddress = ipAddress;
		if (!this.running) return;
		if (!this.connected) {
		  this.connect(ipAddress);
		} else {
		  if (DEBUG_MODE) console.log('MeldStudio already connected.');
		}
	}

	connect(ipAddress: string) {
		const port: number = 13376;

		this.socket = new WebSocket(`ws://${ipAddress}:${port}`);
		this.socket.on('error',() => {
			console.log('Error: Connection Refused to MeldStudio, is it running?');
		});

		this.socket.onopen = () => {
			console.log('MeldStudio Connected!'); // Always log connection status

			this.connected = true;
			this.emit('connected');

			this.channel = new QWC.QWebChannel(this.socket, (channel:any) => {
				this.meld = channel.objects.meld;

				// Debug: Log available methods and properties on meld object
				if (DEBUG_MODE) {
					console.log('[MeldStudio] Available meld object keys:', Object.keys(this.meld));
					console.log('[MeldStudio] registerTrackObserver exists:', typeof this.meld.registerTrackObserver);
					console.log('[MeldStudio] gainUpdated exists:', typeof this.meld.gainUpdated);
				}

				// Set client name to identify this plugin to Meld Studio
				if (this.meld.setClientName) {
					this.meld.setClientName('TouchPortal-MeldStudio-Plugin');
					if (DEBUG_MODE) console.log('[MeldStudio] Client name set');
				}

				this.meld.sessionChanged?.connect(() => {
					//console.log('Session Changed');
					this.emit('sessionChanged', this.meld.session);
				});

				this.meld.isStreamingChanged?.connect(() => {
					//console.log('Streaming Changed');
					this.emit('isStreamingChanged', this.meld.isStreaming);
				});

				this.meld.isRecordingChanged?.connect(() => {
					//console.log('Recording Changed');
					this.emit('isRecordingChanged', this.meld.isRecording);
				});

				this.meld.gainUpdated?.connect((trackId:string, gain:number, muted:boolean) => {
					if (DEBUG_MODE) console.log(`[MeldStudio] gainUpdated signal received - trackId: ${trackId}, gain: ${gain}, muted: ${muted}`);
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
			this.meld = {isRecording: false, isStreaming: false };

			this.emit('closed');

			if( this.running ) {
				// Retry connection after a delay
				setTimeout(() => {
					if (this.running) this.initConnection(this.ipAddress);
				}, CONNECT_INTERVAL);
			}
		};
	}

	disconnect() {
		this.running = false;
		if (this.socket?.close) this.socket.close();
	}
}