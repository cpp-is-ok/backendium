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

export type WebSocketHeadEventType = {event: string};
export type WebSocketHeadType = WebSocketHeadEventType | {operation: string, operationConfig: string};

export type BackendiumWebSocketEvents<InitDataType> = {
    notEventMessage: [Buffer, BackendiumWebSocket<InitDataType>, Backendium, boolean],
    unknownEvent: [Buffer, BackendiumWebSocket<InitDataType>, Backendium, WebSocketHeadEventType],
    parsingFailed: [Buffer, BackendiumWebSocket<InitDataType>, Backendium, Validator<any> | undefined],
    initParsingFailed: [Buffer, WebSocket & WebSocketExtension, Backendium, Validator<any> | undefined],
    initFailed: [Buffer, WebSocket & WebSocketExtension, Backendium],
    accept: [BackendiumWebSocket<InitDataType>, WebSocketRouteConstructor<InitDataType>, Backendium],
    reject: [Request, WSResponse, Backendium, number | undefined, string | undefined],
    message: [Buffer, BackendiumWebSocket<InitDataType>, Backendium, boolean],
    messageBeforeEvents: [Buffer, BackendiumWebSocket<InitDataType>, Backendium, boolean],
    close: [BackendiumWebSocket<InitDataType>, number, Buffer, Backendium],
    error: [BackendiumWebSocket<InitDataType>, Error, Backendium],
    init: [WebSocket & WebSocketExtension, Buffer, Backendium, string],
    upgrade: [BackendiumWebSocket<InitDataType>, IncomingMessage, Backendium],
    open: [BackendiumWebSocket<InitDataType>, Backendium],
    ping: [BackendiumWebSocket<InitDataType>, Buffer, Backendium],
    pong: [BackendiumWebSocket<InitDataType>, Buffer, Backendium],
    unexpectedResponse: [BackendiumWebSocket<InitDataType>, ClientRequest, IncomingMessage, Backendium]
}

export class BackendiumWebSocket<InitDataType> {
    protected eventEmitter = new EventEmitter<BackendiumWebSocketEvents<InitDataType>>;
    protected wsEventEmitter = new EventEmitter<WebSocketEvents<InitDataType>>;
    protected events = new Set<string>;
    protected operations = new EventEmitter<WebSocketOperations<InitDataType>>;
    protected useEvents = false;

    public static rawDataParse(data: WebSocket.RawData): Buffer {
        return data instanceof Buffer ? data : data instanceof ArrayBuffer ? Buffer.from(data) : data.reduce((prev, cur) => Buffer.concat([prev, cur]), Buffer.alloc(0));
    }

