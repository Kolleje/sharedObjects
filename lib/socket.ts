// const io = require('socket.io')({
// 	path: '/ws',
// 	serveClient: false,
// });

import {Server} from 'socket.io';
import * as db from './db';

const io = new Server({
	path: '/ws',
	serveClient: false,
	cookie: false,
});

function attach(server){
	io.attach(server,{
		pingInterval: 10000,
		pingTimeout: 5000,
		cookie: false
	});
}

io.on('connection', socket =>{
	console.log('socket', socket);
	new Connector(socket);
});

type Request = {
	id: string,
	f: string,
	d: any,
	url: string,
}

class Connector{
	socket: any;
	sessionId: string;
	subscriptionIds: Set<string>;
	constructor(socket){
		this.socket = socket;
		this.sessionId = socket.id;
		this.subscriptionIds = new Set();
		socket.on('request', data => this.onRequest(data));
		socket.on('disconnect', data => this.onDisconnect(data));
	}

	onDisconnect(data){
		this.subscriptionIds.forEach(db.unsubscribe);
		console.log('disconnect', data);
	}

	async onRequest(req: Request){
		let data = null;
		let status = 200;
		console.log('on request', req);
		try{
			if (req.f === 'create') data = db.createObj(req.url, req.d);
			if (req.f === 'mv') data = db.mvObj(req.url, req.d);
			if (req.f === 'subscribeProject') data = this.subscribeProject(req);
		}catch(e){
			status = 401;
			data= e?.message;
		}
		this.response(req, status, data);
	}

	response(req: Request, status: number, data: any){
		const res = {
			s: status,
			id: req.id,
			d: data
		};
		this.socket.emit('response', res);
	}

	subscribeProject(req){
		const emit = (type, data) =>{
			console.log('emit', type, data)
			this.emitUpdate(type, data);
		};
		return db.subscribeProject(req.url, emit);
	}

	emitUpdate(type:string, data:any){
		const update = {
			f: type,
			d: data
		};
		this.socket.emit('update', update);
	}

}

export {
	attach
};