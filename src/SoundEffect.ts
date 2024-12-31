export class SoundEffect {
    private activeSources: Set<{ source: AudioBufferSourceNode; gainNode: GainNode }> = new Set();

    private constructor(private buffer: AudioBuffer,
                        private context: AudioContext,
                        private allowMultiple: boolean = true,
                        private path: string) {
    }

    public static async Create(path: string, allowMultiple: boolean = true): Promise<SoundEffect> {
        const blob = await ((await fetch(path)).arrayBuffer());
        const context = new AudioContext();

        const buffer = await context.decodeAudioData(blob);
        return new SoundEffect(buffer, context, allowMultiple, path);
    }

    public async Play(playbackRate: number = 1,
                      volume: number = 1,
                      onEndCallback: (() => void) | null = null,
                      loop: boolean = false): Promise<void> {

        if (!this.allowMultiple && this.activeSources.size > 0) {
            return;
        }

        const gainNode = this.context.createGain();
        gainNode.gain.value = volume;
        const source = this.context.createBufferSource();
        source.buffer = this.buffer;
        source.playbackRate.value = playbackRate;
        source.loop = loop;
        source.connect(gainNode).connect(this.context.destination);

        const entry = { source, gainNode };
        this.activeSources.add(entry);

        source.onended = () => {
            this.activeSources.delete(entry);
            if (onEndCallback) {
                onEndCallback();
            }
        }

        await this.context.resume();
        source.start();
    }

    public Stop(): void {
        this.activeSources.forEach(({ source }) => {
            source.stop();
        });
        this.activeSources.clear();
    }

    public set Volume(volume: number) {
        this.activeSources.forEach((entry) => {
            entry.gainNode.gain.value = volume;
        });
    }

    public get Volume(): number {
        if (this.activeSources.size === 0) {
            return 0;
        }

        const firstGainNode = Array.from(this.activeSources)[0].gainNode;
        return firstGainNode.gain.value;
    }

    public get Path(): string {
        return this.path;
    }
}