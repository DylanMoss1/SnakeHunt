class serverPlayer{

	constructor(playerPack){
		this.id = playerPack.id;
		this.socket = playerPack.socket;
		this.mainId = playerPack.mainId;
		this.posId = playerPack.posId;
		this.name = playerPack.name;

		this.initChain = [{x:playerPack.pos.x,y:playerPack.pos.y}];
		this.initx = playerPack.pos.x;
		this.inity = playerPack.pos.y;
		this.initMove = playerPack.move;
		
		this.chain = [...this.initChain];
		this.x = this.initx;
		this.y = this.inity;

		this.nextx = null;
		this.nexty = null;
		this.headColour = playerPack.colour + playerPack.colour;
		this.mainColour = playerPack.colour;
		this.dead = false;
		this.newDead = false;
		this.steps = 1;
		this.prevMove = null;
		this.currentMove = this.initMove;

		this.inGame = false;
		this.score = 0;
	}

	newInitPos(pos){
		this.initChain = [{x:pos.x,y:pos.y}];
		this.initx = pos.x;
		this.inity = pos.y;
		this.reset();
	}

  	reset(){
  		this.chain = [...this.initChain];
		this.x = this.initx;
		this.y = this.inity;
		this.nextx = null;
		this.nexty = null;
		this.dead = false;
		this.newDead = false;
		this.steps = 1;
		this.prevMove = null;
		this.currentMove = this.initMove;
  	}

	resetPos(){   //// Needed? <<-------
		this.nextx = null;
		this.nexty = null;
	}

	move(gameGrid,playerList){
		this.collisionCheck(this.currentMove,gameGrid.gridSize,playerList);
		this.addNewBlock();
	}

	collisionCheck(key,gridSize,playerList){
		this.boundaryCheck(key,gridSize);
		this.playerCheck(playerList);
	}

	boundaryCheck(key,gridSize){
		if(key == "up" && this.prevMove != "down"){
			this.up(gridSize);
		} else if(key == "left" && this.prevMove != "right"){
			this.left(gridSize);
		} else if(key == "down" && this.prevMove != "up"){
			this.down(gridSize);
		} else if(key == "right" && this.prevMove != "left"){
			this.right(gridSize);
		} else if(this.prevMove == "up"){
			this.up(gridSize);
		} else if(this.prevMove == "left"){
			this.left(gridSize);
		} else if(this.prevMove == "down"){
			this.down(gridSize);
		} else if(this.prevMove == "right"){
			this.right(gridSize);
		}
	}

	up(gridSize){
		if(this.y != 0){
			this.nextx = this.x;
			this.nexty = this.y - 1;
		} else {
			this.playerDead();
		}
		this.prevMove = "up";
	}

	left(gridSize){
		if(this.x != 0){
			this.nexty = this.y;
			this.nextx = this.x - 1;
		} else {
			this.playerDead();
		}
		this.prevMove = "left";
	}

	down(gridSize){
		if(this.y != gridSize - 1){
			this.nextx = this.x;
			this.nexty = this.y + 1;
		} else {
			this.playerDead();
		}
		this.prevMove = "down";
	}

	right(gridSize){
		if(this.x != gridSize - 1){
			this.nexty = this.y;
			this.nextx = this.x + 1;
		} else {
			this.playerDead();
		}
		this.prevMove = "right";
	}


	playerCheck(playerList){
		let pos = {x:this.nextx,y:this.nexty};
		let otherPos;
		for(let players of playerList){
			for(let oldPos of players.chain){
				if(oldPos.x == pos.x && oldPos.y == pos.y){
					this.playerDead();
				}
			}
			if(players.nextx){
				if(this.id != players.id){
					otherPos = {x:players.nextx,y:players.nexty}
					if(otherPos == pos){
						this.playerDead();
					}
				}
			}
			if(!this.dead){
				this.x = this.nextx;
				this.y = this.nexty;
			}
		}
	}

	addNewBlock(){
		if(!this.dead){
			if(this.steps % 5 == 0){
				this.steps = 1;
			} else{
				this.steps++;
				this.chain.shift();
			}
			this.chain.push({x:this.x,y:this.y})
		}
	}

	updateGrid(){
		return {
			dead:this.dead,
			headColour:this.headColour,
			mainColour:this.mainColour,
			chain:this.chain,
			pos:{x:this.x,y:this.y},
		}
	}

	playerDead(){
		this.newDead = true;
		this.dead = true;
		this.socket.emit("playerDead");
	}
}

module.exports = serverPlayer;
