import {NextFunction, Request} from "express";
import {WSResponse} from "websocket-express";
import Backendium from "./index.js";
import {EventEmitter, EventKey} from "event-emitter-typescript";
import {ValidationError, Validator} from "checkeasy";
import * as WebSocket from "ws";

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
    reject: [Request, WSResponse, Backendium],
    parsingFailed: [Buffer, BackendiumWebSocket, Backendium, Validator<any> | undefined],
    message: [Buffer, BackendiumWebSocket, Backendium],
    messageBeforeEvents: [Buffer, BackendiumWebSocket, Backendium]
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

export class WebSocketRouteConstructor {
    protected eventEmitter = new EventEmitter<WebSocketRouteConstructorEvents>;
    protected wsEventEmitter = new EventEmitter<WebSocketEvents>;
    protected useEvents = false;
    protected acceptRejectFn: ((request: Request, response: WSResponse, app: Backendium) => Promise<boolean>) | undefined;

    public async _handle(request: Request, response: WSResponse, next: NextFunction, app: Backendium): Promise<void> {
        if (this.acceptRejectFn && !(await this.acceptRejectFn(request, response, app))) {
            response.reject();
            this.eventEmitter.emit("reject", [request, response, app]);
            return;
        }
        let socket: BackendiumWebSocket = await response.accept();

    }

    public acceptReject(callback: (request: Request, response: WSResponse, app: Backendium) => boolean | Promise<boolean>): WebSocketRouteConstructor {
        this.acceptRejectFn = async (request: Request, response: WSResponse, app: Backendium) => {
            let ans = callback(request, response, app);
            if (ans instanceof Promise) return await ans;
            return ans;
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