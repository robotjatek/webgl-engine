import { vec2 } from 'gl-matrix';

export class Utils {
    public static readonly DefaultSpriteVertices: number[] = [
        0.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        0, 1.0, 0.0,

        0, 1.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 1.0, 0.0,
    ];

    public static readonly DefaultSpriteTextureCoordinates: number[] = [
        0, 0,
        1, 0,
        0, 1,
        0, 1,
        1, 0,
        1, 1,
    ];

    public static CreateSpriteVertices(positionX: number, positionY: number): number[] {
        return [
            positionX, positionY, 0.0,
            positionX + 1.0, positionY, 0.0,
            positionX, positionY + 1.0, 0.0,

            positionX, positionY + 1.0, 0.0,
            positionX + 1.0, positionY, 0.0,
            positionX + 1.0, positionY + 1.0, 0.0,
        ];
    }

    public static CreateCharacterVertices(position: vec2, width: number, height: number): number[] {
        return [
            position[0], position[1], 0,
            position[0] + width, position[1], 0,
            position[0], position[1] + height, 0,
            position[0], position[1] + height, 0,
            position[0] + width, position[1], 0,
            position[0] + width, position[1] + height, 0
        ];
    }

    public static CreateTextureCoordinates(positionX: number, positionY: number, width: number, height: number): number[] {
        return [
            positionX, positionY,
            positionX + width, positionY,
            positionX, positionY + height,
            positionX, positionY + height,
            positionX + width, positionY,
            positionX + width, positionY + height,
        ];
    }
}
