import { vec3 } from "gl-matrix";
import { Layer } from "../Layer";
import { Hero } from '../Hero';
import { Camera } from '../Camera';
import { SoundEffect } from '../SoundEffect';
import { SoundEffectPool } from '../SoundEffectPool';
import { ILevelEvent } from './ILevelEvent';

// TODO: animate lava
// TODO: make level wider + confine camera inside so camera shake wont reveal missing tiles on the borders
export class EscapeEvent implements ILevelEvent {
    public static readonly EVENT_KEY = 'escape_event'
    private eventCameraYPos: number;
    private elapsedTime: number = 0;
    private state: number = 0;
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

        // Set up the camera to the expected state
        this.camera.Shake = false;
        this.shakeSound.Stop();
        this.music.Stop();
    }

    public get EventKey(): string {
        return EscapeEvent.EVENT_KEY;
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

    public Update(delta: number): void {
        if (this.started) {
            this.elapsedTime += delta;
        }

        if (this.state === 0) {
            if (!this.started) {
                this.started = true;
                this.shakeSound.Play();
                this.camera.Shake = true;

                this.state++;
            }
        } else if (this.state === 1) {
            if (this.elapsedTime > 3000) {
                this.explosionSound.Play(1, 1, null, false);
                this.state++;
            }
        } else if (this.state === 2) {
            if (this.elapsedTime > 3000) {
                this.music.Play(1, 0.4, null, false);

                // max offset
                if (this.eventLayer.MinY + this.eventLayer.LayerOffsetY > this.eventLayerStopPosition) {
                    this.eventLayer.LayerOffsetY -= this.eventLayerSpeed * delta;
                } else {
                    this.camera.Shake = false;
                }

                if (this.eventLayer.IsCollidingWith(this.hero.BoundingBox, true)) {
                    this.hero.DamageWithInvincibilityConsidered(vec3.fromValues(0, -0.02, 0));
                }

                if (this.eventCameraYPos > this.cameraStopPos) {
                    this.eventCameraYPos = (this.eventCameraYPos - (this.cameraSpeed * delta));
                } else {
                    this.state++; // The event "ends" when the camera reaches its final position
                }
            }
        }

        const vec = vec3.fromValues((this.eventLayer.MaxX - this.eventLayer.MinX) / 2, this.eventCameraYPos - 5, 0);
        this.camera.LookAtPosition(vec, this.mainLayer);
    }

    public Dispose(): void {
        this.music.Stop();
        this.shakeSound.Stop();
    }
}
