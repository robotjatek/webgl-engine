export class Lock {
    // TODO: maybe there is a way to merge these two maps
    private waitMap = new Map<string, (() => void)[]>();
    private lockMap = new Map<string, boolean>();

    public async lock(key: string): Promise<void> {
        return new Promise((resolve) => {
            if (!this.lockMap.has(key) || !this.lockMap.get(key)) {
                this.lockMap.set(key, true)
                this.waitMap.set(key, []);
                resolve();
            } else {
                const waitQueue = this.waitMap.get(key)
                waitQueue.push(resolve);
            }
        });
    }

    public async release(key: string): Promise<void> {
        if (this.lockMap.get(key) && this.waitMap.get(key).length === 0) {
            this.lockMap.set(key, false)
            return;
        }

        const resolver = this.waitMap.get(key).shift();
        return new Promise((res) => {
            resolver();
            res();
        });
    }
}
