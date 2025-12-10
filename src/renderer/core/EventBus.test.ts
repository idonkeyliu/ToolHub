import { describe, it, expect, beforeEach, vi } from 'vitest';

type EventCallback = (data: any) => void;

// EventBus 类（用于测试）
class EventBus {
    private events: Map<string, Set<EventCallback>> = new Map();

    on(event: string, callback: EventCallback): () => void {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event)!.add(callback);
        return () => this.off(event, callback);
    }

    off(event: string, callback: EventCallback): void {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    emit(event: string, data?: any): void {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[EventBus] Error in event handler for "${event}":`, error);
                }
            });
        }
    }

    once(event: string, callback: EventCallback): () => void {
        const wrapper = (data: any) => {
            this.off(event, wrapper);
            callback(data);
        };
        return this.on(event, wrapper);
    }

    clear(): void {
        this.events.clear();
    }
}

describe('EventBus', () => {
    let eventBus: EventBus;

    beforeEach(() => {
        eventBus = new EventBus();
    });

    describe('on', () => {
        it('should register event listener', () => {
            const callback = vi.fn();
            eventBus.on('test-event', callback);

            eventBus.emit('test-event', 'test-data');

            expect(callback).toHaveBeenCalledWith('test-data');
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should register multiple listeners for same event', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            eventBus.on('test-event', callback1);
            eventBus.on('test-event', callback2);

            eventBus.emit('test-event', 'data');

            expect(callback1).toHaveBeenCalledWith('data');
            expect(callback2).toHaveBeenCalledWith('data');
        });

        it('should return unsubscribe function', () => {
            const callback = vi.fn();
            const unsubscribe = eventBus.on('test-event', callback);

            eventBus.emit('test-event');
            expect(callback).toHaveBeenCalledTimes(1);

            unsubscribe();
            eventBus.emit('test-event');
            expect(callback).toHaveBeenCalledTimes(1); // Still 1
        });

        it('should handle multiple events', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            eventBus.on('event1', callback1);
            eventBus.on('event2', callback2);

            eventBus.emit('event1', 'data1');
            eventBus.emit('event2', 'data2');

            expect(callback1).toHaveBeenCalledWith('data1');
            expect(callback2).toHaveBeenCalledWith('data2');
            expect(callback1).not.toHaveBeenCalledWith('data2');
        });
    });

    describe('off', () => {
        it('should unregister event listener', () => {
            const callback = vi.fn();
            eventBus.on('test-event', callback);

            eventBus.off('test-event', callback);
            eventBus.emit('test-event');

            expect(callback).not.toHaveBeenCalled();
        });

        it('should only remove specified callback', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            eventBus.on('test-event', callback1);
            eventBus.on('test-event', callback2);

            eventBus.off('test-event', callback1);
            eventBus.emit('test-event');

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });

        it('should handle removing non-existent event', () => {
            const callback = vi.fn();
            expect(() => eventBus.off('non-existent', callback)).not.toThrow();
        });

        it('should handle removing non-existent callback', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            eventBus.on('test-event', callback1);

            expect(() => eventBus.off('test-event', callback2)).not.toThrow();
        });
    });

    describe('emit', () => {
        it('should emit event with data', () => {
            const callback = vi.fn();
            eventBus.on('test-event', callback);

            const testData = { key: 'value', number: 42 };
            eventBus.emit('test-event', testData);

            expect(callback).toHaveBeenCalledWith(testData);
        });

        it('should emit event without data', () => {
            const callback = vi.fn();
            eventBus.on('test-event', callback);

            eventBus.emit('test-event');

            expect(callback).toHaveBeenCalledWith(undefined);
        });

        it('should not throw when emitting unregistered event', () => {
            expect(() => eventBus.emit('non-existent')).not.toThrow();
        });

        it('should call all listeners in order', () => {
            const callOrder: number[] = [];

            eventBus.on('test-event', () => callOrder.push(1));
            eventBus.on('test-event', () => callOrder.push(2));
            eventBus.on('test-event', () => callOrder.push(3));

            eventBus.emit('test-event');

            expect(callOrder).toEqual([1, 2, 3]);
        });

        it('should handle errors in callbacks', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const callback1 = vi.fn(() => { throw new Error('Test error'); });
            const callback2 = vi.fn();

            eventBus.on('test-event', callback1);
            eventBus.on('test-event', callback2);

            eventBus.emit('test-event');

            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled(); // 应该继续执行
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('once', () => {
        it('should only trigger callback once', () => {
            const callback = vi.fn();
            eventBus.once('test-event', callback);

            eventBus.emit('test-event', 'data1');
            eventBus.emit('test-event', 'data2');
            eventBus.emit('test-event', 'data3');

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith('data1');
        });

        it('should return unsubscribe function', () => {
            const callback = vi.fn();
            const unsubscribe = eventBus.once('test-event', callback);

            unsubscribe();
            eventBus.emit('test-event');

            expect(callback).not.toHaveBeenCalled();
        });

        it('should work alongside regular listeners', () => {
            const onceCallback = vi.fn();
            const regularCallback = vi.fn();

            eventBus.once('test-event', onceCallback);
            eventBus.on('test-event', regularCallback);

            eventBus.emit('test-event');
            eventBus.emit('test-event');

            expect(onceCallback).toHaveBeenCalledTimes(1);
            expect(regularCallback).toHaveBeenCalledTimes(2);
        });
    });

    describe('clear', () => {
        it('should remove all event listeners', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            eventBus.on('event1', callback1);
            eventBus.on('event2', callback2);

            eventBus.clear();

            eventBus.emit('event1');
            eventBus.emit('event2');

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
        });

        it('should allow registering new listeners after clear', () => {
            const callback = vi.fn();

            eventBus.on('test-event', callback);
            eventBus.clear();

            const newCallback = vi.fn();
            eventBus.on('test-event', newCallback);
            eventBus.emit('test-event');

            expect(callback).not.toHaveBeenCalled();
            expect(newCallback).toHaveBeenCalled();
        });
    });

    describe('复杂场景', () => {
        it('should handle rapid emit and unsubscribe', () => {
            const callback = vi.fn();
            const unsubscribe = eventBus.on('test-event', callback);

            for (let i = 0; i < 100; i++) {
                eventBus.emit('test-event', i);
            }

            expect(callback).toHaveBeenCalledTimes(100);

            unsubscribe();

            for (let i = 0; i < 100; i++) {
                eventBus.emit('test-event', i);
            }

            expect(callback).toHaveBeenCalledTimes(100); // Still 100
        });

        it('should handle nested emit calls', () => {
            const callback1 = vi.fn(() => {
                eventBus.emit('event2', 'nested');
            });
            const callback2 = vi.fn();

            eventBus.on('event1', callback1);
            eventBus.on('event2', callback2);

            eventBus.emit('event1');

            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalledWith('nested');
        });

        it('should handle self-unsubscription in callback', () => {
            let unsubscribe: (() => void) | null = null;
            const callback = vi.fn(() => {
                if (unsubscribe) unsubscribe();
            });

            unsubscribe = eventBus.on('test-event', callback);

            eventBus.emit('test-event');
            eventBus.emit('test-event');

            expect(callback).toHaveBeenCalledTimes(1);
        });
    });
});
