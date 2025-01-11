import { vec2 } from 'gl-matrix';
import { SpriteRenderer } from './SpriteRenderer';

export class Animation {
    private currentFrameTime: number = 0;
    private currentFrameIndex: number = 0;
    // Shows if the animation looped at least once
    private animationFinished: boolean = false;

    public constructor(private readonly frameTime: number,
                       private readonly renderer: SpriteRenderer
    ) {
    }

    public Animate(delta: number, frameSet: vec2[]): boolean {
        this.currentFrameTime += delta;
        this.renderer.TextureOffset = frameSet[this.currentFrameIndex];
        if (this.currentFrameTime > this.frameTime) {
            this.currentFrameIndex++;
            if (this.currentFrameIndex >= frameSet.length) {
                this.currentFrameIndex = 0;
                this.animationFinished = true;
            }
            this.currentFrameTime = 0;
        }

        return this.animationFinished;
    }
}