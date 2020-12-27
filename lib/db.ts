let key = 0;
let subId = 0;

class Obj{
	id: string;
	pos: {x: number, y:number};
	size: {x: number, y:number};
	type: string;
	src: string;
	constructor(options?){
		this.id = getKey();
		this.pos = {x:0, y:0};
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
	constructor(options){
		this.id = getKey();
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

const keyObjMap = new Map();
const keyProjKeyMap = new Map();

const projects = {
	test: new Project({name: 'Test Project'}),
};

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

function createMap(options){
	const map = new Project(options);
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


function createObj(options: any){
	const proj = options.map;
	if (!projects[proj]) throw new Error('invalid mapId');
	const project = projects[proj];
	const added = new Obj(options);
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