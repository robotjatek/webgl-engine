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
import { MeleeAttack } from './Projectiles/MeleeAttack';
import { Fireball } from './Projectiles/Fireball';
import { IProjectile } from './Projectiles/IProjectile';
import { ControllerHandler } from './ControllerHandler';
import { XBoxControllerKeys } from './XBoxControllerKeys';
import { TexturePool } from './TexturePool';
import { DragonEnemy } from './DragonEnemy';
import * as _ from 'lodash';

// TODO: recheck every vector passing. Sometimes vectors need to be cloned
// TODO: correctly dispose objects that no longer exist => delete opengl resources, when an object is destroyed
// TODO: "press start" screen
// TODO: multiple level support
// TODO: FF8 Starting Up/FF9 Hunter's Chance - for the final BOSS music?
// TODO: update ts version
// TODO: render bounding boxes in debug mode
// TODO: text rendering
// TODO: texture map padding
export class Game {
  private Width: number;
  private Height: number;
  private Canvas: HTMLCanvasElement;
  private start: number;
  private level: Level;
  private projectionMatrix = mat4.create();
  private camera = new Camera(vec3.create());

  private hero: Hero;
  private coins: CoinObject[] = [];
  private levelEnd: LevelEnd;
  private paused: boolean = false;

  // TODO: spawned objects should be in the Level object itself, not in Game.ts
  private enemies: SlimeEnemy[] = [];
  private dragons: DragonEnemy[] = [];
  private levelEndOpenSoundEffect = SoundEffectPool.GetInstance().GetAudio('audio/bell.wav', false);
  private levelEndSoundPlayed = false;

  private attack: IProjectile; // This is related to the hero
  private enemyProjectiles: IProjectile[] = [];

  public constructor(private keyHandler: KeyHandler, private gamepadHandler: ControllerHandler) {
    this.Width = window.innerWidth;
    this.Height = window.innerHeight;
    this.Canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.Canvas.width = this.Width;
    this.Canvas.height = this.Height;

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

    TexturePool.GetInstance().Preload();
    SoundEffectPool.GetInstance().Preload();

    gl.disable(gl.DEPTH_TEST);
    gl.viewport(0, 0, this.Width, this.Height);
    gl.clearColor(0, 1, 0, 1);

    this.level = new Level('');
    this.start = performance.now();

    this.levelEnd = new LevelEnd(vec3.fromValues(58, Environment.VerticalTiles - 4, 0));
    this.RestartLevel();
  }

  private InitEnemies() {
    this.dragons = [ new DragonEnemy(
      vec3.fromValues(20, Environment.VerticalTiles - 7, 1),
      vec2.fromValues(5, 5),
      this.level.MainLayer,
      this.hero, // To track where the hero is, i want to move as much of the game logic from the update loop as possible

      (sender: DragonEnemy) => { this.RemoveDragon(sender) }, // onDeath

      // TODO: spawn multiple types of projectiles
      // Spawn projectile
      (sender: DragonEnemy) => {
        const projectileCenter = sender.FacingDirection[0] > 0 ?
          vec3.add(vec3.create(), sender.CenterPosition, vec3.fromValues(-3, 1, 0)) :
          vec3.add(vec3.create(), sender.CenterPosition, vec3.fromValues(3, 1, 0));
        this.enemyProjectiles.push(new Fireball(
          projectileCenter,
          vec3.clone(sender.FacingDirection),
          (sender: Fireball) => {
            // Despawn projectile that hit
            const p = _.partition(this.enemyProjectiles, p => p != sender);
            p[1].forEach(toDispose => toDispose.Dispose());
            this.enemyProjectiles = p[0];
          },
          this.level.MainLayer));
      }
    )];

    // this.enemies = [new SlimeEnemy(
    //   vec3.fromValues(25, Environment.VerticalTiles - 5, 1),
    //   vec2.fromValues(3, 3),
    //   this.level.MainLayer,
    //   (e) => this.RemoveEnemy(e)),

    // new SlimeEnemy(
    //   vec3.fromValues(34, Environment.VerticalTiles - 5, 1),
    //   vec2.fromValues(3, 3),
    //   this.level.MainLayer,
    //   (e) => this.RemoveEnemy(e)),
    // ];
  }

  private RemoveEnemy(toRemove: SlimeEnemy): void {
    this.enemies = this.enemies.filter(e => e !== toRemove);
  }

  // TODO: merge with Remove enemy
  private RemoveDragon(toRemove: DragonEnemy): void {
    this.dragons = this.dragons.filter(e => e !== toRemove);
  }

