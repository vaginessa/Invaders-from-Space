// Set up utility functions.
function loadImage(src) {
	var img = new Image();
	img.src = src;
	img.onerror = function(){ console.log("Failed to load image: " + src); }
	return img;
}

function collides(a, b) {
	if (a && b) {
		return a.x < b.x + b.width &&
		 a.x + a.width > b.x &&
		 a.y < b.y + b.height &&
		 a.y + a.height > b.y;
	} else { return false; }
}

function choose(array) {
	return array[Math.floor(Math.random() * array.length)];
}

Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};

function isTouchDevice() {
  return 'ontouchstart' in window || 'onmsgesturechange' in window;
};

// Set up the classes.
/**
 * The Enemy class represents the enemy objects available on-screen.
 * @constructor
 */
var Enemy = function(image, hitpoints, speed, x, y, controller) {
	this.imageSrc = image;
	this.image = loadImage(this.imageSrc);
	this.isready = false;
	
	var temp = this;
	this.image.onload = function() { temp.isReady = true; };
	
	this.hp = hitpoints;
	this.speed = speed;
	this.x = x, this.xOrigin = x;
	this.y = y, this.yOrigin = y;
	/** @const */ this.width = 12, /** @const */ this.height = 8;
	
	this.update = function() {
		this.x += speed;
		
		if (this.x >= (controller.screenWidth - 15) || this.x <= 5) {
			this.y += 3;
			speed = -speed; // Reverse direction.
		}
		
		if (this.y > controller.screenHeight - 20) {
			controller.alertGameOver();
		} 
		
		// Fire a bullet if need be. 11 is just a magic number.
		if ((Math.floor(Math.random() * 200)) == 11) {
			var bullet = new Bullet(this.x + 5, this.y + 10, -3, controller, 'enemy');
			controller.projectiles.push(bullet);
			Sound.play("InvaderBullet")
		}
	},
	
	this.draw = function() {
		if (this.isReady) controller.ctx.drawImage(this.image, this.x, this.y, 12, 8);
	}
};

/**
 * The BonusShip class represents a bonus enemy which appears on the
 * screen every so often at the start of a round. It has a 30% chance
 * of appearing and yields 500 points and more health when killed.
 * @constructor
 */
var BonusShip = function(image, speed, x, y, controller) {
	this.imageSrc = image;
	this.image = loadImage(this.imageSrc);
	this.isready = false;
	
	var temp = this;
	this.image.onload = function() { temp.isReady = true; };
	
	this.speed = speed;
	this.x = x, this.xOrigin = x;
	this.y = y, this.yOrigin = y;
	/** @const */ this.width = 12, /** @const */ this.height = 8;
	
	this.update = function() {
		this.y += speed;
		
		if (this.y > controller.screenHeight) {
			controller.destroyEnemy(this);
		}
	},
	
	this.draw = function() {
		if (this.isReady) controller.ctx.drawImage(this.image, this.x, this.y, 12, 8);
	}
}

/**
 * The Player class represents the player object on-screen.
 * @constructor
 */
var Player = function(image, hitpoints, speed, x, y, controller) {
	this.imageSrc = image;
	this.image = loadImage(this.imageSrc);
	this.isready = false;
	
	var temp = this;
	this.image.onload = function() { temp.isReady = true; };
	
	this.hp = hitpoints;
	this.speed = speed;
	this.x = x, this.xOrigin = x;
	this.y = y, this.yOrigin = y;
	/** @const */ this.width = 12, /** @const */ this.height = 8;
	
	this.update = function() {
		if (this.x < 0) {
			this.x = controller.screenWidth;
		} else if (this.x > controller.screenWidth) {
			this.x = 0;
		}
		
		if (keydown.left) this.x -= speed;
		if (keydown.right) this.x += speed;
	},
	
	this.draw = function() {
		if (this.isReady) controller.ctx.drawImage(this.image, this.x, this.y, 12, 8);
	}
};

/**
 * The Bullet class represents a bullet on-screen. A bullet belongs to either
 * the player or to an enemy. The player can only have one bullet on the
 * screen at a time; the enemies are not subject to this restriction.
 * @constructor
 */
var Bullet = function(x, y, speed, controller, sender) {
	this.x = x, this.xOrigin = x;
	this.y = y, this.yOrigin = y;
	/** @const */ this.width = 2, /** @const */ this.height = 3;
	this.speed = speed;
	this.controller = controller;
	this.sender = sender;
	
	this.update = function() {
		this.y -= this.speed;
		
		// If the bullet has moved off of the screen, remove it from the game.
		if (this.y < 0 || this.y > this.controller.screenHeight) {
			if (sender === 'player') controller.playerHasFired = false;
			controller.destroyProjectile(this);
		}
	},
	
	this.draw = function() {
		controller.ctx.fillStyle = "white";
		controller.ctx.fillRect(this.x, this.y, this.width, this.height);
	}
};

/**
 * The GameController class manages the game and controls all functions of the
 * game, such as handling key presses and scheduling the enemies to fire.
 * @constructor
 */
