import * as fsP from 'fs/promises';
import * as fs from 'fs';

let key = 0;
let subId = 0;

class Obj{
	id: string;
	pos: {x: number, y:number};
	size: {x: number, y:number};
	type: string;
	src: string;
	constructor(options?, key?){
		this.id = key != null ? key : getKey();
		this.pos = options?.pos || {x:0, y:0};
		this.size = options?.size || {x:30, y:30};
		this.src = options?.src;
	}
}

class Project{
	id: string;
	name: string;
	description: string;
	size: {x:number, y:number};
	background: string;
	children: Map<string, Obj>;
	constructor(options, key?){
		this.id = key != null ? key : getKey();
		this.name = options.name;
		this.size = {x:0,y:0};
		if (options.size){
			this.size.x = options.size.x;
			this.size.y = options.size.y;
		}
		this.background = options.background;
		this.description = options.description;
		this.children = new Map();
	}
}

let keyObjMap = new Map();
let keyProjKeyMap = new Map();

let projects:any = {};

projects.test = new Project({name: 'Test Project'});

function getKey(){
	return ''+(++key);
}

function getSubId(){
	return ''+(++subId);
}

function listMaps(){
	return projects;
}

function getMap(id){
	return projects[id];
}

function updateMap(id, data){
	const map = getMap(id);
	if (!map) throw new Error('not found');
	map.description = data.description;
	map.name = data.name;
	map.size = data.size;
	map.background = data.background;
}

function createMap(options, key?){
	const map = new Project(options, key);
	projects[map.id] = map;
}

function deleteMap(id){
	const map = projects[id];
	if(!map) return;
	map.children.forEach(element => {
		deleteObj(element.id);
	});
	delete projects[id];
}

const projectSubs = {};

function subscribeProject(proj, cb, requestee?){
	if (!projectSubs[proj]) projectSubs[proj] = {};
	const id = getSubId();
	projectSubs[proj][id] = cb;

	if (projects[proj]){
		projects[proj].children.forEach(element => {
			cb('create', element.id, element);
		});
	}
	return id;
}

function unsubscribe(id){
	for (const proj in projectSubs){
		if (projectSubs[proj][id]){
			delete projectSubs[proj][id];
			return;
		}
	}
}


function createObj(options: any, key?){
	const proj = options.map;
	if (!projects[proj]) throw new Error('invalid mapId');
	const project = projects[proj];
	const added = new Obj(options, key);
	project.children.set(added.id, added);
	keyObjMap.set(added.id, added);
	keyProjKeyMap.set(added.id, proj);
	callCb('create', added.id, added);
	return added.id;
}

function deleteObj(id){
	keyObjMap.delete(id);
	keyProjKeyMap.delete(id);
	for (const projId in projects){
		const project = projects[projId];
		if (project.children.has(id)){
			project.children.delete(id);
		} 
	}
	callCb('delete', id, id);
}

function callCb(type, objId: string, data?){
	const projId = keyProjKeyMap.get(objId);
	const list = projectSubs[projId];
	// console.log('callcb', type, id, data, projId, list, projectSubs)
	if (!list) return;
	for (const id in list){
		try{
			list[id](type, objId, data);
		}catch(e){}
	}
}

function mvObj(id, pos){
	if (!keyObjMap.has(id)) throw new Error('invalid id');
	if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') throw new Error('invalid pos');
	const obj = keyObjMap.get(id);
	obj.pos.x = pos.x;
	obj.pos.y = pos.y;
	callCb('mvObj', obj.id, obj.pos);
}

const tmpName = 'db_tmp.json';
const dbPath = './db';
const nameRE = /db_\d{13}\.json/;
const limit = 10;

async function save(){
	console.log('saving');
	const db = JSON.stringify({
		key,
		keyObjMap,
		projects,
		keyProjKeyMap,
	},replacer,2);
	await fsP.mkdir(dbPath, { recursive: true });
	const name = 'db_' + new Date().getTime() + '.json';
	await fsP.writeFile(dbPath + '/' + tmpName, db, 'utf8');
	await fsP.rename(dbPath + '/' + tmpName, dbPath + '/' + name);

	const dbDir = (await fsP.readdir(dbPath)).filter(name => nameRE.test(name));
	while (dbDir.length > limit){
		const toDelete = dbDir.shift();
		await fsP.unlink(dbPath + '/' + toDelete);
	}

	setTimeout(save, 10000);
}

setTimeout(save, 10000);

function load(){
	console.log(`loading db from ${dbPath}`);
	const dbDir = fs.readdirSync(dbPath).filter(name => nameRE.test(name));
	
	if (!dbDir.length) {
		console.log('no file found');
		return;
	};

	const newest = dbDir[dbDir.length-1];

	const obj = JSON.parse(fs.readFileSync(dbPath + '/' + newest).toString('utf8'), reviver);
	
	keyObjMap = new Map();
	projects = {};

	key = obj.key;
	keyProjKeyMap = obj.keyProjKeyMap;

	for (const p in obj.projects){
		createMap(obj.projects[p], p);
		// projects[p] = new Project(obj.projects[p]);
	}
	obj.keyObjMap.forEach(element => {
		element.map = keyProjKeyMap.get(element.id);
		createObj(element, element.id);
	});
}

load();

export {
	subscribeProject,
	createMap,
	listMaps,
	deleteMap,
	createObj,	
	deleteObj,
	mvObj,
	unsubscribe,
	getMap,
	updateMap,
};

//stringify map

function replacer(key, value) {
	const originalObject = this[key];
	if(originalObject instanceof Map) {
	  return {
		dataType: 'Map',
		value: Array.from(originalObject.entries()), // or with spread: value: [...originalObject]
	  };
	} else {
	  return value;
	}
  }

  function reviver(key, value) {
	if(typeof value === 'object' && value !== null) {
	  if (value.dataType === 'Map') {
		return new Map(value.value);
	  }
	}
	return value;
  }