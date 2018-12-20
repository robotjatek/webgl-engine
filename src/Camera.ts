import { mat4, vec3 } from "gl-matrix";

export class Camera
{
    private ViewMatrix: mat4;

    public constructor()
    {
        this.ViewMatrix = mat4.create();
    }

    public GetViewMatrix(): mat4
    {
        return this.ViewMatrix;
    }

    public Move(direction: vec3): void
    {
        mat4.translate(this.ViewMatrix, this.ViewMatrix, direction);
    }
}
