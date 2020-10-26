
//Server Init 

var serverPlayer = require('./serverPlayer.js');
var serverGrid = require('./serverGrid.js');

var express = require('express');
var app = express();
var serv = require('http').Server(app); 

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});

app.use('/client',express.static(__dirname + '/client'));

app.use(express.static("public"));

serv.listen(process.env.PORT || 2000);
console.log("Server started.");

var io = require('socket.io')(serv,{});

//Init Variables ------------------------------------------------------

let playerList = [];
let gridSize = 11;

let colourList = ["R","G","B","Y","M","O","P","A"];
let posList = ["0","0","0","0","0","0","0","0"]
let basePosList = [{x:0,y:0},{x:gridSize-1,y:gridSize-1},{x:0,y:gridSize-1},{x:gridSize-1,y:0},{x:0,y:(gridSize-1)/2},{x:(gridSize-1)/2,y:gridSize-1},{x:gridSize-1,y:(gridSize-1)/2},{x:(gridSize-1)/2,y:0}];
let moveList = ["right","left","up","down","right","up","left","down"];
let availableList = ["0","0","0","0","0","0","0","0"];
 
let deadChain = [];

let playerNum = 0;
let start = false;  //true -> in game phase      false -> 
let stop = false;   //true -> in stop phase 

//Init Game ------------------------------------------------------

let gameGrid = new serverGrid(gridSize);

//Client Connection ------------------------------------------------------

io.sockets.on('connection',function(socket){
	
	socket.id = Math.random();

	socket.emit("displayColour",displayNextColour(socket.id,"right",0,false));	

	socket.on("nextColour",function(direction,pos){
		socket.emit("displayColour",displayNextColour(socket.id,direction,pos,true));
	});

	socket.on("checkName",function(username,mainId){
		let taken = false;
		let posId;
		if(username != ""){
			for(let player of playerList){
				if(player.name == username){
					taken = true;
				}
			}
			if(!taken){
				for(let i=0; i<posList.length; i++){
					if(posList[i] == "0"){
						posList[i] = "1";
						posId = i
						break;
					}
				}
				login(socket,username,mainId,posId);
			} else{
				socket.emit("enterError","dupusername");
			}
		} else{
			socket.emit("enterError","nousername");
		}
	});

	socket.on("getInputs",function(key,id){
		for(let players of playerList){
			if(players.id == id){
				if(!players.dead){
					players.currentMove = key;
				}		
			}
		}
	});

	socket.on('disconnect',function(){
		for(let i=0; i<playerList.length; i++){
			if(playerList[i].id == socket.id){
				if(start){
					for(let j=0; j<playerList[i].chain.length; j++){
						if(j == playerList[i].chain.length - 1){
							colour = playerList[i].headColour;
						} else{
							colour = playerList[i].mainColour;
						}
						deadChain.push([colour,playerList[i].chain[j]]);
					}
				}
				posList[playerList[i].posId] = "0";
				playerList.splice(i,1);
			}
		}
		for(let i=0; i<availableList.length; i++){
			if(availableList[i] == socket.id){
				availableList[i] = 0;
			}
		}
	});

	socket.on("start",function(){
		deadChain = [];
		if(!start){
			for(let players of playerList){
				players.socket.emit("restart");
			}
			start = true;
		} else if(stop){
			stop = false;
			start = false;
			gameGrid.resetGrid();
			for(let players of playerList){
				players.reset();
			}
			makeGrid();
		}

	});
});

//Login to Game -------------------------------------------------------------

function displayNextColour(id,direction,initi,alreadyThere){
	let colour = null;
	let starting = initi;
	let i;
	if(alreadyThere){
		availableList[initi] = "0";
		i = 1;
	} else{
		i = 0;
	}

	if(direction == "right"){
		for(;i<availableList.length; i++){
			if(initi + i > availableList.length - 1){
				initi = -1;
			}
			if(availableList[i+initi] == "0"){
				availableList[i+initi] = id;
				colour = colourList[i+initi];
				break;
			}
		}
	} else {
		for(;i<availableList.length; i++){
			if(initi - i < 0){
				initi = availableList.length + starting;
			}
			if(availableList[initi-i] == "0"){
				availableList[initi-i] = id;
				colour = colourList[initi-i];
				break;
			}
		}
	}

	if(colour != null){
		if(direction == "right"){
			return [initi + i, colour + colour];
		} else{
			return [initi - i, colour + colour];
		}
	} else{
		return "Error";
	}
}

