import BackendiumResponse from "./response.js";
import Backendium from "./index.js";
import {NextFunction, Request, Response} from "express";
import parseRequest, {BackendiumRequestOptionsType, BackendiumRequestType} from "./request.js";

export type BackendiumHandlerReturnType = void | undefined | {code?: number, next?: boolean};
export type BackendiumHandlerType<BodyType, ParamsType, QueryType, HeadersType> = (request: BackendiumRequestType<BodyType, ParamsType, QueryType, HeadersType>, response: BackendiumResponse, app: Backendium, next: NextFunction) => BackendiumHandlerReturnType | Promise<BackendiumHandlerReturnType>;

export default function backendiumHandler<BodyType, ParamsType, QueryType, HeadersType>(handler: BackendiumHandlerType<BodyType, ParamsType, QueryType, HeadersType>,
    app: Backendium, validators: BackendiumRequestOptionsType<BodyType, ParamsType, QueryType, HeadersType>
) {
    return async (request: Request, response: Response, next: NextFunction) => {
        try {
            let req = await parseRequest(request, app, validators);
            if (!req) return;

            let ret = handler(req, new BackendiumResponse(response, app), app, next);
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
            return;
        }
    };
}