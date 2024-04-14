export class SoundEffect {
    private context: AudioContext = new AudioContext();
    private buffer: AudioBuffer;
    private playing: boolean = false;
    private source: AudioBufferSourceNode;
    private gainNode: GainNode;
    private loop: boolean = false;

    public constructor(path: string, private allowMultiple: boolean = true) {
        const request = new XMLHttpRequest();
        request.open('GET', path);
        request.responseType = "arraybuffer";
        request.onload = () => {
            this.context.decodeAudioData(request.response, (data) => {
                this.buffer = data;
            });
        }
        request.send();
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

    public SetVolume(volume: number) {
        if (this.gainNode)
            this.gainNode.gain.value = volume;
    }
}