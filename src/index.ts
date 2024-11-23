import {Request, RequestHandler} from "express";
import {Server} from "node:http";
import {BackendiumRouter, MethodType} from "./router.js";
import {EventEmitter, EventKey} from "event-emitter-typescript";
import {WebSocketExpress, WSRequestHandler} from "websocket-express";
import {BackendiumWebSocket} from "./ws.js";
import Logger from "./logger";
import BackendiumResponse from "./response";
import {ValidationError} from "checkeasy";

export type BackendiumConfigType = {
    port: number,
    host: string,
    name: string,
    version: string | number,
    logging: {
        path?: string,
        fullRequest?: boolean,
        replaceConsoleLog?: boolean
    }
    autoLogFull: boolean,
    autoLog: boolean,
    autoLogWsFull: boolean,
    autoLogWs: boolean,
    errorMessage: string,
    errorHandler(request: Request, response: BackendiumResponse, data: any, app: Backendium, error: any, message?: string): void,
    validationErrorMessage: string,
    validationErrorHandler(request: Request, response: BackendiumResponse, app: Backendium, data: Buffer, error: ValidationError, message?: string): void,
    wsErrorMessage: string,
    wsErrorHandler(data: Buffer, connection: BackendiumWebSocket<any>, app: Backendium, error: any): void
}

export type BackendiumEvents = {
    starting: [],
    start: [Server]
};

export default class Backendium<GlobalAuthType = any> extends BackendiumRouter<GlobalAuthType> {
    public express = new WebSocketExpress;
    protected eventEmitter = new EventEmitter<BackendiumEvents>;
    public logger = new Logger(console.log.bind(console));
    protected config_: Partial<BackendiumConfigType> = {};

    constructor(config: Partial<BackendiumConfigType> = {}) {
        super();
        this.config = config;
    }

    get config() {return this.config_;}
    set config(config) {
        this.config_ = {...this.config_, ...config, logging: {...this.config_.logging, ...config.logging}};
        if (this.config_.logging?.path) this.logger.path = this.config_.logging?.path;
        if (this.config_.logging?.replaceConsoleLog ?? true) {
            console.log = this.logger.message.bind(this.logger);
            console.error = this.logger.error.bind(this.logger);
        }
    }
    
    protected addAnyRouteHandler(method: MethodType, handlers: Array<RequestHandler>) {
        this.express[method]("*", ...handlers);
    }

    protected addRoutedHandler(method: MethodType, route: string, handlers: Array<RequestHandler>) {
        this.express[method](route, ...handlers);
    }

    protected addWSHandler(route: string, handlers: Array<WSRequestHandler>) {
        this.express.ws(route, ...handlers);
    }

    public on<E extends EventKey<BackendiumEvents>>(event: E, subscriber: (...args: BackendiumEvents[E]) => void): () => void {
        return this.eventEmitter.on(event, (args) => subscriber(...args));
    };

    public once<E extends EventKey<BackendiumEvents>>(event: E, subscriber: (...args: BackendiumEvents[E]) => void): () => void {
        return this.eventEmitter.once(event, (args) => subscriber(...args));
    };

    public off<E extends EventKey<BackendiumEvents>>(event: E, subscriber: (...args: BackendiumEvents[E]) => void): void {
        this.eventEmitter.off(event, (args) => subscriber(...args));
    };

    public start(callback?: (server: Server) => void): Server {
        this.handlers.forEach(([method, route, handlers]) => {
            if (method == "ws") this.addWSHandler(route, handlers.map(handler => handler(this)));
            else if (route) this.addRoutedHandler(method, route, handlers.map(handler => handler(this)));
            else this.addAnyRouteHandler(method, handlers.map(handler => handler(this)));
        });
        this.eventEmitter.emit("starting", []);
        // const server = this.express.createServer();
        // server.listen(this.config.port ?? 8080, this.config.host ?? "localhost", () => {
        //     if (callback) callback(server);
        //     this.eventEmitter.emit("start", [server]);
        // });
        const server = this.express.listen(this.config_.port ?? 8080, this.config_.host ?? "localhost", () => {
            this.logger.initMessage(this.config_.name ?? "app", this.config_.version ?? "0.0.0", this.config.port ?? 8080, this.config_.host ?? "localhost");
            if (callback) callback(server);
            this.eventEmitter.emit("start", [server]);
        });
        return server;
    }

    public async startAsync(): Promise<Server> {
        return new Promise(resolve => {
            this.start(resolve);
        });
    }
}