export class Lock {
    private locked: boolean = false;
    private queue: (() => void)[] = [];

    public async lock(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.locked) {
                this.locked = true;
                resolve();
            } else {
                this.queue.push(resolve);
            }
        });
    }

    public async release(): Promise<void> {
        if (this.queue.length === 0 && this.locked) {
            this.locked = false;
            return;
        }

        const resolver = this.queue.shift();
        return new Promise((res) => {
            resolver();
            res();
        });
    }
}
