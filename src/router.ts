import backendiumHandler, {BackendiumHandlerType, RawHandlerType} from "./handler.js";
import {AuthCheckerType, AuthFailedType, BackendiumRequestOptionsType} from "./request.js";
import {NextFunction, Request, RequestHandler} from "express";
import Backendium from "./index.js";
import {WebSocketRouteConstructor} from "./ws.js";
import {WSRequestHandler, WSResponse} from "websocket-express";

export type MethodType = "use" | "all" | "get" | "post" | "put" | "delete" | "patch" | "options" | "head" | "checkout"
    | "connect" | "copy" | "lock" | "merge" | "mkactivity" | "mkcol" | "move" | "m-search" | "notify" | "propfind"
    | "proppatch" | "purge" | "report" | "search" | "subscribe" | "unsubscribe" | "trace" | "unlock" | "link" | "unlink"
    | "useHTTP";

export type BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType> =
    Array<BackendiumHandlerType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>>
    | [string, ...Array<BackendiumHandlerType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>>]
    | [...Array<BackendiumHandlerType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>>,
    BackendiumRequestOptionsType<BodyType, ParamsType, QueryType, AuthType, HeadersType>]
    | [string, ...Array<BackendiumHandlerType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>>,
    BackendiumRequestOptionsType<BodyType, ParamsType, QueryType, AuthType, HeadersType>];

export class BackendiumRouter<GlobalAuthType = undefined> {
    protected _handlers: Array<[MethodType, string | undefined, Array<ReturnType<RawHandlerType<GlobalAuthType>>>] | ["ws", string, Array<(app: Backendium) => WSRequestHandler>]> = [];
    public authChecker: AuthCheckerType<GlobalAuthType> | undefined;
    public authFailed: AuthFailedType | undefined;

    constructor() {}

    get handlers() {return this._handlers}

    protected parseArgs<BodyType, ParamsType, QueryType, AuthType, HeadersType>(args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>): [string | undefined, Array<RawHandlerType<GlobalAuthType>>] {
        let route: string | undefined = undefined, options: BackendiumRequestOptionsType<BodyType, ParamsType, QueryType, AuthType, HeadersType> | undefined = undefined;
        let handlers: Array<BackendiumHandlerType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>> = args.map(elem => {
            if (typeof elem === "string") route = elem;
            if (typeof elem === "function") return elem;
            // @ts-ignore
            else options = elem;
        }).filter(elem => typeof elem === "function");
        return [route, handlers.map(handler => backendiumHandler(handler, options ?? {auth: false}))];
    }

    public addHandler<BodyType, ParamsType, QueryType, AuthType, HeadersType>(method: MethodType,
        ...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        let [route, handlers] = this.parseArgs(args);
        this._handlers.push([method, route, handlers.map(handler => handler(this))]);
    }

    use<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("use", ...args);
    }

    useHTTP<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("useHTTP", ...args);
    }

    all<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("all", ...args);
    }

    get<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("get", ...args);
    }

    post<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("post", ...args);
    }

    put<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("put", ...args);
    }

    delete<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("delete", ...args);
    }

    patch<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("patch", ...args);
    }

    options<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("options", ...args);
    }

    head<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("head", ...args);
    }

    checkout<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("checkout", ...args);
    }

    connect<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("connect", ...args);
    }

    copy<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("copy", ...args);
    }

    lock<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("lock", ...args);
    }

    merge<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("merge", ...args);
    }

    mkactivity<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("mkactivity", ...args);
    }

    mkcol<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("mkcol", ...args);
    }

    move<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("move", ...args);
    }

    "m-search"<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("m-search", ...args);
    }

    notify<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("notify", ...args);
    }

    propfind<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("propfind", ...args);
    }

    proppatch<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("proppatch", ...args);
    }

    purge<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("purge", ...args);
    }

    report<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("report", ...args);
    }

    search<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("search", ...args);
    }

    subscribe<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("subscribe", ...args);
    }

    unsubscribe<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("unsubscribe", ...args);
    }

    trace<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("trace", ...args);
    }

    unlock<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("unlock", ...args);
    }

    link<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("link", ...args);
    }

    unlink<BodyType = undefined, ParamsType = {}, QueryType = {}, AuthType = GlobalAuthType, HeadersType = {}>(...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>
    ): void {
        this.addHandler("unlink", ...args);
    }

    ws<InitDataType>(route: string): WebSocketRouteConstructor<InitDataType> {
        const constructor = new WebSocketRouteConstructor<InitDataType>();
        this._handlers.push(["ws", route, [(app: Backendium) => (request: Request, response: WSResponse, next: NextFunction) => {
            constructor._handle(request, response, next, app);
        }]]);
        return constructor;
    }

    protected static addPrefix([method, route, handler]: [MethodType, string | undefined, Array<(app: Backendium) => RequestHandler>], prefix: string): [MethodType, string, Array<(app: Backendium) => RequestHandler>];
    protected static addPrefix([method, route, handler]: ["ws", string, Array<(app: Backendium) => WSRequestHandler>], prefix: string): ["ws", string, Array<(app: Backendium) => WSRequestHandler>];
    protected static addPrefix([method, route, handler]: [MethodType, string | undefined, Array<(app: Backendium) => RequestHandler>] | ["ws", string, Array<(app: Backendium) => WSRequestHandler>], prefix: string) {
        return [method, route || !route?.startsWith("/") ? prefix + (route ?? "") : prefix + (route ?? ""), handler];
    }

    router<AuthType>(router: BackendiumRouter<AuthType>, routePrefix = "") {
        this._handlers.push(...router._handlers.map((handler) => {
            // @ts-ignore
            return BackendiumRouter.addPrefix(handler, routePrefix);
        }));
    }
    
    setAuth(checker?: AuthCheckerType<GlobalAuthType>, failHandler?: AuthFailedType) {
        this.authChecker = checker ?? this.authChecker;
        this.authFailed = failHandler ?? this.authFailed;
    }
}