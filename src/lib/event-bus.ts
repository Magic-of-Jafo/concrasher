// A simple publish-subscribe event bus
type EventHandler = (data?: any) => void;

interface Events {
    [eventName: string]: EventHandler[];
}

const events: Events = {};

const eventBus = {
    on(eventName: string, handler: EventHandler) {
        if (!events[eventName]) {
            events[eventName] = [];
        }
        events[eventName].push(handler);
    },
    off(eventName: string, handler: EventHandler) {
        if (!events[eventName]) {
            return;
        }
        events[eventName] = events[eventName].filter(h => h !== handler);
    },
    emit(eventName: string, data?: any) {
        if (!events[eventName]) {
            return;
        }
        events[eventName].forEach(handler => handler(data));
    }
};

export default eventBus; 