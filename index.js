var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs = require('fs');
var system = require('child_process');

var file = {
	save: function(name,text){
		fs.writeFile(name,text,e=>{
			if(e) console.log(e);
		});
	},
	read: function(name,callback){
		fs.readFile(name,(error,buffer)=>{
			if (error) console.log(error);
			else callback(buffer.toString());
		});
	}
}

class client{
	static all = [];
	constructor(socket){
		this.socket = socket;
		this.name = null;
		this.tiles = [];
		client.all.push(this);
		socket.on('disconnect',e=>{
			let index = client.all.indexOf(this);
			if(index != -1){
				client.all.splice(index,1);
			}
		});
	}
	emit(name,dat){
		this.socket.emit(name,dat);
	}
}

const port = 80;
const path = __dirname+'/';

app.use(express.static(path+'site/'));
app.get(/.*/,function(request,response){
	response.sendFile(path+'site/');
});

http.listen(port,()=>{console.log('Serving Port: '+port)});

io.on('connection',socket=>{
	var c = new client(socket);
	socket.on('calcMove',fen=>{
		getBestMove(fen).then(move=>{
			socket.emit('move',move);
		});
	});
});

async function getBestMove(fen){
	var stockfish = system.spawn('stockfish');
	var output = "";
	stockfish.stdout.on('data',data=>{
		output = data.toString();
		// console.log(output);
	});
	stockfish.stdin.write('isready\n');
	await wait();
	stockfish.stdin.write(`position fen ${fen} \n`);
	stockfish.stdin.write(`go\n`);
	await wait(5000);
	try{
		stockfish.stdin.write(`stop\n`);
	} catch(e) {}
	await wait(50);
	stockfish.kill('SIGINT');
	let move = output.split(' ');
	move = move.includes('ponder') ? move[move.length-3] : move[move.length-1];
	return move.toUpperCase();
}

function wait(milli=1){
	return new Promise((res,rej)=>{
		setTimeout(e=>{
			res();
		},milli);
	});
}