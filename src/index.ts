import {RequestHandler} from "express";
import {createServer, Server} from "node:http";
import {BackendiumRouter, MethodType} from "./router.js";
import {EventEmitter, EventKey} from "event-emitter-typescript";
import {WebSocketExpress, WSRequestHandler} from "websocket-express";

export type BackendiumConfigType = {
    port: number,
    host: string,
    name: string,
    version: string,
    logging: {},
    autoLogFull: boolean,
    autoLog: boolean,
    autoLogWsFull: boolean,
    autoLogWs: boolean
}

export type BackendiumEvents = {
    starting: [],
    start: [Server]
};

export default class Backendium extends BackendiumRouter {
    public express = new WebSocketExpress;
    protected eventEmitter = new EventEmitter<BackendiumEvents>

    constructor(public config: Partial<BackendiumConfigType> = {}) {
        super();
    }
    
    protected addAnyRouteHandler(method: MethodType, handlers: Array<RequestHandler>) {
        this.express[method]("*", ...handlers);
    }

    protected addRoutedHandler(method: MethodType, route: string, handlers: Array<RequestHandler>) {
        this.express[method](route, ...handlers);
    }

    protected addWSHandler(route: string, handlers: Array<WSRequestHandler>) {

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
        const server = createServer(this.express);
        server.listen(this.config.port ?? 8080, this.config.host ?? "localhost", () => {
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