interface InvalidateMessage {
  type: 'invalidate';
  store: string;
  recordId?: string;
  timestamp: number;
}

export class BroadcastSync {
  private channel: BroadcastChannel | null;

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('forgeops-sync');
    } else {
      this.channel = null;
    }
  }

  notify(store: string, recordId?: string): void {
    if (this.channel) {
      const message: InvalidateMessage = {
        type: 'invalidate',
        store,
        recordId,
        timestamp: Date.now(),
      };
      this.channel.postMessage(message);
    }
  }

  onInvalidate(callback: (store: string, recordId?: string) => void): void {
    if (this.channel) {
      this.channel.onmessage = (event: MessageEvent) => {
        const data = event.data as InvalidateMessage;
        if (data?.type === 'invalidate') {
          callback(data.store, data.recordId);
        }
      };
    }
  }

  close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}
