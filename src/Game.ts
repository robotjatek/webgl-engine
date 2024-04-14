import { mat4, vec2, vec3 } from 'gl-matrix';
import { Camera } from './Camera';
import { Environment } from './Environment';
import { KeyHandler } from './KeyHandler';
import { Level } from './Level';
import { gl, WebGLUtils } from './WebGLUtils';
import { Hero } from './Hero';
import { Keys } from './Keys';
import { CoinObject } from './CoinObject';
import { LevelEnd } from './LevelEnd';
import { SlimeEnemy } from './SlimeEnemy';
import { SoundEffectPool } from './SoundEffectPool';

// TODO: update ts version
// TODO: render bounding boxes in debug mode
// TODO: text rendering
// TODO: texture map padding
export class Game {
  private Width: number;
  private Height: number;
  private Canvas: HTMLCanvasElement;
  private KeyHandler: KeyHandler;
  private start: number;
  private level: Level;
  private projectionMatrix = mat4.create();
  private camera = new Camera(vec3.create());

  private hero: Hero;
  private coins: CoinObject[] = [];
  private levelEnd: LevelEnd;
  private paused: boolean = false;
  private enemy: SlimeEnemy;
  private levelEndOpenSoundEffect = SoundEffectPool.GetInstance().GetAudio('audio/bell.wav', false);
  private levelEndSoundPlayed = false;

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
    this.start = performance.now();

    this.levelEnd = new LevelEnd(vec3.fromValues(58, Environment.VerticalTiles - 4, 0));
    this.RestartLevel();
  }

  private InitEnemy() {
    this.enemy = new SlimeEnemy(
      vec3.fromValues(25, Environment.VerticalTiles - 5, 1),
      vec2.fromValues(3, 3),
      this.level.MainLayer,
      () => this.enemy = null);
  }

  private InitHero() {
    this.hero = new Hero(vec3.fromValues(0, Environment.VerticalTiles - 5, 1), vec2.fromValues(3, 3), this.level.MainLayer,
      () => this.RestartLevel());
  }

  private InitCoins() {
    this.coins = [];
    this.coins.push(new CoinObject(vec3.fromValues(10, 10, 0)));
    this.coins.push(new CoinObject(vec3.fromValues(12, 10, 0)));
    this.coins.push(new CoinObject(vec3.fromValues(14, Environment.VerticalTiles - 3, 0)));
    this.coins.push(new CoinObject(vec3.fromValues(15, Environment.VerticalTiles - 3, 0)));
    this.coins.push(new CoinObject(vec3.fromValues(16, Environment.VerticalTiles - 3, 0)));

    this.coins.push(new CoinObject(vec3.fromValues(30, Environment.VerticalTiles - 3, 0)));
    this.coins.push(new CoinObject(vec3.fromValues(31, Environment.VerticalTiles - 3, 0)));
    this.coins.push(new CoinObject(vec3.fromValues(32, Environment.VerticalTiles - 3, 0)));

    this.coins.push(new CoinObject(vec3.fromValues(50, Environment.VerticalTiles - 3, 0)));
    this.coins.push(new CoinObject(vec3.fromValues(51, Environment.VerticalTiles - 3, 0)));
    this.coins.push(new CoinObject(vec3.fromValues(52, Environment.VerticalTiles - 3, 0)));
  }

  public Run(): void {
    const end = performance.now();
    const elapsed = Math.min(end - this.start, 32);
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
    this.level.Draw(this.projectionMatrix, this.camera.ViewMatrix);
    this.coins.forEach(coin => {
      coin.Draw(
        this.projectionMatrix,
        this.camera.ViewMatrix
      );
      coin.Update(elapsedTime);
    });

    this.hero.Draw(this.projectionMatrix, this.camera.ViewMatrix);
    if (this.enemy) {
      this.enemy.Draw(this.projectionMatrix, this.camera.ViewMatrix);
    }
    this.levelEnd.Draw(this.projectionMatrix, this.camera.ViewMatrix);

    requestAnimationFrame(this.Run.bind(this));
  }

  private Update(elapsedTime: number): void {
    this.level.PlayMusic(0.5); // TODO: hack because file loading is async...
    this.hero.Update(elapsedTime);

    // Remove colliding coin from the list
    const collidingCoins = this.coins.filter(c => c.IsCollidingWidth(this.hero.BoundingBox));
    collidingCoins.forEach(c => c.Interact(this.hero));
    this.coins = this.coins.filter((coin) => !coin.IsCollidingWidth(this.hero.BoundingBox))

    this.CheckForEndCondition();

    if (this.KeyHandler.IsPressed(Keys.A)) {
      this.hero.MoveLeft(0.01, elapsedTime);
    } else if (this.KeyHandler.IsPressed(Keys.D)) {
      this.hero.MoveRight(0.01, elapsedTime);
    }

    if (this.KeyHandler.IsPressed(Keys.SPACE)) {
      this.hero.Jump();
    }

    if (this.KeyHandler.IsPressed(Keys.S)) {
      this.hero.Stomp();
    }

    if (this.enemy) {
      this.enemy.Update(elapsedTime);
      if (this.enemy.IsCollidingWidth(this.hero.BoundingBox)) {
        this.hero.Collide(this.enemy, elapsedTime);
      }
    }

    this.camera.LookAtPosition(vec3.clone(this.hero.Position), this.level.MainLayer);
  }

  private CheckForEndCondition() {
    this.levelEnd.IsEnabled = this.coins.length === 0 && this.enemy === null;
    if (this.levelEnd.IsEnabled && !this.levelEndSoundPlayed) {
      this.levelEndOpenSoundEffect.Play();
      this.levelEndSoundPlayed = true;
    }

    if (this.levelEnd.IsCollidingWidth(this.hero.BoundingBox)) {
      if (this.levelEnd.IsEnabled) {
        this.paused = true;
        this.level.SetMusicVolume(0.25);
      }

      this.levelEnd.Interact(this.hero, () => {
        this.RestartLevel();
      });
    }
  }

  private RestartLevel() {
    this.InitCoins();
    this.InitHero();
    this.InitEnemy();
    this.paused = false;
    this.levelEndSoundPlayed = false;
  }
}
