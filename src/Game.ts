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
import { UIService } from './UIService';
import { Camera } from './Camera';
import { RenderTarget } from './BackbufferRenderer';
import { Texture } from './Texture';
import { SpriteBatch } from './SpriteBatch';
import { Shader } from './Shader';
import { Sprite } from './Sprite';
import { Utils } from './Utils';

export interface IStartEventListener {
    Start(): Promise<void>;
}

export interface IResumeEventListener {
    Resume(): void;
}

export interface IQuitEventListener {
    Quit(): Promise<void>;
}

export interface INextLevelEvent {
    OnNextLevelEvent(levelName: string): Promise<void>;
}

export interface IRestartListener {
    OnRestartEvent(): void;
}

export interface IFadeOut {
    /**
     * Sets the screen 'darkness' to a given level.
     * 0 means completely visible, 1 is total darkness
     */
    SetFadeOut(value: number): void
}

// TODO: time to implement a proper state machine at least for the game object
// TODO: check for key presses and elapsed time since state change
// TODO: sometimes key release check is also necessary for a state change
enum State {
    START_SCREEN = 'start_screen',
    IN_GAME = 'in_game',
    PAUSED = 'paused'
}

// TODO: shake camera when attack hit
// TODO: play attack sound in different pitches

// TODO: resource tracker: keep track of 'alive' opengl and other resources resources the number shouldn't go up
// TODO: ui builder framework
// TODO: flip sprite
// TODO: recheck every vector passing. Sometimes vectors need to be cloned
// TODO: update ts version
// TODO: render bounding boxes in debug mode
// TODO: texture map padding
export class Game implements IStartEventListener,
    IResumeEventListener,
    IQuitEventListener,
    IRestartListener,
    INextLevelEvent,
    IFadeOut,
    IDisposable {
    private readonly Width: number;
    private readonly Height: number;
    private start: number;

    private projectionMatrix = mat4.ortho(
        mat4.create(),
        0,
        Environment.HorizontalTiles,
        Environment.VerticalTiles,
        0,
        -1,
        1
    );

    private state: State = State.START_SCREEN;
    private level!: Level;
    private musicVolumeStack: number[] = [];

    private keyWasReleased = true;
    private elapsedTimeSinceStateChange = 0;

    private readonly _renderTargetTexture: Texture;
    private _renderTarget: RenderTarget;
    private _finalImage: SpriteBatch;
    private readonly _fullScreenSprite: Sprite;

    private constructor(private keyHandler: KeyHandler,
                        private gamepadHandler: ControllerHandler,
                        private uiService: UIService,
                        private healthTextbox: Textbox,
                        private scoreTextbox: Textbox,
                        private mainScreen: MainScreen,
                        private pauseScreen: PauseScreen,
                        private pauseSoundEffect: SoundEffect,
                        private _backgroundShader: Shader) {
        this.Width = window.innerWidth;
        this.Height = window.innerHeight;

        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0, 0, this.Width, this.Height);
        gl.clearColor(0, 0, 0, 1);

        mainScreen.SubscribeToStartEvent(this);
        pauseScreen.SubscribeToResumeEvent(this);
        pauseScreen.SubscribeToQuitEvent(this);

        this._fullScreenSprite = new Sprite(
            Utils.DefaultFullscreenQuadVertices,
            Utils.DefaultFullscreenQuadTextureCoordinates);
        this._renderTargetTexture = Texture.empty(this.Width, this.Height);
        this._renderTarget = new RenderTarget(this._renderTargetTexture);
        this._finalImage = new SpriteBatch(this._backgroundShader, [this._fullScreenSprite], this._renderTargetTexture);

        this.start = performance.now();
    }

    public Dispose(): void {
        this.mainScreen.Dispose();
        this.pauseScreen.Dispose();
        this.level.Dispose();
        this.uiService.Dispose();
        this._renderTarget.Dispose();
    }

    private camera = new Camera(vec3.create());

    public async OnNextLevelEvent(levelName: string): Promise<void> {
        const oldLevel = this.level;
        oldLevel.StopMusic();

        const nextLevel = await Level.Create(levelName, this.keyHandler, this.gamepadHandler, this.uiService, this.camera, this);
        await nextLevel.InitLevel();

        this.level = nextLevel;
        oldLevel.Dispose();

        nextLevel.SubscribeToNextLevelEvent(this);
        nextLevel.SubscribeToRestartEvent(this);
    }

    public OnRestartEvent(): void {
    }

    public static async Create(keyHandler: KeyHandler, controllerHandler: ControllerHandler): Promise<Game> {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        WebGLUtils.CreateGLRenderingContext(canvas);
        await SoundEffectPool.GetInstance().Preload();
        await TexturePool.GetInstance().Preload();

        const bgShader: Shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/FragmentShader.frag');

        const uiService = new UIService(canvas.width, canvas.height);
        const healthTextbox = await uiService.AddTextbox();
        const scoreTextBox = await uiService.AddTextbox();

        const pauseSoundEffect = await SoundEffectPool.GetInstance().GetAudio('audio/pause.mp3');
        const mainScreen = await MainScreen.Create(keyHandler, controllerHandler, canvas.width, canvas.height);
        const pauseScreen = await PauseScreen.Create(canvas.width, canvas.height, keyHandler, controllerHandler);
        return new Game(keyHandler, controllerHandler, uiService, healthTextbox,
            scoreTextBox, mainScreen, pauseScreen, pauseSoundEffect, bgShader);
    }

    public async Start(): Promise<void> {
        const level = await Level.Create('levels/outro.json', this.keyHandler, this.gamepadHandler, this.uiService, this.camera, this);
        level.SubscribeToNextLevelEvent(this);
        level.SubscribeToRestartEvent(this);
        this.level = level;

        if (this.state === State.START_SCREEN) {
            await this.level.InitLevel();
            this.state = State.IN_GAME;
            this.elapsedTimeSinceStateChange = 0;
        }
    }

    public async Quit(): Promise<void> {
        this.level.StopMusic();
        this.level.Dispose();
        this.state = State.START_SCREEN;
        this.camera = new Camera(vec3.create());
        SoundEffectPool.GetInstance().StopAll();
        this.SetFadeOut(0);
        return Promise.resolve();
    }

    public Pause(): void {
        // TODO: state machine: Only can go to paused from ingame
        if (this.state === State.IN_GAME) {
            this.state = State.PAUSED;
            this.pauseSoundEffect.Play();
            this.elapsedTimeSinceStateChange = 0;
            this.musicVolumeStack.push(this.level!.GetMusicVolume());
            this.level!.SetMusicVolume(this.musicVolumeStack.slice(-1)[0] * 0.15);
        }
    }

    public Resume(): void {
        // TODO: statemachine move state
        this.state = State.IN_GAME;
        this.elapsedTimeSinceStateChange = 0;
        this.level!.SetMusicVolume(this.musicVolumeStack.pop()!);
    }

    public SetFadeOut(value: number) {
        this._backgroundShader.SetFloatUniform('fadeFactor', value);
    }

    public async Run(): Promise<void> {
        const end = performance.now();
        const elapsed = Math.min(end - this.start, 32);
        this.start = end;
        this.Render(elapsed);
        await this.Update(elapsed);

        requestAnimationFrame(this.Run.bind(this));
    }

    private Render(elapsedTime: number): void {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this._renderTarget.Render(() => {
            if (this.state === State.START_SCREEN) {
                this.mainScreen.Draw(this.projectionMatrix);
            } else {
                this.level!.Draw(this.projectionMatrix);
                this.uiService.Draw(elapsedTime);

                if (this.state === State.PAUSED) {
                    // Draw the pause screen over the other rendered elements
                    this.pauseScreen.Draw(this.projectionMatrix);
                }
            }
        });

        this._finalImage.Draw(this.projectionMatrix, mat4.create());
    }

    private async Update(elapsedTime: number): Promise<void> {
        this.elapsedTimeSinceStateChange += elapsedTime;

        if (this.state === State.START_SCREEN) {
            await this.mainScreen.Update(elapsedTime);
        } else if (this.state === State.IN_GAME && this.elapsedTimeSinceStateChange > 150) {
            await this.level!.Update(elapsedTime);

            if (!this.keyHandler.IsPressed(Keys.ENTER) && !this.gamepadHandler.IsPressed(XBoxControllerKeys.START)
                && !this.keyWasReleased && this.elapsedTimeSinceStateChange > 100) {
                this.keyWasReleased = true;
            }

            if ((this.keyHandler.IsPressed(Keys.ENTER) || this.gamepadHandler.IsPressed(XBoxControllerKeys.START))
                && this.keyWasReleased && this.elapsedTimeSinceStateChange > 100) {
                this.Pause();
                this.keyWasReleased = false;
            }

            const healthTextColor = (() => {
                if (this.level.Hero.Health < 35) {
                    return {hue: 0, saturation: 100 / 100, value: 100 / 100};
                } else if (this.level.Hero.Health > 100) {
                    return {hue: 120 / 360, saturation: 100 / 100, value: 100 / 100};
                } else {
                    return {hue: 0, saturation: 0, value: 100 / 100};
                }
            })();

            // TODO: only change these when the values themselves change
            this.healthTextbox
                .WithText(`Health: ${this.level.Hero.Health}`, vec2.fromValues(10, 0), 0.5)
                .WithHue(healthTextColor.hue)
                .WithSaturation(healthTextColor.saturation)
                .WithValue(healthTextColor.value);

            this.scoreTextbox
                .WithText(`Coins: ${this.level.Hero.CollectedCoins}`, vec2.fromValues(10, this.healthTextbox.Height), 0.5);
        } else if (this.state === State.PAUSED) {
            await this.pauseScreen.Update(elapsedTime);
        }
    }

}
