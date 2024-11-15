import BackendiumResponse from "./response.js";
import Backendium from "./index.js";
import {NextFunction, Request, RequestHandler, Response} from "express";
import parseRequest, {
    AuthCheckerType,
    AuthFailedType,
    BackendiumRequestOptionsType,
    BackendiumRequestType
} from "./request.js";

export type BackendiumHandlerReturnType = void | undefined | {code?: number, next?: boolean};
export type BackendiumHandlerType<BodyType, ParamsType, QueryType, AuthType, HeadersType> = (request: BackendiumRequestType<BodyType, ParamsType, QueryType, AuthType, HeadersType>, response: BackendiumResponse, app: Backendium, next: NextFunction) => BackendiumHandlerReturnType | Promise<BackendiumHandlerReturnType>;

export type RawHandlerType = (app: Backendium) => RequestHandler;

export default function backendiumHandler<BodyType, ParamsType, QueryType, AuthType, HeadersType>(handler: BackendiumHandlerType<BodyType, ParamsType, QueryType, AuthType, HeadersType>,
    {auth, authChecker, authFailed, ...options}: BackendiumRequestOptionsType<BodyType, ParamsType, QueryType, AuthType, HeadersType>
): RawHandlerType {
    return (app: Backendium) => (async (request: Request, response: Response, next: NextFunction) => {
        try {
            let req = await parseRequest(request, app, {...options, auth, authChecker, authFailed});
            if (!req) {
                return;
            }
            let res = new BackendiumResponse(response, app);
            // @ts-ignore
            let authData: AuthType = undefined;
            if (auth && authChecker && authFailed) {
                let ret = authChecker(request, res, app);
                if (ret instanceof Promise) ret = await ret;
                if (ret === null) {
                    authFailed(request, res, app);
                    return;
                }
                authData = ret;
            }
            let ret = handler({...req, auth: authData}, res, app, next);
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