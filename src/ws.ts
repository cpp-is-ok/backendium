import e, {NextFunction, Request} from "express";
import {WSResponse} from "websocket-express";
import Backendium from "./index.js";
import {EventEmitter, EventKey} from "event-emitter-typescript";
import {ValidationError, Validator} from "checkeasy";
import * as WebSocket from "ws";
import {ClientRequest, IncomingMessage} from "node:http";

interface NextMessageOptions {
    timeout?: number | undefined;
}

interface WebSocketMessage {
    data: Buffer;
    isBinary: boolean;
}

interface WebSocketExtension {
    nextMessage(options?: NextMessageOptions): Promise<WebSocketMessage>;
}

export type WebSocketHeadEventType = {event: string};
export type WebSocketHeadType = WebSocketHeadEventType | {operation: string, operationConfig: string};

export type BackendiumWebSocketEvents = {
    notEventMessage: [Buffer, BackendiumWebSocket, Backendium, boolean],
    unknownEvent: [Buffer, BackendiumWebSocket, Backendium, WebSocketHeadEventType],
    parsingFailed: [Buffer, BackendiumWebSocket, Backendium, Validator<any> | undefined],
    accept: [BackendiumWebSocket, WebSocketRouteConstructor, Backendium],
    reject: [Request, WSResponse, Backendium, number | undefined, string | undefined],
    message: [Buffer, BackendiumWebSocket, Backendium, boolean],
    messageBeforeEvents: [Buffer, BackendiumWebSocket, Backendium, boolean],
    close: [BackendiumWebSocket, number, Buffer, Backendium],
    error: [BackendiumWebSocket, Error, Backendium],
    upgrade: [BackendiumWebSocket, IncomingMessage, Backendium], // @TODO
    open: [BackendiumWebSocket, Backendium],
    ping: [BackendiumWebSocket, Buffer, Backendium],
    pong: [BackendiumWebSocket, Buffer, Backendium],
    unexpectedResponse: [BackendiumWebSocket, ClientRequest, IncomingMessage, Backendium]
}

// export type BackendiumWebSocket = WebSocket & WebSocketExtension;

export class BackendiumWebSocket {
    protected eventEmitter = new EventEmitter<BackendiumWebSocketEvents>;
    protected wsEventEmitter = new EventEmitter<WebSocketEvents>;
    protected events = new Set<string>;
    protected operations = new EventEmitter<WebSocketOperations>;
    protected useEvents = false;

    public static rawDataParse(data: WebSocket.RawData): Buffer {
        return data instanceof Buffer ? data : data instanceof ArrayBuffer ? Buffer.from(data) : data.reduce((prev, cur) => Buffer.concat([prev, cur]), Buffer.alloc(0));
    }

    protected parseEventHead(head: string, message: Buffer, socket: BackendiumWebSocket, app: Backendium): WebSocketHeadType | undefined {
        if (head.length < 1 || !head.startsWith("$")) {
            this.eventEmitter.emit("notEventMessage", [message, socket, app, false]);
            this.wsConstructor.eventEmitter.emit("notEventMessage", [message, socket, app, false]);
            return;
        }
        let [, name, ...other] = head.split('$');
        if (name.length) return {event: name.trim()};
        let [operation, ...operationConfig] = other;
        return {operation: operation.trim(), operationConfig: operationConfig.join('$').trim()};
    }

    protected emitIncomingEvent(event: string, payload: Buffer, socket: BackendiumWebSocket, app: Backendium, head: WebSocketHeadEventType) {
        if (this.events.has(event)) this.wsEventEmitter.emit(event, [payload, socket, app]);
        else {
            this.eventEmitter.emit("unknownEvent", [payload, socket, app, head]);
            this.wsConstructor.eventEmitter.emit("unknownEvent", [payload, socket, app, head]);
        }
    }

    protected emitIncomingOperation(operation: string, payload: Buffer, operationConfig: string, socket: BackendiumWebSocket, app: Backendium) {
        app.websocketOperations.emit(operation, [payload, operationConfig, socket, app]);
        this.operations.emit(operation, [payload, operationConfig, socket, app]);
    }

    protected parseEventMessage(message: Buffer, socket: BackendiumWebSocket, app: Backendium, isBinary: boolean): void {
        if (isBinary) {
            this.eventEmitter.emit("notEventMessage", [message, socket, app, isBinary]);
            this.wsConstructor.eventEmitter.emit("notEventMessage", [message, socket, app, isBinary]);
            return;
        }
        try {
            let [head_, ...data] = message.toString().split("\n");
            let payload = Buffer.from(data.join("\n")), head = this.parseEventHead(head_, message, socket, app);
            if (!head) return;
            if ("event" in head) this.emitIncomingEvent(head.event, payload, socket, app, head);
            else this.emitIncomingOperation(head.operation, payload, head.operationConfig, socket, app);
        } catch (error) {
            this.eventEmitter.emit("notEventMessage", [message, socket, app, isBinary]);
            this.wsConstructor.eventEmitter.emit("notEventMessage", [message, socket, app, isBinary]);
            return;
        }
    }

