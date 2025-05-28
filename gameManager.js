import { Bodies, Body, Engine, Events, Render, Runner, World, Composite, Matter, Query } from "matter-js";
import { FRUITS_BASE, FRUITS_HLW } from "./fruits";

export class GameManager {
  constructor(theme = "base") {
    this.THEME = theme;
    this.FRUITS = theme === "halloween" ? FRUITS_HLW : FRUITS_BASE;
    this.score = 0;
    this.engine = Engine.create();
    this.world = this.engine.world;
    this.disableAction = false;
    this.interval = null;
    this.currentBody = null;
    this.currentFruit = null;
    this.nextFruit = null;

    this.initUI();
    this.setupWorld();
    this.setupRender();
    this.setupEvents();
    this.addFruit();
  }

  initUI() {
    this.scoreElement = document.createElement("div");
    this.scoreElement.id = "score";
    this.scoreElement.style = "position: absolute; top: 10px; left: 10px; font-size: 24px; font-weight: bold; color: #333";
    this.scoreElement.innerText = "Score: 0";
    document.body.appendChild(this.scoreElement);

    this.nextCanvas = document.createElement("canvas");
    this.nextCanvas.id = "next-fruit";
    this.nextCanvas.width = 100;
    this.nextCanvas.height = 100;
    this.nextCanvas.style = "position: absolute; top: 10px; right: 20px; border-radius: 10px;";
    document.body.appendChild(this.nextCanvas);
  }

  setupWorld() {
    this.topLine = Bodies.rectangle(310, 150, 620, 2, {
      name: "topLine",
      isStatic: true,
      isSensor: true,
      render:{fillStyle: "#E69DB8"}
    });
  
    const wallColor = "#FFD0C7";

    const walls = [
      Bodies.rectangle(15, 395, 30, 790, {
        isStatic: true,
        render: { fillStyle: wallColor }
      }),
      Bodies.rectangle(605, 395, 30, 790, {
        isStatic: true,
        render: { fillStyle: wallColor }
      }),
      Bodies.rectangle(310, 820, 620, 60, {
        isStatic: true,
        render: { fillStyle: wallColor }
      }),
      this.topLine
    ];
  
    World.add(this.world, walls);
  }
  

  setupRender() {
    Render.run(Render.create({
      engine: this.engine,
      element: document.body,
      options: {
        wireframes: false,
        background: "#FFFECE",
        width: 620,
        height: 850,
      }
    }));
    Runner.run(this.engine);
  }

  setupEvents() {
    Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) {
        this.handleCollision(pair);
      }
    });
  
    Events.on(this.engine, "afterUpdate", () => {
      if (this.disableAction) return;
  
      const fruitBodies = Composite.allBodies(this.world).filter(body => body.index !== undefined);
  
      for (const fruit of fruitBodies) {
        const collisions = Query.collides(fruit, [this.topLine]);
        if (collisions.length > 0) {
          this.showGameOver();
          break;
        }
      }
    });
  
    window.onkeydown = (e) => this.handleKeyDown(e);
    window.onkeyup = (e) => this.handleKeyUp(e);
  }
  

  getRandomFruit() {
    const index = Math.floor(Math.random() * 5);
    return { ...this.FRUITS[index], index };
  }

  drawNextFruit() {
    const ctx = this.nextCanvas.getContext("2d");
    const fruit = this.nextFruit;
    if (!ctx || !fruit) return;

    const img = new Image();
    img.src = `${fruit.name}.png`;
    img.onload = () => {
      ctx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
      const size = fruit.radius * 2;
      ctx.drawImage(img, this.nextCanvas.width / 2 - size / 2, this.nextCanvas.height / 2 - size / 2, size, size);
    };
  }

  addFruit() {
    if (!this.nextFruit) this.nextFruit = this.getRandomFruit();

    this.currentFruit = this.nextFruit;
    this.currentBody = Bodies.circle(300, 50, this.currentFruit.radius, {
      index: this.currentFruit.index,
      isSleeping: true,
      render: {
        sprite: { texture: `${this.currentFruit.name}.png` }
      },
      restitution: 0.2,
    });

    World.add(this.world, this.currentBody);
    this.nextFruit = this.getRandomFruit();
    this.drawNextFruit();
  }

  updateScore(points) {
    this.score += points;
    this.scoreElement.innerText = `Score: ${this.score}`;
  }

  handleCollision(pair) {
    const { bodyA, bodyB } = pair;

    if (bodyA.index === bodyB.index) {
      const index = bodyA.index;
      if (index < this.FRUITS.length - 1) {
        World.remove(this.world, [bodyA, bodyB]);
        const newFruit = this.FRUITS[index + 1];
        const merged = Bodies.circle(pair.collision.supports[0].x, pair.collision.supports[0].y, newFruit.radius, {
          render: { sprite: { texture: `${newFruit.name}.png` } },
          index: index + 1
        });
        World.add(this.world, merged);
        this.updateScore(2 ** index);
      }
    }

    if (!this.disableAction && (bodyA.name === "topLine" || bodyB.name === "topLine")) {
      this.showGameOver();
    }
  }

  showGameOver() {
    this.disableAction = true;
    const overlay = document.createElement("div");
    overlay.id = "game-over";
    overlay.style = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 1000;
    `;
    overlay.innerHTML = `
      <div style="background: white; padding: 40px; border-radius: 10px; text-align: center;">
        <h1>Game Over</h1>
        <p>Your Score: <strong>${this.score}</strong></p>
        <button id="restart-btn">Play Again</button>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById("restart-btn").onclick = () => this.restartGame();
  }

  restartGame() {
    World.clear(this.world, false);
    this.setupWorld();

    this.score = 0;
    this.updateScore(0);
    this.disableAction = false;
    this.currentBody = null;
    this.currentFruit = null;
    this.nextFruit = null;

    const overlay = document.getElementById("game-over");
    if (overlay) overlay.remove();

    this.addFruit();
  }

  handleKeyDown(event) {
    if (this.disableAction) return;

    switch (event.code) {
      case "KeyA":
        if (!this.interval) {
          this.interval = setInterval(() => {
            if (this.currentBody.position.x - this.currentFruit.radius > 30)
              Body.setPosition(this.currentBody, {
                x: this.currentBody.position.x - 1,
                y: this.currentBody.position.y
              });
          }, 5);
        }
        break;
      case "KeyD":
        if (!this.interval) {
          this.interval = setInterval(() => {
            if (this.currentBody.position.x + this.currentFruit.radius < 590)
              Body.setPosition(this.currentBody, {
                x: this.currentBody.position.x + 1,
                y: this.currentBody.position.y
              });
          }, 5);
        }
        break;
      case "KeyS":
        this.currentBody.isSleeping = false;
        this.disableAction = true;
        setTimeout(() => {
          this.addFruit();
          this.disableAction = false;
        }, 1000);
        break;
    }
  }

  handleKeyUp(event) {
    if (event.code === "KeyA" || event.code === "KeyD") {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