    protected parseEventHead(head: string, message: Buffer, socket: BackendiumWebSocket<InitDataType>, app: Backendium): WebSocketHeadType | undefined {
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

    protected emitIncomingEvent(event: string, payload: Buffer, socket: BackendiumWebSocket<InitDataType>, app: Backendium, head: WebSocketHeadEventType) {
        if (this.events.has(event)) this.wsEventEmitter.emit(event, [payload, socket, app]);
        else {
            this.eventEmitter.emit("unknownEvent", [payload, socket, app, head]);
            this.wsConstructor.eventEmitter.emit("unknownEvent", [payload, socket, app, head]);
        }
    }

    protected emitIncomingOperation(operation: string, payload: Buffer, operationConfig: string, socket: BackendiumWebSocket<InitDataType>, app: Backendium) {
        this.operations.emit(operation, [payload, operationConfig, socket, app]);
    }

    protected parseEventMessage(message: Buffer, socket: BackendiumWebSocket<InitDataType>, app: Backendium, isBinary: boolean): void {
        if (isBinary) {
            this.eventEmitter.emit("notEventMessage", [message, socket, app, isBinary]);
            this.wsConstructor.eventEmitter.emit("notEventMessage", [message, socket, app, isBinary]);
            if (app.config.logging?.fullWs) app.logger.wsInputFull(this.url, message);
            else app.logger.wsInput(this.url);
            return;
        }
        try {
            let [head_, ...data] = message.toString().split("\n");
            let payload = Buffer.from(data.join("\n")), head = this.parseEventHead(head_, message, socket, app);
            if (!head) {
                if (app.config.logging?.fullWs) app.logger.wsInputFull(this.url, message);
                else app.logger.wsInput(this.url);
                return;
            }
            if ("event" in head) {
                this.emitIncomingEvent(head.event, payload, socket, app, head);
                if (app.config.logging?.fullWs) app.logger.wsIncomingEventFull(this.url, head.event, payload.length ? payload : null);
                else app.logger.wsIncomingEvent(this.url, head.event);
            }
            else this.emitIncomingOperation(head.operation, payload, head.operationConfig, socket, app);
        } catch (error) {
            this.eventEmitter.emit("notEventMessage", [message, socket, app, isBinary]);
            this.wsConstructor.eventEmitter.emit("notEventMessage", [message, socket, app, isBinary]);
            if (app.config.logging?.fullWs) app.logger.wsInputFull(this.url, message);
            else app.logger.wsInput(this.url);
            return;
        }
    }

    constructor(public socket: WebSocket & WebSocketExtension, public wsConstructor: WebSocketRouteConstructor<InitDataType>, public app: Backendium, public initData: InitDataType, public url: string) {
        this.eventEmitter.emit("accept", [this, this.wsConstructor, app]);
        this.wsConstructor.eventEmitter.emit("accept", [this, this.wsConstructor, app]);
        socket.on("message", (data, isBinary) => {
            let buffer = BackendiumWebSocket.rawDataParse(data);
            if (this.useEvents) {
                this.eventEmitter.emit("messageBeforeEvents", [buffer, this, app, isBinary]);
                this.wsConstructor.eventEmitter.emit("messageBeforeEvents", [buffer, this, app, isBinary]);
                this.parseEventMessage(buffer, this, app, isBinary);
            }
            else {
                this.eventEmitter.emit("notEventMessage", [buffer, this, app, isBinary]);
                this.wsConstructor.eventEmitter.emit("notEventMessage", [buffer, this, app, isBinary]);
                if (app.config.logging?.fullWs) app.logger.wsInputFull(url, data);
                else app.logger.wsInput(url);
            }
            this.eventEmitter.emit("message", [buffer, this, app, isBinary]);
            this.wsConstructor.eventEmitter.emit("message", [buffer, this, app, isBinary]);
        });
        socket.on("close", (code, reason) => {
            this.eventEmitter.emit("close", [this, code, reason, app]);
            this.wsConstructor.eventEmitter.emit("close", [this, code, reason, app]);
            app.logger.wsClose(url);
        });
        socket.on("upgrade", (request) => {
            this.eventEmitter.emit("upgrade", [this, request, app]);
            this.wsConstructor.eventEmitter.emit("upgrade", [this, request, app]);
        });
        socket.on("open", () => {
            this.eventEmitter.emit("open", [this, app]);
            this.wsConstructor.eventEmitter.emit("open", [this, app]);
        });
        socket.on("ping", (buffer) => {
            this.eventEmitter.emit("ping", [this, buffer, app]);
            this.wsConstructor.eventEmitter.emit("ping", [this, buffer, app]);
        });
        socket.on("pong", (buffer) => {
            this.eventEmitter.emit("pong", [this, buffer, app]);
            this.wsConstructor.eventEmitter.emit("pong", [this, buffer, app]);
        });
        socket.on("unexpected-response", (clientResponse, request) => {
            this.eventEmitter.emit("unexpectedResponse", [this, clientResponse, request, app]);
            this.wsConstructor.eventEmitter.emit("unexpectedResponse", [this, clientResponse, request, app]);
        });
    }

    public static eventNameCheck(str: string) {
        if (str.includes("$")) throw new Error("event name cannot contain '$'");
    }

    public event<Type extends Buffer>(event: string, callback: (data: Type, socket: BackendiumWebSocket<InitDataType>, app: Backendium) => void): void;
    public event<Type>(event: string, callback: (data: Type, socket: BackendiumWebSocket<InitDataType>, app: Backendium, validator: Validator<Type>) => void, validator: Validator<Type>): void;

    public event<Type>(event: string, callback: (data: Type, socket: BackendiumWebSocket<InitDataType>, app: Backendium, validator: Validator<Type>) => void, validator?: Validator<Type>): void {
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

    public operation<E extends EventKey<WebSocketOperations<InitDataType>>>(event: E, subscriber: (...args: WebSocketOperations<InitDataType>[E]) => void): void {
        BackendiumWebSocket.eventNameCheck(event);
        this.operations.on(event, (args) => subscriber(...args));
    };

    public on<E extends EventKey<BackendiumWebSocketEvents<InitDataType>>>(event: E, subscriber: (...args: BackendiumWebSocketEvents<InitDataType>[E]) => void): () => void {
        return this.eventEmitter.on(event, (args) => subscriber(...args));
    };

    public once<E extends EventKey<BackendiumWebSocketEvents<InitDataType>>>(event: E, subscriber: (...args: BackendiumWebSocketEvents<InitDataType>[E]) => void): () => void {
        return this.eventEmitter.once(event, (args) => subscriber(...args));
    };

    public off<E extends EventKey<BackendiumWebSocketEvents<InitDataType>>>(event: E, subscriber: (...args: BackendiumWebSocketEvents<InitDataType>[E]) => void): void {
        this.eventEmitter.off(event, (args) => subscriber(...args));
    };

    protected _send(data: any) {
        if (!(data instanceof Buffer) && typeof data === "object" || typeof data === "boolean") data = JSON.stringify(data);
        this.socket.send(data);
    }

    send(data: any) {
        this._send(data);
        if (this.app.config.logging?.fullWs) this.app.logger.wsOutputFull(this.url, data);
        else this.app.logger.wsOutput(this.url);
    }

    protected static AnyToString(data: any): string {
        return typeof data === "string" ? data : data instanceof Buffer ? data.toString() : data === undefined ? "undefined" : (typeof data === "number" && isNaN(data)) ? "NaN" : JSON.stringify(data);
    }

    emit(event: string, payload?: any) {
        BackendiumWebSocket.eventNameCheck(event);
        this._send(`$${event}\n${BackendiumWebSocket.AnyToString(payload)}`);
        if (this.app.config.logging?.fullWs) this.app.logger.wsOutgoingEventFull(this.url, event, payload);
        else this.app.logger.wsOutgoingEvent(this.url, event);
    }

    emitOperation(event: string, operationConfig: any, payload: any) {
        BackendiumWebSocket.eventNameCheck(event);
        this._send(`$$${event}$${BackendiumWebSocket.AnyToString(operationConfig)}\n${BackendiumWebSocket.AnyToString(payload)}`);
    }
}

export type WebSocketEvents<InitDataType> = {
    [key: string]: [Buffer, BackendiumWebSocket<InitDataType>, Backendium];
};

export type WebSocketOperations<InitDataType> = {
    [key: string]: [Buffer, string, BackendiumWebSocket<InitDataType>, Backendium];
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

export class WebSocketRouteConstructor<InitDataType> {
    protected sockets: Array<BackendiumWebSocket<InitDataType>> = []
    public eventEmitter = new EventEmitter<BackendiumWebSocketEvents<InitDataType>>;
    protected acceptRejectFn: ((request: Request, response: WSResponse, app: Backendium) => Promise<[boolean, number | undefined, string | undefined]>) | undefined;
    protected eventHandlers: Array<[string, (data: any, socket: BackendiumWebSocket<InitDataType>, app: Backendium, validator: Validator<any>) => void, Validator<any> | undefined]> = []
    protected operations = new EventEmitter<WebSocketOperations<InitDataType>>;
    protected initRequired = false;

    protected _backendiumWebsocket(socket: WebSocket & WebSocketExtension, app: Backendium, initData: InitDataType, url: string) {
        let backendiumSocket = new BackendiumWebSocket<InitDataType>(socket, this, app, initData, url);
        // @ts-ignore
        this.eventHandlers.forEach(([event, socket, validator]) => backendiumSocket.event(event, socket, validator));
    }

    public async _handle(request: Request, response: WSResponse, next: NextFunction, app: Backendium): Promise<void> {
        if (this.acceptRejectFn) {
            let [flag, code, message] = await this.acceptRejectFn(request, response, app);
            if (!flag) {
                response.reject(code, message);
                app.logger.wsRejected(request.originalUrl);
                this.eventEmitter.emit("reject", [request, response, app, code, message]);
                return;
            }
        }
        let socket = await response.accept();
        app.logger.wsConnected(request.originalUrl);
        if (this.initRequired) {
            socket.once("message", (data) => {
                this.eventEmitter.emit("init", [socket, BackendiumWebSocket.rawDataParse(data), app, request.originalUrl]);
            });
        }
        // @ts-ignore
        else this._backendiumWebsocket(socket, app, undefined, request.originalUrl);
    }

    public acceptReject(callback: (request: Request, response: WSResponse, app: Backendium) => AcceptResponseCallbackReturnType | Promise<AcceptResponseCallbackReturnType>): WebSocketRouteConstructor<InitDataType> {
        this.acceptRejectFn = async (request: Request, response: WSResponse, app: Backendium) => {
            let ans = callback(request, response, app), data: AcceptResponseCallbackReturnType;
            if (ans instanceof Promise) data = await ans;
            else data = ans;
            return typeof data === "boolean" ? [data, undefined, undefined] : [false, data[0], data[1]];
        };
        return this;
    }

    public event<Type extends Buffer>(event: string, callback: (data: Type, socket: BackendiumWebSocket<InitDataType>, app: Backendium) => void): WebSocketRouteConstructor<InitDataType>;
    public event<Type>(event: string, callback: (data: Type, socket: BackendiumWebSocket<InitDataType>, app: Backendium, validator: Validator<Type>) => void, validator: Validator<Type>): WebSocketRouteConstructor<InitDataType>;

    public event<Type>(event: string, callback: (data: Type, socket: BackendiumWebSocket<InitDataType>, app: Backendium, validator: Validator<Type>) => void, validator?: Validator<Type>): WebSocketRouteConstructor<InitDataType> {
        BackendiumWebSocket.eventNameCheck(event);
        // @ts-ignore
        this.sockets.forEach(socket => socket.event(event, callback, validator));
        this.eventHandlers.push([event, callback, validator]);
        return this;
    }

    public operation<E extends EventKey<WebSocketOperations<InitDataType>>>(event: E, subscriber: (...args: WebSocketOperations<InitDataType>[E]) => void): void {
        BackendiumWebSocket.eventNameCheck(event);
        this.operations.on(event, (args) => subscriber(...args));
    }

    public on_<E extends EventKey<BackendiumWebSocketEvents<InitDataType>>>(event: E, subscriber: (...args: BackendiumWebSocketEvents<InitDataType>[E]) => void): () => void {
        return this.eventEmitter.on(event, (args) => subscriber(...args));
    }

    public once_<E extends EventKey<BackendiumWebSocketEvents<InitDataType>>>(event: E, subscriber: (...args: BackendiumWebSocketEvents<InitDataType>[E]) => void): () => void {
        return this.eventEmitter.once(event, (args) => subscriber(...args));
    }

    public on<E extends EventKey<BackendiumWebSocketEvents<InitDataType>>>(event: E, subscriber: (...args: BackendiumWebSocketEvents<InitDataType>[E]) => void): WebSocketRouteConstructor<InitDataType> {
        this.eventEmitter.on(event, (args) => subscriber(...args));
        return this;
    }

    public once<E extends EventKey<BackendiumWebSocketEvents<InitDataType>>>(event: E, subscriber: (...args: BackendiumWebSocketEvents<InitDataType>[E]) => void): WebSocketRouteConstructor<InitDataType> {
        this.eventEmitter.once(event, (args) => subscriber(...args));
        return this;
    }

    public off<E extends EventKey<BackendiumWebSocketEvents<InitDataType>>>(event: E, subscriber: (...args: BackendiumWebSocketEvents<InitDataType>[E]) => void): WebSocketRouteConstructor<InitDataType> {
        this.eventEmitter.off(event, (args) => subscriber(...args));
        return this;
    }
    
    public requireInit<Type>(callback: (connection: WebSocket & WebSocketExtension, data: Type, app: Backendium) => null | InitDataType | Promise<null | InitDataType>, validator: Validator<Type>) {
        this.initRequired = true;
        this.on("init", async (socket, data, app, url) => {
            let [mainData, parsed] = validator ? parse(data, validator) : [data, true];
            if (!parsed || !mainData) {
                this.eventEmitter.emit("initParsingFailed", [data, socket, app, validator]);
                if (app.config.logging?.fullWs) app.logger.wsInitFailedFull(url, data);
                else app.logger.wsInitFailed(url);
                return;
            }
            // @ts-ignore
            let ret = callback(socket, mainData, app);
            if (ret instanceof Promise) ret = await ret;
            if (ret !== null) {
                if (app.config.logging?.fullWs) app.logger.wsInitFull(url, mainData);
                else app.logger.wsInit(url);
                this._backendiumWebsocket(socket, app, ret, url);
            }
            else {
                this.eventEmitter.emit("initFailed", [data, socket, app]);
                if (app.config.logging?.fullWs) app.logger.wsInitFailedFull(url, mainData);
                else app.logger.wsInitFailed(url);
            }
        });
    }
}

// @TODO error handling +termination logging