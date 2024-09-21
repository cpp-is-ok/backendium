import express, {RequestHandler} from "express";
import {EventEmitter} from "node:events";
import {Server} from "node:http";
import backendiumHandler, {BackendiumHandlerType} from "./handler.js";
import {BackendiumRequestOptionsType} from "./request.js";
import {Validator} from "checkeasy";

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

export type MethodType = "use" | "all" | "get" | "post" | "put" | "delete" | "patch" | "options" | "head" | "checkout"
    | "connect" | "copy" | "lock" | "merge" | "mkactivity" | "mkcol" | "move" | "m-search" | "notify" | "propfind"
    | "proppatch" | "purge" | "report" | "search" | "subscribe" | "unsubscribe" | "trace" | "unlock" | "link" | "unlink";

export type BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType> = 
    Array<BackendiumHandlerType<BodyType, ParamsType, QueryType, HeadersType>>
    | [string, ...Array<BackendiumHandlerType<BodyType, ParamsType, QueryType, HeadersType>>]
    | [...Array<BackendiumHandlerType<BodyType, ParamsType, QueryType, HeadersType>>,
        BackendiumRequestOptionsType<BodyType, ParamsType, QueryType, HeadersType>]
    | [string, ...Array<BackendiumHandlerType<BodyType, ParamsType, QueryType, HeadersType>>,
        BackendiumRequestOptionsType<BodyType, ParamsType, QueryType, HeadersType>];

// export type BackendiumMethodType<BodyType, ParamsType, QueryType, HeadersType> =
//     (this: Backendium, ...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>) => void;

export type BackendiumHandlersListType<Type extends {[method in MethodType]: {[route: string]: unknown}}> = {
    [method in keyof Type]?: {
        [route in keyof Type[method]]?: BackendiumHandlerType<Type[method][route], any, any, any>;
    };
}

export type BackendiumHandlersType<Type extends {[method in MethodType]: {[route: string]: unknown}}> = {
    $validators?: {
        [method in keyof Type]?: {
            [route in keyof Type[method]]?: Validator<Type[method][route]>;
        }
    }
} & BackendiumHandlersListType<Type>;

export default class Backendium extends EventEmitter {
    public express = express();

    constructor(public config: Partial<BackendiumConfigType> = {}) {
        super();
    }
    
    protected addAnyRouteHandler(method: MethodType, handlers: Array<RequestHandler>) {
        // handlers.forEach(handler => this.express[method]("*", handler));
        this.express[method]("*", ...handlers);
    }

    protected addRoutedHandler(method: MethodType, route: string, handlers: Array<RequestHandler>) {
        // handlers.forEach(handler => this.express[method](route, handler));
        this.express[method](route, ...handlers);
    }
    
    protected parseArgs<BodyType, ParamsType, QueryType, HeadersType>(args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>): [string | undefined, Array<RequestHandler>] {
        let route: string | undefined = undefined, options: BackendiumRequestOptionsType<BodyType, ParamsType, QueryType, HeadersType> | undefined = undefined;
        let handlers: Array<BackendiumHandlerType<BodyType, ParamsType, QueryType, HeadersType>> = args.map(elem => {
            if (typeof elem === "string") route = elem;
            if (typeof elem === "function") return elem;
            // @ts-ignore
            else options = elem;
        }).filter(elem => typeof elem === "function");
        return [route, handlers.map(handler => backendiumHandler(handler, this, options ?? {}))];
    }

    public addHandler<BodyType, ParamsType, QueryType, HeadersType>(method: MethodType,
        ...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        let [route, handlers] = this.parseArgs(args);
        if (route) this.addRoutedHandler(method, route, handlers);
        else this.addAnyRouteHandler(method, handlers);
    }

    public addHandlers() {

    }

    use<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("use", ...args);
    }

    all<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("all", ...args);
    }

    get<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("get", ...args);
    }

    post<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("post", ...args);
    }

    put<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("put", ...args);
    }

    delete<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("delete", ...args);
    }

    patch<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("patch", ...args);
    }

    options<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("options", ...args);
    }

    head<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("head", ...args);
    }

    checkout<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("checkout", ...args);
    }

    connect<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("connect", ...args);
    }

    copy<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("copy", ...args);
    }

    lock<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("lock", ...args);
    }

    merge<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("merge", ...args);
    }

    mkactivity<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("mkactivity", ...args);
    }

    mkcol<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("mkcol", ...args);
    }

    move<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("move", ...args);
    }

    "m-search"<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("m-search", ...args);
    }

    notify<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("notify", ...args);
    }

    propfind<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("propfind", ...args);
    }

    proppatch<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("proppatch", ...args);
    }

    purge<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("purge", ...args);
    }

    report<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("report", ...args);
    }

    search<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("search", ...args);
    }

    subscribe<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("subscribe", ...args);
    }

    unsubscribe<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("unsubscribe", ...args);
    }

    trace<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("trace", ...args);
    }

    unlock<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("unlock", ...args);
    }

    link<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("link", ...args);
    }

    unlink<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("unlink", ...args);
    }

    public start(callback?: (server: Server) => void): Server {
        this.emit("starting");
        let server = this.express.listen(this.config.port ?? 8080, this.config.host ?? "localhost", () => {
            if (callback) callback(server);
            this.emit("start", server);
        });
        return server;
    }

    public async startAsync(): Promise<Server> {
        return new Promise(resolve => {
            this.start(resolve);
        });
    }
}