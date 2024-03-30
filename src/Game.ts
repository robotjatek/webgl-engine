import { mat4, vec2, vec3 } from 'gl-matrix';
import { Camera } from './Camera';
import { Environment } from './Environment';
import { KeyHandler } from './KeyHandler';
import { Level } from './Level';
import { gl, WebGLUtils } from './WebGLUtils';
import { Hero } from './Hero';
import { Keys } from './Keys';
import { CoinObject } from './CoinObject';

// TODO: update ts version
// TODO: render bounding boxes in debug mode
// TODO: text rendering
export class Game {
  private Width: number;
  private Height: number;
  private Canvas: HTMLCanvasElement;
  private KeyHandler: KeyHandler;
  private start: Date;
  private level: Level;
  private projectionMatrix = mat4.create();
  private camera = new Camera();

  private hero: Hero;
  private coins: CoinObject[] = [];
  private paused: boolean = false;

  public constructor(keyhandler: KeyHandler) {
    this.Width = window.innerWidth;
    this.Height = window.innerHeight;
    this.Canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.Canvas.width = this.Width;
    this.Canvas.height = this.Height;
    this.KeyHandler = keyhandler;

    this.projectionMatrix = mat4.ortho(
      this.projectionMatrix,
      0,
      Environment.HorizontalTiles,
      Environment.VerticalTiles,
      0,
      -1,
      1
    );
    WebGLUtils.CreateGLRenderingContext(this.Canvas);
    gl.disable(gl.DEPTH_TEST);
    gl.viewport(0, 0, this.Width, this.Height);
    gl.clearColor(0, 1, 0, 1);

    this.level = new Level('');
    this.start = new Date();

    this.coins.push(new CoinObject(vec3.fromValues(10, 10, 0)));
    this.coins.push(new CoinObject(vec3.fromValues(12, 10, 0)));

    this.coins.push(new CoinObject(vec3.fromValues(14, Environment.VerticalTiles - 3, 0)));
    this.coins.push(new CoinObject(vec3.fromValues(15, Environment.VerticalTiles - 3, 0)));
    this.coins.push(new CoinObject(vec3.fromValues(16, Environment.VerticalTiles - 3, 0)));

    // TODO: texture map padding
    this.hero = new Hero(vec3.fromValues(0, Environment.VerticalTiles - 6, 1), vec2.fromValues(3, 3), this.level.MainLayer);
  }

  public Run(): void {
    const end = new Date();
    const elapsed = end.getTime() - this.start.getTime();
    this.start = end;
    this.Render(elapsed);
    if (!this.paused) {
      this.Update(elapsed);
    }
  }

  public Pause(): void {
    this.paused = true;
  }

  public Play(): void {
    this.paused = false;
  }

  private Render(elapsedTime: number): void {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.level.Draw(this.projectionMatrix, this.camera.GetViewMatrix());
    this.coins.forEach(coin => {
      coin.Draw(
        this.projectionMatrix,
        this.camera.GetViewMatrix()
      );  
      coin.Update(elapsedTime);
    });
    
    this.hero.Draw(this.projectionMatrix, this.camera.GetViewMatrix());
    requestAnimationFrame(this.Run.bind(this));
  }

  private Update(elapsedTime: number): void {
    this.hero.Update(elapsedTime);

    const collidingCoins = this.coins.filter(c => c.IsCollidingWidth(this.hero.BoundingBox));
    collidingCoins.forEach(c => c.Interact(this.hero));
    // Remove colliding coin from the list
    this.coins = this.coins.filter((coin) => !coin.IsCollidingWidth(this.hero.BoundingBox))

    if (this.KeyHandler.IsPressed(Keys.A)) {
      this.hero.MoveLeft(elapsedTime);
    } else if (this.KeyHandler.IsPressed(Keys.D)) {
      this.hero.MoveRight(elapsedTime);
    }

    if (this.KeyHandler.IsPressed(Keys.SPACE)) {
      this.hero.Jump();
    }
  }
}