    constructor(public socket: WebSocket & WebSocketExtension, public wsConstructor: WebSocketRouteConstructor, app: Backendium) {
        this.eventEmitter.emit("accept", [this, this.wsConstructor, app]);
        this.wsConstructor.eventEmitter.emit("accept", [this, this.wsConstructor, app]);
        socket.on("message", (data, isBinary) => {
            let buffer = BackendiumWebSocket.rawDataParse(data);
            if (this.useEvents) {
                this.eventEmitter.emit("messageBeforeEvents", [buffer, this, app, isBinary]);
                this.wsConstructor.eventEmitter.emit("messageBeforeEvents", [buffer, this, app, isBinary]);
                this.parseEventMessage(buffer, this, app, isBinary);
            }
            this.eventEmitter.emit("message", [buffer, this, app, isBinary]);
            this.wsConstructor.eventEmitter.emit("message", [buffer, this, app, isBinary]);
            this.eventEmitter.emit("notEventMessage", [buffer, this, app, isBinary]);
            this.wsConstructor.eventEmitter.emit("notEventMessage", [buffer, this, app, isBinary]);
        });
    }

    public static eventNameCheck(str: string) {
        if (str.includes("$")) throw new Error("event name cannot contain '$'");
    }

    public event<Type extends Buffer>(event: string, callback: (data: Type, socket: BackendiumWebSocket, app: Backendium) => void): void;
    public event<Type>(event: string, callback: (data: Type, socket: BackendiumWebSocket, app: Backendium, validator: Validator<Type>) => void, validator: Validator<Type>): void;

    public event<Type>(event: string, callback: (data: Type, socket: BackendiumWebSocket, app: Backendium, validator: Validator<Type>) => void, validator?: Validator<Type>): void {
        this.useEvents = true;
        event = event.trim();
        BackendiumWebSocket.eventNameCheck(event);
        this.events.add(event);
        this.wsEventEmitter.on(event, ([data, socket, app]) => {
            let [mainData, parsed] = validator ? parse(data, validator) : [data, true];
            if (!parsed || !mainData) {
                this.eventEmitter.emit("parsingFailed", [data, socket, app, validator]);
                this.wsConstructor.eventEmitter.emit("parsingFailed", [data, socket, app, validator]);
                return;
            }
            // @ts-ignore
            callback(mainData, socket, app, validator ?? bufferValidator);
        });
    }

    public operation<E extends EventKey<WebSocketOperations>>(event: E, subscriber: (...args: WebSocketOperations[E]) => void): void {
        BackendiumWebSocket.eventNameCheck(event);
        this.operations.on(event, (args) => subscriber(...args));
    };

    public on<E extends EventKey<BackendiumWebSocketEvents>>(event: E, subscriber: (...args: BackendiumWebSocketEvents[E]) => void): () => void {
        return this.eventEmitter.on(event, (args) => subscriber(...args));
    };

    public once<E extends EventKey<BackendiumWebSocketEvents>>(event: E, subscriber: (...args: BackendiumWebSocketEvents[E]) => void): () => void {
        return this.eventEmitter.once(event, (args) => subscriber(...args));
    };

    public off<E extends EventKey<BackendiumWebSocketEvents>>(event: E, subscriber: (...args: BackendiumWebSocketEvents[E]) => void): void {
        this.eventEmitter.off(event, (args) => subscriber(...args));
    };

    send(data: any) {
        if (!(data instanceof Buffer) && typeof data === "object" || typeof data === "boolean") data = JSON.stringify(data);
        this.socket.send(data);
    }

    protected static AnyToString(data: any): string {
        return typeof data === "string" ? data : data instanceof Buffer ? data.toString() : data === undefined ? "undefined" : (typeof data === "number" && isNaN(data)) ? "NaN" : JSON.stringify(data);
    }

    emit(event: string, payload?: any) {
        BackendiumWebSocket.eventNameCheck(event);
        this.send(`$${event}\n${BackendiumWebSocket.AnyToString(payload)}`);
    }

    emitOperation(event: string, operationConfig: any, payload: any) {
        BackendiumWebSocket.eventNameCheck(event);
        this.send(`$$${event}$${BackendiumWebSocket.AnyToString(operationConfig)}\n${BackendiumWebSocket.AnyToString(payload)}`);
    }
}

export type WebSocketEvents = {
    [key: string]: [Buffer, BackendiumWebSocket, Backendium];
};

export type WebSocketOperations = {
    [key: string]: [Buffer, string, BackendiumWebSocket, Backendium];
};

