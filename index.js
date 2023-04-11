var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs = require('fs');
var system = require('child_process');
var mbot = require('./bot/matthias_bot.js');

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
			console.log('Calculated Move: '+move);
			socket.emit('move',move);
		});
	});
});

function getBestMove(fen){
	return new Promise((res,rej)=>{
		let board = new mbot.Board(fen);
		console.log('calculating');
		// console.log(board.toString())
		board.choosePossibilitesMULTI(4,true).then(e=>{
			console.log(e);
			res(e);
		});
	});
}

function wait(milli=1){
	return new Promise((res,rej)=>{
		setTimeout(e=>{
			res();
		},milli);
	});
}