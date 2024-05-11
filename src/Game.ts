import { mat4, vec2, vec3 } from 'gl-matrix';
import { Camera } from './Camera';
import { Environment } from './Environment';
import { KeyHandler } from './KeyHandler';
import { Level } from './Level';
import { gl, WebGLUtils } from './WebGLUtils';
import { Hero } from './Hero';
import { IPickup } from './Pickups/IPickup';
import { Keys } from './Keys';
import { CoinObject } from './Pickups/CoinObject';
import { LevelEnd } from './LevelEnd';
import { SlimeEnemy } from './Enemies/SlimeEnemy';
import { SoundEffectPool } from './SoundEffectPool';
import { MeleeAttack } from './Projectiles/MeleeAttack';
import { IProjectile } from './Projectiles/IProjectile';
import { ControllerHandler } from './ControllerHandler';
import { XBoxControllerKeys } from './XBoxControllerKeys';
import { TexturePool } from './TexturePool';
import { DragonEnemy } from './Enemies/DragonEnemy';
import { IEnemy } from './Enemies/IEnemy';
import { Spike } from './Enemies/Spike';
import { Cactus } from './Enemies/Cactus';
import { Textbox } from './Textbox';
import { HealthPickup } from './Pickups/HealthPickup';

// TODO: "press start" screen
// TODO: correctly dispose objects that no longer exist => delete opengl resources, when an object is destroyed
// TODO: flip sprite
// TODO: recheck every vector passing. Sometimes vectors need to be cloned
// TODO: multiple level support
// TODO: FF8 Starting Up/FF9 Hunter's Chance - for the final BOSS music?
// TODO: update ts version
// TODO: render bounding boxes in debug mode
// TODO: texture map padding
export class Game {
  private Width: number;
  private Height: number;
  private start: number;
  private level: Level;
  private projectionMatrix = mat4.create();
  private camera = new Camera(vec3.create());

  private hero: Hero;
  private levelEnd: LevelEnd;
  private paused: boolean = false;

  // TODO: spawned objects should be in the Level object itself, not in Game.ts
  private enemies: IEnemy[] = [];
  private pickups: IPickup[] = [];
  private enemyProjectiles: IProjectile[] = [];
  private attack: IProjectile; // This is related to the hero

  private levelEndOpenSoundEffect = SoundEffectPool.GetInstance().GetAudio('audio/bell.wav', false);
  private levelEndSoundPlayed = false;

  private constructor(private keyHandler: KeyHandler, private gamepadHandler: ControllerHandler, private textbox: Textbox) {
    this.Width = window.innerWidth;
    this.Height = window.innerHeight;

    this.projectionMatrix = mat4.ortho(
      this.projectionMatrix,
      0,
      Environment.HorizontalTiles,
      Environment.VerticalTiles,
      0,
      -1,
      1
    );


    TexturePool.GetInstance().Preload();
    SoundEffectPool.GetInstance().Preload();

    gl.disable(gl.DEPTH_TEST); // TODO: Depth test has value when rendering layers. Shouldn't be disabled completely
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.viewport(0, 0, this.Width, this.Height);
    gl.clearColor(0, 1, 0, 1);

    this.level = new Level('');
    this.start = performance.now();

    this.levelEnd = new LevelEnd(vec3.fromValues(58, Environment.VerticalTiles - 4, 0));
    this.RestartLevel();
  }

  public static async Create(keyHandler: KeyHandler, controllerHandler: ControllerHandler): Promise<Game> {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    WebGLUtils.CreateGLRenderingContext(canvas);

    const textbox = await Textbox.Create('Consolas');
    return new Game(keyHandler, controllerHandler, textbox);
  }

