import { Shader } from '../Shader';
import { vec4 } from 'gl-matrix';

/**
 * Flashes the given entity for a given amount of time with a given color.
 * NOTE: the used shader must have a 'colorOverlay' uniform defined
 */
export class FlashOverlayComponent {

    public readonly DAMAGE_FLASH_DURATION = 1. / 60 * 1000 * 15;
    public readonly DAMAGE_OVERLAY_COLOR = vec4.fromValues(1, 0, 0, 0);
    public readonly ATTACK_SIGNAL_DURATION = 5 / 60 * 1000;
    public readonly ATTACK_SIGNAL_COLOR = vec4.fromValues(0.65, 0.65, 0.65, 0);

    private flashing = false;
    private flashTimer = 0;
    private flashDuration = 0;

    public constructor(private shader: Shader) {}

    public Update(delta: number): void {
        if (this.flashing) {
            this.flashTimer += delta;
        }

        // remove the damage overlay
        if (this.flashTimer >= this.flashDuration) {
            this.RemoveFlash();
        }
    }

    public Flash(color: vec4, duration: number): void {
        // remove the existing overlays
        if (this.flashing) {
            this.RemoveFlash();
        }

        this.flashDuration = duration;
        this.shader.SetVec4Uniform('colorOverlay', color);
        this.flashing = true;
    }

    private RemoveFlash(): void {
        this.shader.SetVec4Uniform('colorOverlay', vec4.create());
        this.flashing = false;
        this.flashTimer = 0;
    }
}
