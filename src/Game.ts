import { mat4, vec2, vec3 } from 'gl-matrix';
import { Environment } from './Environment';
import { KeyHandler } from './KeyHandler';
import { Level } from './Level';
import { gl, WebGLUtils } from './WebGLUtils';
import { Keys } from './Keys';
import { SoundEffectPool } from './SoundEffectPool';
import { ControllerHandler } from './ControllerHandler';
import { XBoxControllerKeys } from './XBoxControllerKeys';
import { TexturePool } from './TexturePool';
import { Textbox } from './Textbox';
import { SoundEffect } from './SoundEffect';
import { MainScreen } from './MainScreen';
import { PauseScreen } from './PauseScreen/PauseScreen';
import { IDisposable } from './IDisposable';

export interface IStartEventListener {
  Start(): Promise<void>;
}

export interface IResumeEventListener {
  Resume(): void;
}

export interface IQuitEventListener {
  Quit(): void;
}

export interface INextLevelEvent {
  OnNextLevelEvent(levelName: string): Promise<void>;
}

export interface IRestartListener {
  OnRestartEvent(): void;
}

// TODO: time to implement a proper state machine at least for the game object
// TODO: check for key presses and elapsed time since state change
// TODO: sometimes key release check is also neccessary for a state change
enum State {
  START_SCREEN = 'start_screen',
  IN_GAME = 'in_game',
  PAUSED = 'paused'
}