var GameController = function() {
	this.canvas = document.getElementById("game");
	this.screenWidth = parseInt(this.canvas.width);
	this.screenHeight = parseInt(this.canvas.height);
	this.enemies = [];
	this.projectiles = [];
	this.player = "";
	this.playerHasFired = false;
	this.score = 0;
	this.gameOver = false;
	this.isPaused = false;
	
	this.ctx = this.canvas.getContext("2d");
	
	this.setupGame = function() {
		this.loadEnemies();
		this.player = new Player("assets/Ship.png", 10, 2, (this.screenWidth / 2) - 15, this.screenHeight - 20, this);
	
		if (!isTouchDevice()) {
			window.frameId = window.setInterval(draw, 1000 / 30);
		} else {
			// Show an error message if we don't have a keyboard available.
			var image = loadImage("assets/no-mobile.jpg");
			var me = this;
			image.onload = function() {
				me.ctx.drawImage(image, (me.screenWidth / 2) - 170, 0, 340, me.screenHeight);
			};
		}
	},
	
	this.loadEnemies = function() {
		var x = 10;
		var y = 10;
		var array = ["assets/InvaderA_00.png", "assets/InvaderB_00.png", "assets/InvaderC_00.png"];
		for (var i = 0; i < 4; i += 1) {
			for (var e = 0; e < 10; e += 1) {
				var enemy = new Enemy(choose(array), 10, 1, x + (20 * e), y, this);
				this.enemies.push(enemy);
			}
			
			y += 20;
		}
		
		// Add a 30% chance of there being a bonus ship
		if (Math.floor(Math.random() * 10) <= 3) {
			var bonus = new BonusShip("assets/InvaderA_00.png", 0.5, Math.floor(this.screenWidth * Math.random()), 20, this);
			this.enemies.push(bonus);
		}
	},
	
	this.handleInput = function() {
		this.player.update();
	},
	
	this.destroyProjectile = function(p) {
		var ind = this.projectiles.indexOf(p);
		this.projectiles.remove(ind);
	},
	
	this.destroyEnemy = function(e) {
		var ind = this.enemies.indexOf(e);
		this.enemies.remove(ind);
	},
	
	this.alertGameOver = function() {
		if (!confirm("Game Over!\n\nWould you like to play again?")) {
			this.gameOver = true;
			this.paused = true;
			window.clearInterval(window.frameId);
		} else {
			location.reload();
		}
	},
	
	this.tick = function() {
		for (var i = 0; i < this.enemies.length; i++) {
			this.enemies[i].update();
		}
		
		for (var i = 0; i < this.projectiles.length; i++) {
			this.projectiles[i].update();
		}
		
		// Check if the player wants to shoot.
		if (keydown["space"] && this.playerHasFired == false && this.isPaused == false) {
			var bullet = new Bullet(this.player.x + 5, this.player.y - 3, 3, this, 'player');
			bullet.update();
			this.projectiles.push(bullet);
			this.playerHasFired = true;
			
			Sound.play("ShipBullet");
		}
		
		// Spawn a new wave of enemies when all enemies have been killed.
		if (this.enemies.length == 0) {
			this.loadEnemies();
		}
		
		// Handle collisions
		for (var i = 0; i < this.projectiles.length; i++) {
			// Check if the player's been hit.
			if (collides(this.projectiles[i], this.player)) {
				this.score = Math.max(0, this.score - 50);
				this.player.hp -= 1;
				this.destroyProjectile(this.projectiles[i]);
				
				if (this.player.hp <= 0) {
					this.alertGameOver();
				}
				
				break;
			}
			
			// Check if an enemy's been hit.
			for (var e = 0; e < this.enemies.length; e++) {
				if (collides(this.projectiles[i], this.enemies[e])) {
					var bullet = this.projectiles[i];
					
					if (bullet.sender === 'player') {
						// This should be converted to use polymorphism eventually.
						if (this.enemies[e] instanceof Enemy) {
							this.score += 100;
							Sound.play("ShipHit");
						} else if (this.enemies[e] instanceof BonusShip) {
							this.score += 500;
							this.player.hp = Math.min(10, this.player.hp + 5);
						}
						
						this.playerHasFired = false; // Let the player fire again
						this.destroyProjectile(bullet);
						this.destroyEnemy(this.enemies[e]);
					}
				}
			}
		}
	},
	
	this.renderScene = function() {
		this.ctx.fillStyle = 'black';
		this.ctx.clearRect(0, 0, this.screenWidth, this.screenHeight);
		this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
		
		for (var i = 0; i < this.enemies.length; i++) {
			this.enemies[i].draw();
		}
		
		for (var i = 0; i < this.projectiles.length; i++) {
			this.projectiles[i].draw();
		}
		
		this.player.draw();
		
		this.ctx.fillStyle = 'white';
		this.ctx.fillText(this.score, 5, 10);
		this.ctx.fillRect(0, this.screenHeight - 2, this.screenWidth * (this.player.hp / 10), 2);
	};
};

function draw() {
	var me = window.controller;
	
	me.tick();
	me.handleInput();
	me.renderScene();
}

// Do some tasks when the page loads.
(function() {
	document.getElementById("game").oncontextmenu = function(){return false};
	window.controller = new GameController();
	window.controller.setupGame();
	
	$(document).on('keypress', function(e) {
		e.preventDefault();
		if (keydown["p"] && window.controller.gameOver == false) {
			if (window.controller.isPaused) {
				console.log("unpausing");
				window.frameId = window.setInterval(draw, 1000 / 30);
				window.controller.isPaused = false;
			} else {
				console.log("pausing");
				window.clearInterval(window.frameId);
				window.controller.isPaused = true;
			}
		} else if (keydown["f"]) {
			if (!document.fullScreen) {
				if ($("#game")[0].webkitRequestFullScreen) $("#game")[0].webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT); //Chrome
				if ($("#game")[0].mozRequestFullScreen) $("#game")[0].mozRequestFullScreen(); //Firefox
			} else {
				if (document.webkitRequestFullScreen) document.webkitCancelFullScreen(); //Chrome
				if (document.mozCancelFullScreen) document.mozCancelFullScreen(); //Firefox
			}
		}
	});
})();