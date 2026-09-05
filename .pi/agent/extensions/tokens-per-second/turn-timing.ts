export class TurnTiming {
    private startedAt: number | undefined;
    private endedAt: number | undefined;
    private lastAt = 0;
    private firstTextAt: number | undefined;
    private tools = new Set<string>();
    private promptDepth = 0;
    private toolMs = 0;
    private inputMs = 0;
    private errors = 0;

    start(now: number) {
        this.startedAt = now;
        this.endedAt = undefined;
        this.lastAt = now;
        this.firstTextAt = undefined;
        this.tools.clear();
        this.promptDepth = 0;
        this.toolMs = 0;
        this.inputMs = 0;
        this.errors = 0;
    }

    private advance(now: number) {
        if (this.startedAt === undefined || this.endedAt !== undefined) return;
        const elapsed = now - this.lastAt;
        if (this.promptDepth > 0) this.inputMs += elapsed;
        else if (this.tools.size > 0) this.toolMs += elapsed;
        this.lastAt = now;
    }

    toolStarted(id: string, now: number) {
        this.advance(now);
        this.tools.add(id);
    }

    toolEnded(id: string, now: number) {
        this.advance(now);
        this.tools.delete(id);
    }

    promptStarted(now: number) {
        this.advance(now);
        this.promptDepth += 1;
    }

    promptEnded(now: number) {
        this.advance(now);
        this.promptDepth = Math.max(0, this.promptDepth - 1);
    }

    textReceived(now: number) {
        this.firstTextAt ??= now;
    }

    providerFailed() {
        this.errors += 1;
    }

    finish(now: number) {
        this.advance(now);
        this.endedAt = now;
    }

    snapshot(now: number) {
        if (this.startedAt === undefined) return undefined;
        const end = this.endedAt ?? now;
        const pending = end - this.lastAt;
        return {
            elapsedMs: end - this.startedAt,
            firstTextMs:
                this.firstTextAt === undefined
                    ? undefined
                    : this.firstTextAt - this.startedAt,
            toolMs:
                this.toolMs +
                (this.promptDepth === 0 && this.tools.size > 0 ? pending : 0),
            inputMs: this.inputMs + (this.promptDepth > 0 ? pending : 0),
            providerErrors: this.errors,
        };
    }
}
