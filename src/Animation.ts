import { vec2 } from 'gl-matrix';
import { SpriteRenderer } from './SpriteRenderer';

export class Animation {
    private currentFrameTime: number = 0;
    private currentFrameIndex: number = 0;
    private currentFrameSet: vec2[] = [];
    // Shows if the animation looped at least once
    private animationFinished: boolean = false;

    public constructor(private readonly frameTime: number,
                       private readonly renderer: SpriteRenderer,
                       initialFrameSet: vec2[]) {
        this.currentFrameSet = initialFrameSet;
    }

    public set CurrentFrameSet(value: vec2[]) {
        this.currentFrameSet = value;
        this.renderer.TextureOffset = this.currentFrameSet[this.currentFrameIndex];
    }

    public Animate(delta: number): boolean {
        this.currentFrameTime += delta;
        if (this.currentFrameTime > this.frameTime) {
            this.currentFrameIndex++;
            if (this.currentFrameIndex >= this.currentFrameSet.length) {
                this.currentFrameIndex = 0;
                this.animationFinished = true;
            }
            this.renderer.TextureOffset = this.currentFrameSet[this.currentFrameIndex];
            this.currentFrameTime = 0;
        }

        return this.animationFinished;
    }
}