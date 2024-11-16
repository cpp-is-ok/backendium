import BackendiumResponse from "./response.js";
import Backendium from "./index.js";
import {NextFunction, Request, RequestHandler, Response} from "express";
import parseRequest, {
    AuthCheckerType,
    AuthFailedType,
    BackendiumRequestOptionsType,
    BackendiumRequestType
} from "./request.js";
import {BackendiumRouter} from "./router";

export type BackendiumHandlerReturnType = void | undefined | {code?: number, next?: boolean};
export type BackendiumHandlerType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType> = (request: BackendiumRequestType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>, response: BackendiumResponse, app: Backendium, next: NextFunction) => BackendiumHandlerReturnType | Promise<BackendiumHandlerReturnType>;

export type RawHandlerType<DefaultAuthType> = (router: BackendiumRouter<DefaultAuthType>) => (app: Backendium) => RequestHandler;

export function defaultAuthFailedHandler(request: Request, response: BackendiumResponse, app: Backendium) {
    response.status(209);
    response.end();
}

export default function backendiumHandler<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>(handler: BackendiumHandlerType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>,
    {auth, authChecker, authFailed, ...options}: BackendiumRequestOptionsType<BodyType, ParamsType, QueryType, AuthType, HeadersType>
): RawHandlerType<GlobalAuthType> {
    return (router: BackendiumRouter<GlobalAuthType>) => (app: Backendium) => (async (request: Request, response: Response, next: NextFunction) => {
        try {
            let req = await parseRequest(request, app, {...options, auth, authChecker, authFailed});
            if (!req) {
                return;
            }
            let res = new BackendiumResponse(response, app);
            // @ts-ignore
            let authData: AuthType = undefined;
            if (authChecker) {
                let ret = authChecker(request, res, app);
                if (ret instanceof Promise) ret = await ret;
                if (ret === null) {
                    (authFailed ?? router.authFailed ?? app.authFailed ?? defaultAuthFailedHandler)(request, res, app);
                    return;
                }
                authData = ret;
            }
            // @ts-ignore
            let globalAuthData: GlobalAuthType = undefined;
            if (!authChecker && auth && router.authChecker) {
                let ret = router.authChecker(request, res, app);
                if (ret instanceof Promise) ret = await ret;
                if (ret === null) {
                    (authFailed ?? router.authFailed ?? app.authFailed ?? defaultAuthFailedHandler)(request, res, app);
                    return;
                }
                globalAuthData = ret;
            }
            let ret = handler({...req, auth: authData, globalAuth: globalAuthData}, res, app, next);
            if (ret instanceof Promise) ret = await ret;
            if (!ret) return;
            let {code = 200, next: isNext = false} = ret;
            response.status(code);
            if (isNext) {
                next();
                return;
            }
            try {response.end();}
            catch (error) {return;}
        }
        catch (error) {
            // @TODO
            return;
        }
    });
}