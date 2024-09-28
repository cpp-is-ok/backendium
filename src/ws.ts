import {NextFunction, Request} from "express";
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

export type BackendiumWebSocket = WebSocket & WebSocketExtension;

export type WebSocketRouteConstructorEvents = {
    reject: [Request, WSResponse, Backendium, number | undefined, string | undefined],
    parsingFailed: [Buffer, BackendiumWebSocket, Backendium, Validator<any> | undefined],
    message: [Buffer, BackendiumWebSocket, Backendium, boolean],
    messageBeforeEvents: [Buffer, BackendiumWebSocket, Backendium, boolean],
    close: [BackendiumWebSocket, number, Buffer, Backendium],
    error: [BackendiumWebSocket, Error, Backendium],
    upgrade: [BackendiumWebSocket, IncomingMessage, Backendium],
    open: [BackendiumWebSocket, Backendium],
    ping: [BackendiumWebSocket, Buffer, Backendium],
    pong: [BackendiumWebSocket, Buffer, Backendium],
    unexpectedResponse: [BackendiumWebSocket, ClientRequest, IncomingMessage, Backendium],
    unknownEvent: [Buffer, BackendiumWebSocket, Backendium, boolean]
};

export type WebSocketEvents = {
    [key: string]: [Buffer, BackendiumWebSocket, Backendium];
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
    protected eventEmitter = new EventEmitter<WebSocketRouteConstructorEvents>;
    protected wsEventEmitter = new EventEmitter<WebSocketEvents>;
    protected useEvents = false;
    protected acceptRejectFn: ((request: Request, response: WSResponse, app: Backendium) => Promise<[boolean, number | undefined, string | undefined]>) | undefined;

    public static rawDataParse(data: WebSocket.RawData): Buffer {
        return data instanceof Buffer ? data : data instanceof ArrayBuffer ? Buffer.from(data) : data.reduce((prev, cur) => Buffer.concat([prev, cur]), Buffer.alloc(0));
    }

    protected parseEventMessage(message: string) {

    }

    public async _handle(request: Request, response: WSResponse, next: NextFunction, app: Backendium): Promise<void> {
        if (this.acceptRejectFn) {
            let [flag, code, message] = await this.acceptRejectFn(request, response, app);
            if (!flag) {
                response.reject(code, message);
                this.eventEmitter.emit("reject", [request, response, app, code, message]);
                return;
            }
        }
        let socket: BackendiumWebSocket = await response.accept();
        socket.on("message", (data, isBinary) => {
            let buffer = WebSocketRouteConstructor.rawDataParse(data);
            this.eventEmitter.emit("messageBeforeEvents", [buffer, socket, app, isBinary]);
            this.eventEmitter.emit("message", [buffer, socket, app, isBinary]);
        });
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
        this.useEvents = true;
        this.wsEventEmitter.on(event, ([data, socket, app]) => {
            let [mainData, parsed] = validator ? parse(data, validator) : [data, true];
            if (!parsed || !mainData) {
                this.eventEmitter.emit("parsingFailed", [data, socket, app, validator]);
                return;
            }
            // @ts-ignore
            callback(mainData, socket, app, validator ?? bufferValidator);
        });
        return this;
    }

    public on_<E extends EventKey<WebSocketRouteConstructorEvents>>(event: E, subscriber: (...args: WebSocketRouteConstructorEvents[E]) => void): () => void {
        return this.eventEmitter.on(event, (args) => subscriber(...args));
    };

    public once_<E extends EventKey<WebSocketRouteConstructorEvents>>(event: E, subscriber: (...args: WebSocketRouteConstructorEvents[E]) => void): () => void {
        return this.eventEmitter.once(event, (args) => subscriber(...args));
    };

    public on<E extends EventKey<WebSocketRouteConstructorEvents>>(event: E, subscriber: (...args: WebSocketRouteConstructorEvents[E]) => void): WebSocketRouteConstructor {
        this.eventEmitter.on(event, (args) => subscriber(...args));
        return this;
    };

    public once<E extends EventKey<WebSocketRouteConstructorEvents>>(event: E, subscriber: (...args: WebSocketRouteConstructorEvents[E]) => void): WebSocketRouteConstructor {
        this.eventEmitter.once(event, (args) => subscriber(...args));
        return this;
    };

    public off<E extends EventKey<WebSocketRouteConstructorEvents>>(event: E, subscriber: (...args: WebSocketRouteConstructorEvents[E]) => void): void {
        this.eventEmitter.off(event, (args) => subscriber(...args));
    };
}