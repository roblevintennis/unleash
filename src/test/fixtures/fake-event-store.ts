import EventEmitter from 'events';
import { IEventStore } from '../../lib/types/stores/event-store';
import { IEvent } from '../../lib/types/model';

class FakeEventStore extends EventEmitter implements IEventStore {
    events: IEvent[];

    constructor() {
        super();
        this.setMaxListeners(0);
        this.events = [];
    }

    store(event: IEvent): Promise<void> {
        this.events.push(event);
        this.emit(event.type, event);
        return Promise.resolve();
    }

    batchStore(events: IEvent[]): Promise<void> {
        events.forEach((event) => {
            this.events.push(event);
            this.emit(event.type, event);
        });
        return Promise.resolve();
    }

    async getEvents(): Promise<IEvent[]> {
        return this.events;
    }

    async delete(key: number): Promise<void> {
        this.events.splice(
            this.events.findIndex((t) => t.id === key),
            1,
        );
    }

    async deleteAll(): Promise<void> {
        this.events = [];
    }

    destroy(): void {}

    async exists(key: number): Promise<boolean> {
        return this.events.some((e) => e.id === key);
    }

    async get(key: number): Promise<IEvent> {
        return this.events.find((e) => e.id === key);
    }

    async getAll(): Promise<IEvent[]> {
        return this.events;
    }

    async getEventsFilterByType(type: string): Promise<IEvent[]> {
        return this.events.filter((e) => e.type === type);
    }

    async getEventsFilterByProject(project: string): Promise<IEvent[]> {
        return this.events.filter((e) => e.project === project);
    }
}

module.exports = FakeEventStore;
export default FakeEventStore;