  private InitHero() {
    this.hero = new Hero(vec3.fromValues(
      0, Environment.VerticalTiles - 5, 1),
      vec2.fromValues(3, 3),
      this.level.MainLayer,
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
    this.enemies.forEach(e => e.Draw(this.projectionMatrix, this.camera.ViewMatrix));
    // TODO: merge enemy arrays
    this.dragons.forEach(d => d.Draw(this.projectionMatrix, this.camera.ViewMatrix));
    this.levelEnd.Draw(this.projectionMatrix, this.camera.ViewMatrix);

    this.attack?.Draw(this.projectionMatrix, this.camera.ViewMatrix);
    this.attack?.Update(elapsedTime);

    this.enemyProjectiles.forEach(p => p.Draw(this.projectionMatrix, this.camera.ViewMatrix));

    requestAnimationFrame(this.Run.bind(this));
  }

  private Update(elapsedTime: number): void {
    // TODO: this is a hack because audio playback needs one user interaction before it can start. Also loading is async so I can start an audio file before its loaded
    // The later can be avoided by a press start screen, before starting the game
    // this.level.PlayMusic(0.5);

    this.hero.Update(elapsedTime);

    // Remove the colliding coin from the list
    const collidingCoins = this.coins.filter(c => c.IsCollidingWidth(this.hero.BoundingBox));
    collidingCoins.forEach(c => c.Interact(this.hero));
    this.coins = this.coins.filter((coin) => !coin.IsCollidingWidth(this.hero.BoundingBox))

    if (this.attack && !this.attack.AlreadyHit) {
      const enemiesCollidingWithProjectile = this.enemies.filter(e => e.IsCollidingWidth(this.attack.BoundingBox));
      // Pushback force does not necessarily mean the amount of pushback. A big enemy can ignore a sword attack for example
      const pushbackForce = vec3.fromValues(this.hero.FacingDirection[0] / 10, -0.005, 0);
      enemiesCollidingWithProjectile.forEach(e => e.Damage(pushbackForce));

      // TODO: merge dragon with other enemies
      const collidingDragonsWithProjectile = this.dragons.filter(e => e.IsCollidingWidth(this.attack.BoundingBox));
      collidingDragonsWithProjectile.forEach(d => d.Damage(vec3.create()));

      this.attack.AlreadyHit = true;
    }

    this.CheckForEndCondition();

    // TODO: most keypresses only affect the hero. Maybe these should be moved to there in a component
    if (this.keyHandler.IsPressed(Keys.A) ||
      this.gamepadHandler.LeftStick[0] < -0.5 ||
      this.gamepadHandler.IsPressed(XBoxControllerKeys.LEFT)) {
      this.hero.MoveLeft(0.01, elapsedTime);
    } else if (this.keyHandler.IsPressed(Keys.D) ||
      this.gamepadHandler.LeftStick[0] > 0.5 ||
      this.gamepadHandler.IsPressed(XBoxControllerKeys.RIGHT)) {
      this.hero.MoveRight(0.01, elapsedTime);
    }

    if (this.keyHandler.IsPressed(Keys.SPACE) ||
      this.gamepadHandler.IsPressed(XBoxControllerKeys.A)) {
      this.hero.Jump();
    }

    if (this.keyHandler.IsPressed(Keys.S) ||
      this.gamepadHandler.LeftStick[1] > 0.8 ||
      this.gamepadHandler.IsPressed(XBoxControllerKeys.DOWN)) {
      this.hero.Stomp();
    }

    if (this.keyHandler.IsPressed(Keys.LEFT_SHIFT) || this.gamepadHandler.IsPressed(XBoxControllerKeys.RB)) {
      this.hero.Dash();
    }

    if (this.keyHandler.IsPressed(Keys.E) || this.gamepadHandler.IsPressed(XBoxControllerKeys.X)) {
      const attackPosition = this.hero.FacingDirection[0] > 0 ?
        vec3.add(vec3.create(), this.hero.Position, vec3.fromValues(1.5, 0, 0)) :
        vec3.add(vec3.create(), this.hero.Position, vec3.fromValues(-2.5, 0, 0));
      this.hero.Attack(() => {
        // TODO: creating an attack instance on every attack is wasteful.
        this.attack = new MeleeAttack(attackPosition);
      });
    }

    this.enemies.forEach(e => {
      e.Update(elapsedTime);
      if (e.IsCollidingWidth(this.hero.BoundingBox)) {
        this.hero.Collide(e, elapsedTime);
      }
    });

    // TODO: should merge these together into handling "game objects" that can collide/interact with the hero
    this.enemyProjectiles.forEach((p: IProjectile) => {
      p.Update(elapsedTime);
      if (p.IsCollidingWith(this.hero.BoundingBox)) {
        this.hero.InteractWithProjectile(p);
      }

      // Despawn out-of-bounds projectiles
      if (this.level.MainLayer.IsOutsideBoundary(p.BoundingBox)) {
        const partitions = _.partition(this.enemyProjectiles, item => p != item);
        partitions[1].forEach(toDispose => toDispose.Dispose());
        this.enemyProjectiles = partitions[0];
      }
    })
    
    // TODO: merge enemy arrays
    this.dragons.forEach(e => e.Update(elapsedTime));

    this.camera.LookAtPosition(vec3.clone(this.hero.Position), this.level.MainLayer);
  }

  private CheckForEndCondition() {
    this.levelEnd.IsEnabled = this.coins.length === 0 && this.enemies.length === 0;
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
    // TODO: dispose all disposables
    this.InitCoins();
    this.InitHero();
    this.InitEnemies();
    this.paused = false;
    this.levelEndSoundPlayed = false;
    this.enemyProjectiles = [];
  }
}
