export class SoundEffect {
    private context: AudioContext = new AudioContext();
    private buffer: AudioBuffer;

    public constructor(path: string) {
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

    public Play(): void {
        const source = this.context.createBufferSource();
        source.buffer = this.buffer;
        source.connect(this.context.destination);
        source.start();
    }
}