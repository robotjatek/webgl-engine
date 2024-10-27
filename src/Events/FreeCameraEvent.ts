import { vec3 } from "gl-matrix";
import { Layer } from "../Layer";
import { Hero } from '../Hero';
import { Camera } from '../Camera';
import { ILevelEvent } from './ILevelEvent';


export class FreeCameraEvent implements ILevelEvent {
    public static readonly EVENT_KEY = 'free_camera_event';
    constructor(private camera: Camera,
        private mainLayer: Layer,
        private hero: Hero
    ) { }

    public get EventKey(): string {
        return FreeCameraEvent.EVENT_KEY;
    }

    public get CanStart(): boolean {
        return true;
    }

    public Update(_: number): void {
        this.camera.LookAtPosition(vec3.clone(this.hero.Position), this.mainLayer);
    }

    public Dispose(): void {
        // nothing to dispose
    }
}
