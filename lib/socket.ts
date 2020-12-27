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
	msgId: string,
	f: string,
	d: any,
	path: Array<string>;
}

const router = {
	POST: handlePost,
	GET: handleGet,
	PUT: handlePut,
	DELETE: handleDelete,
};

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
			if (req.f === 'subscribe') data = this.subscribeProject(req);
			if (req.f === 'mv') data = db.mvObj(req.path, req.d);

			if (router[req.f]) data = await router[req.f](req);
		}catch(e){
			status = 401;
			data= e?.message;
		}
		this.response(req, status, data);
	}

	response(req: Request, status: number, data: any){
		const res = {
			s: status,
			msgId: req.msgId,
			d: data
		};
		this.socket.emit('response', res);
	}

	subscribeProject(req){
		const emit = (type, id, data) =>{
			console.log('emit', type,id, data)
			this.emitUpdate(type, id, data);
		};
		const id = db.subscribeProject(req.path[1], emit);
		this.subscriptionIds.add(id);
		return id;
	}

	emitUpdate(type:string, id:string, data:any){
		const update = {
			f: type,
			d: data,
			id: id,
		};
		this.socket.emit('update', update);
	}
}

async function handlePost(req){
	if (req.path[0] === 'item') return db.createObj(req.d);
	if (req.path[0] === 'map') return db.createMap(req.d);
}

async function handleGet(req){
	if (req.path[0] === 'map' && req.path[1] != null) return db.getMap(req.path[1]);
	if (req.path[0] === 'map') return db.listMaps();
}

async function handlePut(req){
	if (req.path[0] === 'map' && req.path[1] != null) return db.updateMap(req.path[1], req.d);
}

async function handleDelete(req:Request) {
	if (req.path[0] === 'map') return db.deleteMap(req.path[1]);
	if (req.path[0] === 'item') return db.deleteObj(req.path[1]);
}

export {
	attach
};