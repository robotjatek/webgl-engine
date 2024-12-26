import { ILevelEvent } from './ILevelEvent';
import { Hero } from '../Hero';
import { Camera } from '../Camera';
import { vec2, vec3 } from 'gl-matrix';
import { Environment } from '../Environment';
import { Level } from '../Level';
import { OldMan } from '../Actors/OldMan';
import { SoundEffectPool } from '../SoundEffectPool';
import { SoundEffect } from '../SoundEffect';
import { IQuitEventListener } from '../Game';
import { UIService } from '../UIService';
import { Textbox } from '../Textbox';
import { Sequence } from '../Sequence/Sequence';
import { SequenceBuilder } from '../Sequence/SequenceBuilder';

// This is now hardcoded for the last level. In the future this event could be a scriptable event
// TODO: start level with a pre-set event (other than free cam event)
// TODO: load default event from level descriptor
// TODO: when the descriptor of the event is null in the level.json fall back to freecam event

// TODO: show picture boxes for the talking characters

// TODO: fade-out
// TODO: support no next level in json
// TODO: support no music in json
export class OutroEvent implements ILevelEvent {
    public static EVENT_KEY = 'outro_event';

    private roarFinished = false;
    private heroFirstWaypoint: vec3 = vec3.fromValues(10, 15, 0);
    private timeAfterSpawn = 0;

    private sequence: Sequence;
    private conversationSequence: Sequence;

    private constructor(private hero: Hero, private camera: Camera, private level: Level, private oldMan: OldMan,
                        private dragonRoar: SoundEffect, private quitListener: IQuitEventListener,
                        private uiService: UIService, private textBox: Textbox) {
        this.sequence = this.CreateSequence();
        this.conversationSequence = this.ConversationSequence();
    }

    public static async Create(hero: Hero, camera: Camera, level: Level, quitListener: IQuitEventListener,
                               uiService: UIService): Promise<OutroEvent> {
        const oldMan = await OldMan.Create(vec3.fromValues(33, 13, 0), level.MainLayer);
        const dragonRoar = await SoundEffectPool.GetInstance().GetAudio('audio/wrong_dragon.mp3', false);
        const textbox = await uiService.AddTextbox();
        return new OutroEvent(hero, camera, level, oldMan, dragonRoar, quitListener, uiService, textbox);
    }

    public async Update(delta: number): Promise<void> {
        // Lock camera in position
        const vec = vec3.fromValues(Environment.HorizontalTiles / 2, Environment.VerticalTiles, 0);
        this.camera.LookAtPosition(vec, this.level.MainLayer);
        await this.sequence.Update(delta);
    }

    public get CanStart(): boolean {
        return true;
    }

    public get EventKey(): string {
        return OutroEvent.EVENT_KEY;
    }

    public Dispose(): void {
        // old man shouldn't be disposed as it is added to the game objects, so it will be automatically disposed
        this.uiService.RemoveTextbox(this.textBox);
    }

    private ConversationSequence(): Sequence {
        return new SequenceBuilder()
            .Action(async (_) => {
                this.textBox.WithText('What are you doing here?',
                    this.TextboxPositionForActor(this.oldMan.Position), 0.5);
                return true;
            }).Wait(3000)
            .Action(async (_) => {
                this.textBox.WithText('I\'ve killed the dragon',
                    this.TextboxPositionForActor(this.hero.Position), 0.5);
                return true;
            })
            .Wait(3000)
            .Action(async (_) => {
                this.textBox.WithText('You mean that little lizard down in the valley?',
                    this.TextboxPositionForActor(this.oldMan.Position), 0.5);
                return true;
            }).Wait(3000)
            .Action(async (_) => {
                this.textBox.WithText('We eat those things for breakfast back in the village',
                    this.TextboxPositionForActor(this.oldMan.Position), 0.5);
                return true;
            }).Wait(3000)
            .Action(async (_) => {
                this.textBox.WithText('I\'m afraid you\'ve killed the wrong dragon',
                    this.TextboxPositionForActor(this.oldMan.Position), 0.5);
                return true;
            }).Wait(3000)
            .Action(async (_) => {
                this.textBox.WithText('What do you mean the \"wrong dragon\"?',
                    this.TextboxPositionForActor(this.hero.Position), 0.5);
                return true;
            }).Wait(3000)
            .Build();
    }

    private TextboxPositionForActor(actorPosition: vec3): vec2 {
        return vec2.fromValues(this.uiService.TileWidth * actorPosition[0],
            this.uiService.TileHeight * actorPosition[1] - this.uiService.TileHeight);
    }

    private CreateSequence() {
        return new SequenceBuilder()
            .Action(async (delta: number) => {
                this.hero.AcceptInput = false;
                const distanceFromWaypoint = vec3.distance(this.heroFirstWaypoint, this.hero.CenterPosition);
                if (distanceFromWaypoint > 0.5) {
                    this.hero.Move(vec3.fromValues(0.005, 0, 0), delta);
                    return false;
                } else {
                    return true;
                }
            }).Action(async (delta: number) => {
                // hero looks back where he came from
                this.hero.Move(vec3.fromValues(-0.035, 0, 0), delta);
                return true;
            }).Action(async (delta: number) => {
                // Spawn old man
                this.level.AddGameObject(this.oldMan);
                this.timeAfterSpawn += delta;
                return this.timeAfterSpawn > 2000;
            }).Action(async (delta: number) => {
                // old man moves towards the hero
                const oldManDistanceToHero = vec3.distance(this.oldMan.CenterPosition, this.hero.CenterPosition);
                if (oldManDistanceToHero > 3) {
                    this.oldMan.Move(vec3.fromValues(-0.005, 0, 0), delta);
                    return false;
                } else {
                    return true;
                }
            }).Action(async (delta: number) => {
                // old man moves towards the hero
                const oldManDistanceToHero = vec3.distance(this.oldMan.CenterPosition, this.hero.CenterPosition);
                if (oldManDistanceToHero > 3) {
                    this.oldMan.Move(vec3.fromValues(-0.005, 0, 0), delta);
                    return false;
                } else {
                    return true;
                }
            }).Action(async (delta: number) => {
                // Hero looks at the old man
                this.hero.Move(vec3.fromValues(0.0025, 0, 0), delta);
                return true;
            }).Action(async (delta: number) => {
                // Conversation with a lot of text
                return await this.conversationSequence.Update(delta);
            }).Action(async (_: number) => {
                // Dragon roar
                this.dragonRoar.Play(1, 1, () => this.roarFinished = true, false);
                return this.roarFinished;
            }).Action(async (_: number) => {
                // TODO: Slow fade out effect
                return true;
            }).Action(async (_: number) => {
                // go to main menu
                await this.quitListener.Quit(); // TODO: valamiért a quit kurvasokszor meghívódik
                // nem csak itt hívódik meg a Dispose/quit kurvasokszor, hanem ha kézzel lépek ki akkor is
                return true;
            }).Build();
    }
}