  private InitEnemies() {
    const dragons = [
      new DragonEnemy(
        vec3.fromValues(55, Environment.VerticalTiles - 7, 1),
        vec2.fromValues(5, 5),
        this.level.MainLayer,
        this.hero, // To track where the hero is, i want to move as much of the game logic from the update loop as possible

        (sender: DragonEnemy) => { this.RemoveEnemy(sender) }, // onDeath

        // Spawn projectile
        (sender: DragonEnemy, projectile: IProjectile) => {
          this.enemyProjectiles.push(projectile);
          // Despawn projectile that hit
          // TODO: instead of accessing a public array, projectiles should have a subscribe method
          projectile.OnHitListeners.push(s => this.RemoveProjectile(s));
        }
      )
    ];

    const slimes = [
      new SlimeEnemy(
        vec3.fromValues(25, Environment.VerticalTiles - 5, 1),
        vec2.fromValues(3, 3),
        this.level.MainLayer,
        (e) => this.RemoveEnemy(e)),

      new SlimeEnemy(
        vec3.fromValues(34, Environment.VerticalTiles - 5, 1),
        vec2.fromValues(3, 3),
        this.level.MainLayer,
        (e) => this.RemoveEnemy(e))
    ];

    const spikes = [
      new Spike(
        vec3.fromValues(52, Environment.VerticalTiles - 2, 0),
        vec2.fromValues(1, 1)),

      new Spike(
        vec3.fromValues(53, Environment.VerticalTiles - 2, 0),
        vec2.fromValues(1, 1)),

      new Spike(
        vec3.fromValues(54, Environment.VerticalTiles - 2, 0),
        vec2.fromValues(1, 1)),
    ];

    const cacti: IEnemy[] = [
      new Cactus(
        vec3.fromValues(45, Environment.VerticalTiles - 5, 0),
        (sender: IEnemy) => this.RemoveEnemy(sender)
      )
    ];

    this.enemies = [
      ...slimes,
      ...dragons,
      ...spikes,
      ...cacti
    ];
  }

  private RemoveEnemy(toRemove: IEnemy): void {
    this.enemies = this.enemies.filter(e => e !== toRemove);
  }

  private RemovePickup(toRemove: IPickup): void {
    this.pickups = this.pickups.filter(e => e !== toRemove);
  }

  private RemoveProjectile(projectile: IProjectile): void {
    this.enemyProjectiles = this.enemyProjectiles.filter(p => p !== projectile);
    projectile.Dispose();
  }

  private InitHero() {
    this.hero = new Hero(vec3.fromValues(
      0, Environment.VerticalTiles - 5, 1),
      vec2.fromValues(3, 3),
      this.level.MainLayer,
      () => this.RestartLevel());
  }