const bufferValidator: Validator<Buffer> = (value: any, path: string) => {
    if (value instanceof Buffer) return value;
    throw new ValidationError(`[${path}] is not buffer`);
};

function parse<Type>(data: Buffer, validator: Validator<Type>): [Type, true] | [null, false] {
    try {
        return [validator(data, ""), true];
    }
    catch (error) {
        try {
            return [validator(data.toString(), ""), true];
        }
        catch (error) {
            try {
                return [validator(JSON.parse(data.toString()), ""), true];
            }
            catch (error) {
                return [null, false];
            }
        }
    }
}

export type AcceptResponseCallbackReturnType = boolean | [number | undefined] | [number | undefined, string | undefined];

export class WebSocketRouteConstructor {
    protected sockets: Array<BackendiumWebSocket> = []
    public eventEmitter = new EventEmitter<BackendiumWebSocketEvents>;
    protected acceptRejectFn: ((request: Request, response: WSResponse, app: Backendium) => Promise<[boolean, number | undefined, string | undefined]>) | undefined;
    protected eventHandlers: Array<[string, (data: any, socket: BackendiumWebSocket, app: Backendium, validator: Validator<any>) => void, Validator<any> | undefined]> = []
    protected operations = new EventEmitter<WebSocketOperations>;

    public async _handle(request: Request, response: WSResponse, next: NextFunction, app: Backendium): Promise<void> {
        if (this.acceptRejectFn) {
            let [flag, code, message] = await this.acceptRejectFn(request, response, app);
            if (!flag) {
                response.reject(code, message);
                this.eventEmitter.emit("reject", [request, response, app, code, message]);
                return;
            }
        }
        let socket = await response.accept(), backendiumSocket = new BackendiumWebSocket(socket, this, app);
        // @ts-ignore
        this.eventHandlers.forEach(([event, socket, validator]) => backendiumSocket.event(event, socket, validator));
    }

    public acceptReject(callback: (request: Request, response: WSResponse, app: Backendium) => AcceptResponseCallbackReturnType | Promise<AcceptResponseCallbackReturnType>): WebSocketRouteConstructor {
        this.acceptRejectFn = async (request: Request, response: WSResponse, app: Backendium) => {
            let ans = callback(request, response, app), data: AcceptResponseCallbackReturnType;
            if (ans instanceof Promise) data = await ans;
            else data = ans;
            return typeof data === "boolean" ? [data, undefined, undefined] : [false, data[0], data[1]];
        };
        return this;
    }

    public event<Type extends Buffer>(event: string, callback: (data: Type, socket: BackendiumWebSocket, app: Backendium) => void): WebSocketRouteConstructor;
    public event<Type>(event: string, callback: (data: Type, socket: BackendiumWebSocket, app: Backendium, validator: Validator<Type>) => void, validator: Validator<Type>): WebSocketRouteConstructor;

    public event<Type>(event: string, callback: (data: Type, socket: BackendiumWebSocket, app: Backendium, validator: Validator<Type>) => void, validator?: Validator<Type>): WebSocketRouteConstructor {
        BackendiumWebSocket.eventNameCheck(event);
        // @ts-ignore
        this.sockets.forEach(socket => socket.event(event, callback, validator));
        this.eventHandlers.push([event, callback, validator]);
        return this;
    }

    public operation<E extends EventKey<WebSocketOperations>>(event: E, subscriber: (...args: WebSocketOperations[E]) => void): void {
        BackendiumWebSocket.eventNameCheck(event);
        this.operations.on(event, (args) => subscriber(...args));
    };

    public on_<E extends EventKey<BackendiumWebSocketEvents>>(event: E, subscriber: (...args: BackendiumWebSocketEvents[E]) => void): () => void {
        return this.eventEmitter.on(event, (args) => subscriber(...args));
    };

    public once_<E extends EventKey<BackendiumWebSocketEvents>>(event: E, subscriber: (...args: BackendiumWebSocketEvents[E]) => void): () => void {
        return this.eventEmitter.once(event, (args) => subscriber(...args));
    };

    public on<E extends EventKey<BackendiumWebSocketEvents>>(event: E, subscriber: (...args: BackendiumWebSocketEvents[E]) => void): WebSocketRouteConstructor {
        this.eventEmitter.on(event, (args) => subscriber(...args));
        return this;
    };

    public once<E extends EventKey<BackendiumWebSocketEvents>>(event: E, subscriber: (...args: BackendiumWebSocketEvents[E]) => void): WebSocketRouteConstructor {
        this.eventEmitter.once(event, (args) => subscriber(...args));
        return this;
    };

    public off<E extends EventKey<BackendiumWebSocketEvents>>(event: E, subscriber: (...args: BackendiumWebSocketEvents[E]) => void): WebSocketRouteConstructor {
        this.eventEmitter.off(event, (args) => subscriber(...args));
        return this;
    };
}

// @TODO init operation