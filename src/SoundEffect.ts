export class SoundEffect {
    private context: AudioContext = new AudioContext();
    private buffer: AudioBuffer;
    private playing: boolean = false;
    private source: AudioBufferSourceNode;

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

    public Play(playbackRate: number = 1, volume: number = 1, onEndCallback: () => void = null): void {
        if (!this.playing || this.allowMultiple) {
            const gainNode = this.context.createGain();
            gainNode.gain.value = volume;

            this.source = this.context.createBufferSource();
            this.source.buffer = this.buffer;
            this.source.playbackRate.value = playbackRate;
            this.source.connect(gainNode).connect(this.context.destination);

            this.playing = true;
            this.source.onended = () => {
                this.playing = false;
                if (onEndCallback) {
                    onEndCallback();
                }
            }
            this.source.start();
        }
    }

    public Stop() {
        if (this.playing) {
            this.source.stop();
        }
    }
}