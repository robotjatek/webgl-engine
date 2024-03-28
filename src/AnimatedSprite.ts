import { vec2 } from "gl-matrix";
import { Sprite } from "./Sprite";

export class AnimatedSprite extends Sprite
{
    private frameNumber = 0;
    private currentFrameTime = 0;

    public constructor(vertices: number[], initialTextureCoordinates: number[])
    {
        super(vertices, initialTextureCoordinates);
    }

    public Animate(elapsedTime: number): void
    {
        this.currentFrameTime += elapsedTime;
        if (this.currentFrameTime > 66)
        {
            if (this.frameNumber === 9)
            {
                this.textureOffset = vec2.fromValues(0, 0);
                this.frameNumber = 0;
            }
            this.frameNumber++;
            vec2.add(this.textureOffset, this.textureOffset, vec2.fromValues(1.0 / 10, 0));
            this.currentFrameTime = 0;
        }
    }

}