  private InitPickups() {
    const coins = [
      new CoinObject(vec3.fromValues(21, 10, 0), c => this.RemovePickup(c)),
      new CoinObject(vec3.fromValues(23, 10, 0), c => this.RemovePickup(c)),
      new CoinObject(vec3.fromValues(14, Environment.VerticalTiles - 3, 0), c => this.RemovePickup(c)),
      new CoinObject(vec3.fromValues(15, Environment.VerticalTiles - 3, 0), c => this.RemovePickup(c)),
      new CoinObject(vec3.fromValues(16, Environment.VerticalTiles - 3, 0), c => this.RemovePickup(c)),
      new CoinObject(vec3.fromValues(30, Environment.VerticalTiles - 3, 0), c => this.RemovePickup(c)),
      new CoinObject(vec3.fromValues(31, Environment.VerticalTiles - 3, 0), c => this.RemovePickup(c)),
      new CoinObject(vec3.fromValues(32, Environment.VerticalTiles - 3, 0), c => this.RemovePickup(c)),
      new CoinObject(vec3.fromValues(50, Environment.VerticalTiles - 3, 0), c => this.RemovePickup(c)),
      new CoinObject(vec3.fromValues(51, Environment.VerticalTiles - 3, 0), c => this.RemovePickup(c)),
      new CoinObject(vec3.fromValues(52, Environment.VerticalTiles - 3, 0), c => this.RemovePickup(c)),
    ];

    const healthPickups = [
      new HealthPickup(
        vec3.fromValues(28, Environment.VerticalTiles - 4, 0),
        (sender: HealthPickup) => this.RemovePickup(sender))
    ];

    this.pickups = [...coins, ...healthPickups]
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

    this.pickups.forEach(h => h.Draw(this.projectionMatrix, this.camera.ViewMatrix));

    this.enemies.forEach(e => e.Draw(this.projectionMatrix, this.camera.ViewMatrix));
    this.levelEnd.Draw(this.projectionMatrix, this.camera.ViewMatrix);

    this.attack?.Draw(this.projectionMatrix, this.camera.ViewMatrix);

    this.enemyProjectiles.forEach(p => p.Draw(this.projectionMatrix, this.camera.ViewMatrix));

    this.hero.Draw(this.projectionMatrix, this.camera.ViewMatrix);

    const textProjMat = mat4.ortho(mat4.create(), 0, this.Width, this.Height, 0, -1, 1);
    const textColor = (() => {
      if (this.hero.Health < 35) {
        return { hue: 0, saturation: 100 / 100, value: 100 / 100 };
      } else if (this.hero.Health > 100) {
        return { hue: 120 / 360, saturation: 100 / 100, value: 100 / 100 };
      } else {
        return { hue: 0, saturation: 0, value: 100 / 100 };
      }
    })();
    this.textbox
      .WithText(`Health: ${this.hero.Health}`, vec2.fromValues(10, 0), 0.5)
      .WithHue(textColor.hue)
      .WithSaturation(textColor.saturation)
      .WithValue(textColor.value)
      .Draw(textProjMat);

    requestAnimationFrame(this.Run.bind(this));
  }

  private Update(elapsedTime: number): void {
    // TODO: this is a hack because audio playback needs one user interaction before it can start. Also loading is async so I can start an audio file before its loaded
    // The later can be avoided by a press start screen, before starting the game
    //this.level.PlayMusic(0.5);

    this.hero.Update(elapsedTime);
    if (this.level.MainLayer.IsUnder(this.hero.BoundingBox)) {
      this.hero.Kill();
    }

    this.attack?.Update(elapsedTime);
    if (this.attack && !this.attack.AlreadyHit) {
      const enemiesCollidingWithProjectile = this.enemies.filter(e => e.IsCollidingWidth(this.attack.BoundingBox, false));
      // Pushback force does not necessarily mean the amount of pushback. A big enemy can ignore a sword attack for example
      enemiesCollidingWithProjectile.forEach(e => e.Damage(this.attack.PushbackForce));

      this.attack.OnHit();
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
        // TODO: I need to dispose resources after attack is done
        this.attack = new MeleeAttack(attackPosition, this.hero.FacingDirection);
      });
    }

    this.enemies.forEach(e => {
      e.Update(elapsedTime);
      if (e.IsCollidingWidth(this.hero.BoundingBox, false)) {
        this.hero.Collide(e);
      }
    });

    this.pickups.forEach(e => {
      e.Update(elapsedTime);
      if (e.IsCollidingWidth(this.hero.BoundingBox, false)) {
        this.hero.CollideWithPickup(e);
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
        this.enemyProjectiles = this.enemyProjectiles.filter(item => item !== p);
        p.Dispose();
      }
    });

    this.camera.LookAtPosition(vec3.clone(this.hero.Position), this.level.MainLayer);
  }

  private CheckForEndCondition() {
    const numberOfEndConditions = this.pickups.filter(p => p.EndCondition).length;
    this.levelEnd.IsEnabled = numberOfEndConditions === 0;
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
    this.enemyProjectiles.forEach(p => p.Dispose());
    this.enemyProjectiles = [];
    //this.enemies.forEach(e => e.Dispose());
    this.enemies = [];

    this.InitHero();
    this.InitEnemies();

    // TODO: dispose pickups
    //this.pickups.forEach(p => p.Dispose());
    this.pickups = []
    this.InitPickups();

    this.paused = false;
    this.levelEndSoundPlayed = false;
    this.enemyProjectiles = [];
  }
}