function login(socket,name,mainId,posId){

	playerPack = {
		id:socket.id,
		socket:socket,
		name:name,
		colour:colourList[mainId],
		pos:basePosList[posId],
		move:moveList[posId],
		mainId:mainId,
		posId:posId,
	};

	playerList.push(new serverPlayer(playerPack));

	playerNum++;

	socket.emit("initPlayer",socket.id,start);

	makeGrid();
}

//Update Board Size --------------------------------------------------------

function updateBoardSize(){
	if(playerList.length > 2){
		newGridSize = 11 + Math.round((playerList.length - 2) / 2) * 2;
	} else{
		newGridSize = 11;
	}
	if(gridSize != newGridSize){
		gridSize = newGridSize;
		gameGrid.gridSize = gridSize;
		for(players of playerList){
			players.socket.emit("newGridSize",gridSize);
		}
		basePosList = [{x:0,y:0},{x:gridSize-1,y:gridSize-1},{x:0,y:gridSize-1},{x:gridSize-1,y:0},{x:0,y:(gridSize-1)/2},{x:(gridSize-1)/2,y:gridSize-1},{x:gridSize-1,y:(gridSize-1)/2},{x:(gridSize-1)/2,y:0}];
		for(players of playerList){
			players.newInitPos(basePosList[players.posId]);
		}
	}
}

//Update Game ---------------------------------------------------------------

function updateGame(){
	checkPlayersDead();
	if(!stop){
		movePlayers();
		makeGrid();
		updateClients();
	}	
}

function movePlayers(){
	for(let players of playerList){
		if(!players.dead && players.inGame){
			players.move(gameGrid,playerList);
		}
	}
}

function makeGrid(){
	gameGrid.resetGrid();
	for(let players of playerList){
		if(players.inGame){
			gameGrid.setGrid(players.updateGrid());
		}
		for(part of deadChain){
			gameGrid.addGrid(part);
		}	
	}		
}

function updateClients(){
	makeGrid(true);
	for(let players of playerList){
		players.socket.emit("updateGame",gridSize,gameGrid.getGrid());
		players.socket.emit("updateScore",getScore());
		players.resetPos();
	}
}

function getScore(){
	let scorePack = [];
	for(let players of playerList){
		scorePack.push([players.name,players.headColour,players.score]);
	}
	var sortedArray = scorePack.sort(function(a, b) {
  		return b[0] - a[0];
	});
	return sortedArray;
}

//Player Dead Scripts --------------------------------------------------------

function checkPlayersDead(){
	addScore();
	let numAlive = playerList.length;
	for(let players of playerList){
		if(players.dead || !players.inGame){
			numAlive--;
		}
	}
	if(numAlive <= 1){
		stop = true;
	}
}

function addScore(){
	let update = 0;
	let deadSet = [];
	let chosenPlayer;
	for(players of playerList){
		if(players.newDead){
			update++;
			deadSet.push(players);
			players.newDead = false;
		}
	}
	if(update > 0){
		for(let players of playerList){
			if(!players.dead){
				players.score += update;
			}
		}
	}	
	if(update > 1){
		for(let i=deadSet.length-1; i>0; i--){
			chosenPlayer = deadSet[Math.floor(Math.random()*(i+1))]
			chosenPlayer.score += i; 
			for(let j=0; j<deadSet.length; j++){
				if(deadSet[j]==chosenPlayer){
					deadSet.splice(j,1);
				}
			}
		}
	}
}

//Run Loop ------------------------------------------------------------------

setInterval(function(){
	if(start && !stop){
		updateGame();
	} else {
		if(!start){
			updateBoardSize();
			for(players of playerList){
				players.inGame = true;
			}
		}
		updateClients();
	}
},1000/3);