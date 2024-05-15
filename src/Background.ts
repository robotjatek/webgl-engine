import { Environment } from "./Environment";
import { Sprite } from "./Sprite";

/**
 * Background is a full screen sprite
 */
export class Background extends Sprite
{
    public constructor()
    {
        const vertices = [
            0.0, 0.0, 0.0,
            Environment.HorizontalTiles, 0.0, 0.0,
            0,  Environment.VerticalTiles, 0.0,

            0,  Environment.VerticalTiles, 0.0,
            Environment.HorizontalTiles, 0, 0.0,
            Environment.HorizontalTiles, Environment.VerticalTiles, 0.0,
        ];

        super(vertices, [
            0, 0,
            1, 0,
            0, 1,
            0, 1,
            1, 0,
            1, 1,
        ]);
    }
}
