import { mat4, vec3 } from "gl-matrix";
import { Environment } from './Environment';
import { Layer } from './Layer';

export class Camera {
    private readonly viewMatrix: mat4;
    private shake = false;

    public constructor(private position: vec3) {
        this.viewMatrix = mat4.create();
    }

    public get ViewMatrix(): mat4 {
        return this.viewMatrix;
    }

    public get Shake(): boolean {
        return this.shake;
    }

    public set Shake(value: boolean) {
        this.shake = value;
    }

    /**
     * The camera centers its view on the given position with its viewport confined in the boundaries of the given layer
     * @param position The position to look at
     * @param layer The layer where the camera's viewport is confined in
     */
    public LookAtPosition(position: vec3, layer: Layer): void {
        const xShake = this.shake ? Math.random() * (0.2 - 0.1) + 0.1 : 0;
        const yShake = this.shake ? Math.random() * (0.2 - 0.1) + 0.1 : 0;

        position[0] = this.Clamp(position[0], layer.MinX + Environment.HorizontalTiles / 2, layer.MaxX - Environment.HorizontalTiles / 2) + xShake;
        position[1] = this.Clamp(position[1], layer.MinY - Environment.VerticalTiles / 2, layer.MaxY - Environment.VerticalTiles / 2) + yShake;

        mat4.translate(
            this.viewMatrix,
            mat4.create(),
            vec3.fromValues(
                -position[0] + Environment.HorizontalTiles / 2,
                -position[1] + Environment.VerticalTiles / 2,
                0));
        this.position = position;
    }

    public Reset(): void {
        this.shake = false;
        this.position = vec3.create();
    }

    private Clamp(val: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, val));
    }
}
