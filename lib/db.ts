let key = 0;
let subId = 0;

class Obj{
	id: string;
	pos: {x: number, y:number};
	type: string;
	constructor(options){
		this.id = getKey();
		this.pos = {x:0, y:0};
	}
}

class Project{
	id: string;
	name: string;
	children: Map<string, Obj>;
	constructor(name: string){
		this.id = getKey();
		this.name = name;
		this.children = new Map();
	}
}

const keyObjMap = new Map();
const keyProjKeyMap = new Map();

const projects = {
	test: new Project('Test Project'),
};



function getKey(){
	return ''+(++key);
}

function getSubId(){
	return ''+(++subId);
}

const projectSubs = {};

function subscribeProject(proj, cb, requestee?){
	if (!projectSubs[proj]) projectSubs[proj] = {};
	const id = getSubId();
	projectSubs[proj][id] = cb;

	if (projects[proj]){
		projects[proj].children.forEach(element => {
			cb('create', element);
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


function createObj(proj, options?: any){
	if (!projects[proj]) throw new Error('invalid ProjectId');
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

function callCb(type, id, data?){
	const projId = keyProjKeyMap.get(id);
	const list = projectSubs[projId];
	console.log('callcb', type, id, data, projId, list, projectSubs)
	if (!list) return;
	for (const id in list){
		try{
			list[id](type, data);
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
	createObj,	
	deleteObj,
	mvObj,
	unsubscribe,
};