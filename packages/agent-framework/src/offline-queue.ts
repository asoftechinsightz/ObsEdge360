import type { QueuedMessage } from './types';

export class OfflineQueue {
  private readonly items: QueuedMessage[] = [];
  private readonly maxItems: number;

  constructor(maxItems = 1000) {
    this.maxItems = maxItems;
  }

  get size(): number {
    return this.items.length;
  }

  enqueue(message: Omit<QueuedMessage, 'id' | 'createdAt' | 'attempts'>): QueuedMessage {
    const entry: QueuedMessage = {
      ...message,
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };

    if (this.items.length >= this.maxItems) {
      this.items.shift();
    }
    this.items.push(entry);
    return entry;
  }

  peek(): QueuedMessage | undefined {
    return this.items[0];
  }

  dequeue(): QueuedMessage | undefined {
    return this.items.shift();
  }

  requeueFront(message: QueuedMessage): void {
    this.items.unshift({ ...message, attempts: message.attempts + 1 });
  }

  toArray(): QueuedMessage[] {
    return [...this.items];
  }

  clear(): void {
    this.items.length = 0;
  }
}
