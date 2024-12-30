import { mat4 } from 'gl-matrix';
import { Textbox } from './Textbox';
import { IDisposable } from './IDisposable';
import { Environment } from './Environment';

export class UIService implements IDisposable {

    private readonly textProjectionMatrix: mat4;
    private textboxes: Textbox[] = [];

    // TODO: resize event?
    public constructor(private screenWidth: number, private screenHeight: number) {
        this.textProjectionMatrix = mat4.ortho(mat4.create(), 0, screenWidth, screenHeight, 0, -1, 1);
    }

    public get Width(): number {
        return this.screenWidth;
    }

    public get Height(): number {
        return this.screenHeight;
    }

    public get TileWidth(): number {
        return this.screenWidth / Environment.HorizontalTiles;
    }

    public get TileHeight(): number {
        return this.screenHeight / Environment.VerticalTiles;
    }

    public async AddTextbox(): Promise<Textbox> {
        const textbox = await Textbox.Create('Consolas');
        this.textboxes.push(textbox);

        return textbox;
    }

    public RemoveTextbox(textbox: Textbox): void {
        this.textboxes = this.textboxes.filter(t => t !== textbox);
        textbox.Dispose();
    }

    public Draw(_: number): void {
        this.textboxes.forEach(t => t.Draw(this.textProjectionMatrix));
    }

    public Clear(): void {
        this.textboxes.forEach(t => t.Dispose());
        this.textboxes = [];
    }

    public Dispose(): void {
        this.Clear();
    }
}