export class SoundEffect {
    private playing: boolean = false;
    private source: AudioBufferSourceNode;
    private gainNode: GainNode;
    private loop: boolean = false;
    
    private constructor(private buffer: AudioBuffer, private context: AudioContext, private allowMultiple: boolean = true, private path: string) {
    }

    public static async Create(path: string, allowMultiple: boolean = true): Promise<SoundEffect> {
        const blob = await ((await fetch(path)).arrayBuffer());
        const context = new AudioContext();
        const buffer = await context.decodeAudioData(blob);
        return new SoundEffect(buffer, context, allowMultiple, path);
    }

    public Play(playbackRate: number = 1, volume: number = 1, onEndCallback: () => void = null, loop: boolean = false): void {
        if ((!this.playing || this.allowMultiple) && this.buffer) {
            this.gainNode = this.context.createGain();
            this.gainNode.gain.value = volume;

            this.source = this.context.createBufferSource();
            this.source.buffer = this.buffer;
            this.source.playbackRate.value = playbackRate;
            this.source.connect(this.gainNode).connect(this.context.destination);

            this.playing = true;
            this.source.onended = () => {
                this.playing = false;
                if (onEndCallback) {
                    onEndCallback();
                }
            }
            this.loop = loop;
            this.source.loop = loop;
            this.context.resume();
            this.source.start();
        }

        if (this.playing) {
            this.gainNode.gain.value = volume;
        }
    }

    public Stop(): void {
        if (this.playing) {
            this.source.stop();
        }
    }

    public set Volume(volume: number) {
        if (this.gainNode)
            this.gainNode.gain.value = volume;
    }

    public get Volume(): number {
        if (!this.gainNode) {
            return 0;
        }

        return this.gainNode.gain.value;
    }

    public get Path(): string {
        return this.path;
    }
}