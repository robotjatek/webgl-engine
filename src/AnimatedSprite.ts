import { vec2 } from "gl-matrix";
import { Sprite } from "./Sprite";

// TODO: somehow I should reuse the for all animated sprites, like projectiles and enemies
export class AnimatedSprite extends Sprite {
    private frameNumber = 0;
    private currentFrameTime = 0;

    public constructor(vertices: number[], initialTextureCoordinates: number[]) {
        super(vertices, initialTextureCoordinates);
    }

    public Update(elapsedTime: number): void {
        super.Update(elapsedTime);
        this.currentFrameTime += elapsedTime;
        if (this.currentFrameTime > 64) {
            if (this.frameNumber === 9) {
                this.textureOffset = vec2.fromValues(0, 0);
                this.frameNumber = 0;
            }
            this.frameNumber++;
            vec2.add(this.textureOffset, this.textureOffset, vec2.fromValues(1.0 / 10, 0)); // TODO: this is hardcoded for coin.png
            this.currentFrameTime = 0;
        }
    }

}
