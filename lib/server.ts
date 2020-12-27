import * as http from 'http';
// import * as fs from 'fs';
import {attach} from './socket';
import * as serveStatic from 'serve-static';
import {FtpSrv} from 'ftp-srv';


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


//ftp server
const url = 'ftp://127.0.0.1:21';
// const url = 'ftp://[2a02:908:4b17:4a00::38f9]:21';
const ftpServer = new FtpSrv({url});

ftpServer.on('login', ({connection, username, password}, resolve, reject) => {
	if (username === 'ftpuser' && password === 'maptoolpw') resolve({root: './static'});
	else reject(new Error('invalid credentials'));
});

ftpServer.listen();

export {};