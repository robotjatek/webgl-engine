import { vec3 } from "gl-matrix";
import { Layer } from "../Layer";
import { Hero } from '../Hero';
import { Camera } from '../Camera';
import { SoundEffect } from '../SoundEffect';
import { SoundEffectPool } from '../SoundEffectPool';
import { ILevelEvent } from './ILevelEvent';

// TODO: animate lava
export class EscapeEvent implements ILevelEvent {
    public static readonly EVENT_KEY = 'escape_event'
    private eventCameraYPos: number;
    private elapsedTime: number = 0;
    private state: number = 0; // TODO: state machine
    private started = false;

    private constructor(private camera: Camera,
        private eventLayer: Layer,
        private mainLayer: Layer,
        private hero: Hero,
        private eventLayerStopPosition: number,
        private eventLayerSpeed: number,
        private cameraStopPos: number,
        private cameraSpeed: number,
        private shakeSound: SoundEffect,
        private explosionSound: SoundEffect,
        private music: SoundEffect
    ) {
        this.eventCameraYPos = eventLayer.MaxY;
        this.music.Stop();
    }

    public get EventKey(): string {
        return EscapeEvent.EVENT_KEY;
    }

    public get CanStart(): boolean {
        return !this.started;
    }

    public static async Create(camera: Camera,
        eventLayer: Layer,
        mainLayer: Layer,
        hero: Hero,
        eventLayerStopPosition: number,
        eventLayerSpeed: number,
        cameraStopPosition: number,
        cameraSpeed: number,
    ): Promise<EscapeEvent> {
        const shakeSound = await SoundEffectPool.GetInstance().GetAudio('audio/shake.wav', false);
        const music = await SoundEffectPool.GetInstance().GetAudio('audio/escape.mp3', false);
        const explosionSound = await SoundEffectPool.GetInstance().GetAudio('audio/explosion.mp3', false);
        return new EscapeEvent(camera, eventLayer, mainLayer, hero, eventLayerStopPosition, eventLayerSpeed, cameraStopPosition, cameraSpeed, shakeSound, explosionSound, music);
    }

    public async Update(delta: number): Promise<void> {
        if (this.started) {
            this.elapsedTime += delta;
        }

        if (this.state === 0) {
            this.shakeSound.Play(1, 1, null, true);
            this.camera.Shake = true;
            
            if (!this.started) {
                this.started = true;

                this.state++;
            }
        } else if (this.state === 1) {
            this.explosionSound.Play(1, 1, null, false);
            this.state++;
        } else if (this.state === 2) {
            this.music.Play(1, 0.4, null, false);

            // max offset
            if (this.eventLayer.MinY + this.eventLayer.LayerOffsetY > this.eventLayerStopPosition) {
                this.eventLayer.LayerOffsetY -= this.eventLayerSpeed * delta;
            } else {
                this.camera.Shake = false;
                this.shakeSound.Stop();
            }

            if (this.eventLayer.IsCollidingWith(this.hero.BoundingBox, true)) {
                this.hero.DamageWithInvincibilityConsidered(vec3.fromValues(0, -0.02, 0));
            }

            if (this.eventCameraYPos > this.cameraStopPos) {
                this.eventCameraYPos = (this.eventCameraYPos - (this.cameraSpeed * delta));
            }
        }

        const vec = vec3.fromValues((this.eventLayer.MaxX - this.eventLayer.MinX) / 2, this.eventCameraYPos - 5, 0);
        this.camera.LookAtPosition(vec, this.mainLayer);
    }

    public Dispose(): void {
        this.music.Stop();
        this.shakeSound.Stop();
        this.camera.Shake = false;
    }
}
