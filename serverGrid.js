class serverGrid{

	constructor(gridSize){
		this.gridSize = gridSize;
		this.grid = this.newGrid();
	}

	newGrid(){
		let emptyGrid = [];
		for(let i=0; i < this.gridSize; i++){
			emptyGrid.push([]);
			for(let j=0; j < this.gridSize; j++){
				emptyGrid[i][j] = " ";
			}
		}
		return emptyGrid;
	}

	resetGrid(){
		this.grid = this.newGrid();
	}

	setGrid(gridValues){
		let dead = gridValues.dead;
		let headColour = gridValues.headColour;
		let mainColour = gridValues.mainColour;
		let pos = gridValues.pos;
		for(let chainPos of gridValues.chain){
			if(chainPos.x == pos.x && chainPos.y == pos.y && !dead){
				this.grid[chainPos.x][chainPos.y] = headColour;
			} else {
				this.grid[chainPos.x][chainPos.y] = mainColour;
			}
		}
	}

	addGrid(part){
		let colour = part[0];
		let pos = part[1];

		this.grid[pos.x][pos.y] = colour;
	}

	getGrid(){
		return this.grid;
	}
}

module.exports = serverGrid;