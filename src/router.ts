import backendiumHandler, {BackendiumHandlerType} from "./handler.js";
import {BackendiumRequestOptionsType} from "./request.js";
import {NextFunction, Request, RequestHandler} from "express";
import Backendium from "./index.js";
import {WebSocketRouteConstructor} from "./ws.js";
import {WSRequestHandler, WSResponse} from "websocket-express";

export type MethodType = "use" | "all" | "get" | "post" | "put" | "delete" | "patch" | "options" | "head" | "checkout"
    | "connect" | "copy" | "lock" | "merge" | "mkactivity" | "mkcol" | "move" | "m-search" | "notify" | "propfind"
    | "proppatch" | "purge" | "report" | "search" | "subscribe" | "unsubscribe" | "trace" | "unlock" | "link" | "unlink"
    | "useHTTP";

export type BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType> =
    Array<BackendiumHandlerType<BodyType, ParamsType, QueryType, HeadersType>>
    | [string, ...Array<BackendiumHandlerType<BodyType, ParamsType, QueryType, HeadersType>>]
    | [...Array<BackendiumHandlerType<BodyType, ParamsType, QueryType, HeadersType>>,
    BackendiumRequestOptionsType<BodyType, ParamsType, QueryType, HeadersType>]
    | [string, ...Array<BackendiumHandlerType<BodyType, ParamsType, QueryType, HeadersType>>,
    BackendiumRequestOptionsType<BodyType, ParamsType, QueryType, HeadersType>];

export class BackendiumRouter {
    protected _handlers: Array<[MethodType, string | undefined, Array<(app: Backendium) => RequestHandler>] | ["ws", string, Array<(app: Backendium) => WSRequestHandler>]> = [];

    constructor() {} // @TODO

    get handlers() {return this._handlers}

    protected parseArgs<BodyType, ParamsType, QueryType, HeadersType>(args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>): [string | undefined, Array<(app: Backendium) => RequestHandler>] {
        let route: string | undefined = undefined, options: BackendiumRequestOptionsType<BodyType, ParamsType, QueryType, HeadersType> | undefined = undefined;
        let handlers: Array<BackendiumHandlerType<BodyType, ParamsType, QueryType, HeadersType>> = args.map(elem => {
            if (typeof elem === "string") route = elem;
            if (typeof elem === "function") return elem;
            // @ts-ignore
            else options = elem;
        }).filter(elem => typeof elem === "function");
        return [route, handlers.map(handler => backendiumHandler(handler, options ?? {}))];
    }

    public addHandler<BodyType, ParamsType, QueryType, HeadersType>(method: MethodType,
        ...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        let [route, handlers] = this.parseArgs(args);
        this._handlers.push([method, route, handlers])
    }

    use<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("use", ...args);
    }

    useHTTP<BodyType, ParamsType, QueryType, HeadersType>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.addHandler("useHTTP", ...args);
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

    ws(route: string): WebSocketRouteConstructor {
        const constructor = new WebSocketRouteConstructor();
        this._handlers.push(["ws", route, [(app: Backendium) => (request: Request, response: WSResponse, next: NextFunction) => {
            constructor._handle(request, response, next, app);
        }]]);
        return constructor;
    }

    router(router: BackendiumRouter) {
        this._handlers.push(...router._handlers);
    }
}