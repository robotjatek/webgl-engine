import { mat4, vec2 } from 'gl-matrix';
import { Background } from './Background';
import { SpriteBatch } from './SpriteBatch';
import { Shader } from './Shader';
import { TexturePool } from './TexturePool';
import { ControllerHandler } from './ControllerHandler';
import { XBoxControllerKeys } from './XBoxControllerKeys';
import { SoundEffectPool } from './SoundEffectPool';
import { SoundEffect } from './SoundEffect';
import { KeyHandler } from './KeyHandler';
import { Keys } from './Keys';
import { IStartEventListener } from './Game';
import { Textbox } from './Textbox';

export class MainScreen {
    private startEventListeners: IStartEventListener[] = [];
    private textProjMat: mat4;
    private currentTime = 0;

    private constructor(private batch: SpriteBatch, 
        private gamepadHandler: ControllerHandler,
        private keyHandler: KeyHandler,
        private sound: SoundEffect,
        private pressStartTextbox: Textbox,
        width: number,
        height: number,

    ) {
        this.textProjMat = mat4.ortho(mat4.create(), 0, width, height, 0, -1, 1)
    }

    public static async Create(keyboardHandler: KeyHandler, gamepadHandler: ControllerHandler, width: number, height: number): Promise<MainScreen> {
        const background = new Background();
        const texture = await TexturePool.GetInstance().GetTexture('textures/title.jpeg');
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/FragmentShader.frag');
        const batch = new SpriteBatch(shader, [background], texture);
        const sound = await SoundEffectPool.GetInstance().GetAudio('audio/ui2.mp3', false);

        const dimensions = await Textbox.PrecalculateDimensions('Consolas', 'Press start or Enter to begin', 1);
        const pressStartText = (await Textbox.Create('Consolas')).WithText('Press start or Enter to begin', vec2.fromValues(width / 2 - dimensions.width / 2, height - 120), 1);

        return new MainScreen(batch, gamepadHandler, keyboardHandler, sound, pressStartText, width, height);
    }

    public Draw(proj: mat4): void {
        this.batch.Draw(proj, mat4.create());
        this.pressStartTextbox.Draw(this.textProjMat);
    }

    public Update(delta: number): void {
        this.currentTime += delta;
        const frequency = 0.15;
        const amplitude = 0.35;
        const valueOffset = amplitude * Math.sin(2 * Math.PI * frequency * (this.currentTime / 1000));
        const value = 0.65 + Math.abs(valueOffset);
        this.pressStartTextbox.WithValue(value);

        if (this.gamepadHandler.IsPressed(XBoxControllerKeys.START) || this.keyHandler.IsPressed(Keys.ENTER)) {
            this.sound.Play(1, 1, () => {
                this.startEventListeners.forEach(l => l.Start());
            }, false);
        }
    }

    public SubscribeToStartEvent(listener: IStartEventListener) {
        this.startEventListeners.push(listener);
    }
}
