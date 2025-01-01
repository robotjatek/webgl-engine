import { IState } from '../../../Enemies/IState';
import { IEnemy } from '../../../Enemies/IEnemy';
import { UIService } from '../../../UIService';
import { Textbox } from '../../../Textbox';
import { vec2 } from 'gl-matrix';

/**
 * Fight state of the boss event. Maintains the UI updates of the boss health
 */
export class FightState implements IState {

    public constructor(private boss: IEnemy, private uiService: UIService, private bossHealthText: Textbox) { }

    public async Update(delta: number): Promise<void> {
        // State change is handled in OnBossDeath
        const bossHealthText = `Liz the lizard queen: ${this.boss.Health} HP`;
        const dimensions = await Textbox.PrecalculateDimensions('Consolas', bossHealthText, 0.5);
        this.bossHealthText.WithText(bossHealthText, vec2.fromValues(
            this.uiService.Width / 2 - dimensions.width / 2, 50), 0.5)
            .WithSaturation(1);
    }

    public async Enter(): Promise<void> { }

    public async Exit(): Promise<void> {
        // After the fight ended the boss health text is no longer needed
        // Note: make sure that this box is not referenced in future states
        this.uiService.RemoveTextbox(this.bossHealthText);
    }
}