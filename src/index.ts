import express, {RequestHandler} from "express";
import {EventEmitter} from "node:events";
import {Server} from "node:http";
import {BackendiumMethodArgsType, BackendiumRouter, BackendiumRouterType, MethodType} from "./router.js";

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

// export type BackendiumMethodType<BodyType, ParamsType, QueryType, HeadersType> =
//     (this: Backendium, ...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>) => void;

// export type BackendiumHandlersListType<Type extends {[method in MethodType]: {[route: string]: unknown}}> = {
//     [method in keyof Type]?: {
//         [route in keyof Type[method]]?: BackendiumHandlerType<Type[method][route], any, any, any>;
//     };
// }
//
// export type BackendiumHandlersType<Type extends {[method in MethodType]: {[route: string]: unknown}}> = {
//     $validators?: {
//         [method in keyof Type]?: {
//             [route in keyof Type[method]]?: Validator<Type[method][route]>;
//         }
//     }
// } & BackendiumHandlersListType<Type>;

export default class Backendium extends EventEmitter implements BackendiumRouterType {
    public express = express();
    public mainRouter: BackendiumRouter = new BackendiumRouter;

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

    public addHandler<BodyType, ParamsType, QueryType, HeadersType>(method: MethodType,
        ...args: BackendiumMethodArgsType<BodyType, ParamsType, QueryType, HeadersType>
    ): void {
        this.mainRouter.addHandler(method, ...args);
    }

    public router(router: BackendiumRouter) {
        this.mainRouter.router(router);
    }

    use = this.mainRouter.use.bind(this.mainRouter);
    all = this.mainRouter.all.bind(this.mainRouter);
    get = this.mainRouter.get.bind(this.mainRouter);
    post = this.mainRouter.post.bind(this.mainRouter);
    put = this.mainRouter.put.bind(this.mainRouter);
    delete = this.mainRouter.delete.bind(this.mainRouter);
    patch = this.mainRouter.patch.bind(this.mainRouter);
    options = this.mainRouter.options.bind(this.mainRouter);
    head = this.mainRouter.head.bind(this.mainRouter);
    checkout = this.mainRouter.checkout.bind(this.mainRouter);
    connect = this.mainRouter.connect.bind(this.mainRouter);
    copy = this.mainRouter.copy.bind(this.mainRouter);
    lock = this.mainRouter.lock.bind(this.mainRouter);
    merge = this.mainRouter.merge.bind(this.mainRouter);
    mkactivity = this.mainRouter.mkactivity.bind(this.mainRouter);
    mkcol = this.mainRouter.mkcol.bind(this.mainRouter);
    move = this.mainRouter.move.bind(this.mainRouter);
    "m-search" = this.mainRouter["m-search"].bind(this.mainRouter);
    notify = this.mainRouter.notify.bind(this.mainRouter);
    propfind = this.mainRouter.propfind.bind(this.mainRouter);
    proppatch = this.mainRouter.proppatch.bind(this.mainRouter);
    purge = this.mainRouter.purge.bind(this.mainRouter);
    report = this.mainRouter.report.bind(this.mainRouter);
    search = this.mainRouter.search.bind(this.mainRouter);
    subscribe = this.mainRouter.subscribe.bind(this.mainRouter);
    unsubscribe = this.mainRouter.unsubscribe.bind(this.mainRouter);
    trace = this.mainRouter.trace.bind(this.mainRouter);
    unlock = this.mainRouter.unlock.bind(this.mainRouter);
    link = this.mainRouter.link.bind(this.mainRouter);
    unlink = this.mainRouter.unlink.bind(this.mainRouter);

    public start(callback?: (server: Server) => void): Server {
        this.mainRouter.handlers.forEach(([method, route, handlers]) => {
            if (route) this.addRoutedHandler(method, route, handlers.map(handler => handler(this)));
            else this.addAnyRouteHandler(method, handlers.map(handler => handler(this)));
        });
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