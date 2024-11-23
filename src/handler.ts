import BackendiumResponse from "./response.js";
import Backendium from "./index.js";
import {NextFunction, Request, RequestHandler, Response} from "express";
import parseRequest, {BackendiumRequestOptionsType, BackendiumRequestType} from "./request.js";
import {BackendiumRouter} from "./router";
import {ValidationError} from "checkeasy";

export type BackendiumHandlerReturnType = void | undefined | {code?: number, next?: boolean};
export type BackendiumHandlerType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType> = (request: BackendiumRequestType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>, response: BackendiumResponse, app: Backendium, next: NextFunction) => BackendiumHandlerReturnType | Promise<BackendiumHandlerReturnType>;

export type RawHandlerType<DefaultAuthType> = (router: BackendiumRouter<DefaultAuthType>) => (app: Backendium) => RequestHandler;

export function defaultAuthFailedHandler(request: Request, response: BackendiumResponse, app: Backendium) {
    response.status(209);
    response.end();
}

export function defaultErrorHandler(request: Request, response: BackendiumResponse, data: any, app: Backendium, error: any, message: string) {
    response.status(500);
    response.end(message ?? "Internal Server Error");
    app.logger.requestError(request.url, data, error);
}

export function defaultValidationErrorHandler(request: Request, response: BackendiumResponse, app: Backendium, data: Buffer, error: ValidationError, message: string) {
    response.status(400);
    response.end(message ?? "Validation failed");
}

export default function backendiumHandler<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>(handler: BackendiumHandlerType<BodyType, ParamsType, QueryType, AuthType, HeadersType, GlobalAuthType>,
    {auth, authChecker, authFailed, errorHandler, errorMessage, validationErrorHandler, validationErrorMessage, ...options}: BackendiumRequestOptionsType<BodyType, ParamsType, QueryType, AuthType, HeadersType>
): RawHandlerType<GlobalAuthType> {
    return (router: BackendiumRouter<GlobalAuthType>) => (app: Backendium) => (async (request: Request, response: Response, next: NextFunction) => {
        let body: any;
        try {
            let req = await parseRequest(request, app, {...options, auth, authChecker, authFailed, errorHandler, validationErrorHandler, errorMessage, validationErrorMessage});
            let res = new BackendiumResponse(response, app);
            if (Array.isArray(req)) {
                let [data, error] = req;
                (validationErrorHandler ?? app.config.validationErrorHandler ?? defaultValidationErrorHandler)(request, res, app, data, error, validationErrorMessage ?? app.config.validationErrorMessage);
                if (app.config.logging?.fullRequest) app.logger.requestFull(request.url, res.lastStatus, data, res.lastResponse);
                else app.logger.request(request.url, res.lastStatus);
                return;
            }
            body = req.body;
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
            (errorHandler ?? app.config.errorHandler ?? defaultErrorHandler)(request, new BackendiumResponse(response, app), body, app, error, errorMessage ?? app.config.errorMessage);
        }
    });
}