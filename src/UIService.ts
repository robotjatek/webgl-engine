import { mat4 } from 'gl-matrix';
import { Textbox } from './Textbox';
import { IDisposable } from './IDisposable';

export class UIService implements IDisposable {

    private textProjectionMatrix: mat4;
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

    public async AddTextbox(): Promise<Textbox> {
        const textbox = await Textbox.Create('Consolas');
        this.textboxes.push(textbox);

        return textbox;
    }

    public RemoveTextbox(textbox: Textbox): void {
        this.textboxes = this.textboxes.filter(t => t !== textbox);
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