// TODO: resource tracker: keep track of 'alive' opengl and other resurces resources the number shouldnt go up
// TODO: ui builder framework
// TODO: flip sprite
// TODO: recheck every vector passing. Sometimes vectors need to be cloned
// TODO: FF8 Starting Up/FF9 Hunter's Chance - for the final BOSS music?
// TODO: update ts version
// TODO: render bounding boxes in debug mode
// TODO: texture map padding
export class Game implements IStartEventListener,
  IResumeEventListener,
  IQuitEventListener,
  IRestartListener,
  INextLevelEvent,
  IDisposable {
  private Width: number;
  private Height: number;
  private start: number;
  private projectionMatrix = mat4.create();
  private textProjMat: mat4;
  private state: State = State.START_SCREEN;
  private level: Level = null;

  private keyWasReleased = true;
  private elapsedTimeSinceStateChange = 0;

  private constructor(private keyHandler: KeyHandler,
    private gamepadHandler: ControllerHandler,
    private healthTextbox: Textbox,
    private scoreTextbox: Textbox,
    private mainScreen: MainScreen,
    private pauseScreen: PauseScreen,
    private pauseSoundEffect: SoundEffect) {
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

    this.textProjMat = mat4.ortho(mat4.create(), 0, this.Width, this.Height, 0, -1, 1);

    gl.disable(gl.DEPTH_TEST); // TODO: Depth test has value when rendering layers. Shouldn't be disabled completely
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.viewport(0, 0, this.Width, this.Height);
    gl.clearColor(0, 1, 0, 1);

    mainScreen.SubscribeToStartEvent(this);
    pauseScreen.SubscribeToResumeEvent(this);
    pauseScreen.SubscribeToQuitEvent(this);

    this.start = performance.now();
  }

  public Dispose(): void {
    this.mainScreen.Dispose();
    this.healthTextbox.Dispose();
    this.scoreTextbox.Dispose();
    this.pauseScreen.Dispose();
    this.level.Dispose();
  }

  public async OnNextLevelEvent(levelName: string): Promise<void> {
    this.pauseScreen.ResetStates();
    const oldLevel = this.level;
    oldLevel.StopMusic();

    const nextLevel = await Level.Create(levelName, this.keyHandler, this.gamepadHandler);
    await nextLevel.InitLevel();
    
    this.level = nextLevel;
    oldLevel.Dispose();

    nextLevel.SubscribeToNextLevelEvent(this);
    nextLevel.SubscribeToRestartEvent(this);
  }

  public OnRestartEvent(): void {
    this.pauseScreen.ResetStates();
  }

  public static async Create(keyHandler: KeyHandler, controllerHandler: ControllerHandler): Promise<Game> {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    WebGLUtils.CreateGLRenderingContext(canvas);
    await SoundEffectPool.GetInstance().Preload();
    await TexturePool.GetInstance().Preload();

    const textbox = await Textbox.Create('Consolas');
    const scoreTextBox = await Textbox.Create('Consolas');

    const pauseSoundEffect = await SoundEffectPool.GetInstance().GetAudio('audio/pause.mp3');
    const mainScreen = await MainScreen.Create(keyHandler, controllerHandler, canvas.width, canvas.height);
    const pauseScreen = await PauseScreen.Create(canvas.width, canvas.height, keyHandler, controllerHandler);
    return new Game(keyHandler, controllerHandler, textbox, scoreTextBox, mainScreen, pauseScreen, pauseSoundEffect);
  }

  public async Start(): Promise<void> {
    const level = await Level.Create('levels/level1.json', this.keyHandler, this.gamepadHandler);
    level.SubscribeToNextLevelEvent(this);
    level.SubscribeToRestartEvent(this);
    this.level = level;

    if (this.state === State.START_SCREEN) {
      await this.level.InitLevel();
      this.state = State.IN_GAME;
      this.elapsedTimeSinceStateChange = 0;
    }
  }

  public Quit(): void {
    this.pauseScreen.ResetStates();
    this.level.StopMusic();
    this.level.Dispose();
    this.level = null;
    this.state = State.START_SCREEN;
  }

  public async Run(): Promise<void> {
    const end = performance.now();
    const elapsed = Math.min(end - this.start, 32);
    this.start = end;
    this.Render(elapsed);
    await this.Update(elapsed);
  }

  public Pause(): void {
    // TODO: state machine: Only can go to paused from ingame
    if (this.state === State.IN_GAME) {
      this.state = State.PAUSED;
      this.elapsedTimeSinceStateChange = 0;
    }
  }

  public Play(): void {
    this.state = State.IN_GAME;
    this.elapsedTimeSinceStateChange = 0;
  }

  private async Render(elapsedTime: number): Promise<void> {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (this.state === State.START_SCREEN) {
      this.mainScreen.Draw(this.projectionMatrix);
    } else {
      this.level.Draw(this.projectionMatrix);

      const textColor = (() => {
        if (this.level.Hero.Health < 35) {
          return { hue: 0, saturation: 100 / 100, value: 100 / 100 };
        } else if (this.level.Hero.Health > 100) {
          return { hue: 120 / 360, saturation: 100 / 100, value: 100 / 100 };
        } else {
          return { hue: 0, saturation: 0, value: 100 / 100 };
        }
      })();
      this.healthTextbox
        .WithText(`Health: ${this.level.Hero.Health}`, vec2.fromValues(10, 0), 0.5)
        .WithHue(textColor.hue)
        .WithSaturation(textColor.saturation)
        .WithValue(textColor.value)
        .Draw(this.textProjMat);

      this.scoreTextbox
        .WithText(`Coins: ${this.level.Hero.CollectedCoins}`, vec2.fromValues(10, this.healthTextbox.Height), 0.5)
        .Draw(this.textProjMat);

      if (this.state === State.PAUSED) {
        // Draw the pause screen over the other rendered elements
        this.pauseScreen.Draw(this.projectionMatrix);
      }
    }

    requestAnimationFrame(this.Run.bind(this));
  }

  private async Update(elapsedTime: number): Promise<void> {
    this.elapsedTimeSinceStateChange += elapsedTime;

    if (this.state === State.START_SCREEN) {
      await this.mainScreen.Update(elapsedTime);
    } else if (this.state === State.IN_GAME && this.elapsedTimeSinceStateChange > 150) {
      await this.level.Update(elapsedTime);

      if (!this.keyHandler.IsPressed(Keys.ENTER) && !this.gamepadHandler.IsPressed(XBoxControllerKeys.START)
        && !this.keyWasReleased && this.elapsedTimeSinceStateChange > 100) {
        this.keyWasReleased = true;
      }

      if ((this.keyHandler.IsPressed(Keys.ENTER) || this.gamepadHandler.IsPressed(XBoxControllerKeys.START))
        && this.keyWasReleased && this.elapsedTimeSinceStateChange > 100) {
        this.state = State.PAUSED;
        this.pauseSoundEffect.Play();
        this.elapsedTimeSinceStateChange = 0;
        this.keyWasReleased = false;
      }
    } else if (this.state === State.PAUSED) {
      this.level.SetMusicVolume(0.15);
      this.pauseScreen.Update(elapsedTime);
    }
  }

  public Resume(): void {
    // TODO: statemachine move state
    this.state = State.IN_GAME;
    this.elapsedTimeSinceStateChange = 0;
    this.level.SetMusicVolume(0.6);
  }
}
