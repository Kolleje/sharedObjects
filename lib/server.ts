import * as http from 'http';
// import * as fs from 'fs';
import {attach} from './socket';
import * as serveStatic from 'serve-static';

const serve = serveStatic('static', { 'index': ['index.html'], /*fallthrough: false  does not work*/});
const server = http.createServer(onReq);
attach(server);
server.listen(80); 




async function onReq(req:http.IncomingMessage, res: http.ServerResponse){
	serve(req, res, (e) => {
		console.log('fallthrough', req.url, e);
		return;
		if (res.writableEnded) return;
		if (!res.headersSent) res.writeHead(404, 'text/html');
		if (res.writable)	res.end('not found');
	});
}



export {};