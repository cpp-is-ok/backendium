import {Request} from "express";
import Backendium from "./index.js";
import {ValidationError, Validator} from "checkeasy";
import BackendiumResponse from "./response";

export type ValidatorsType<BodyType, ParamsType, QueryType, HeadersType> = {
    bodyValidator?: Validator<BodyType>,
    paramsValidator?: Validator<ParamsType>,
    queryValidator?: Validator<QueryType>,
    headersValidator?: Validator<HeadersType>
}

export type AuthCheckerType<AuthType> = (request: Request, response: BackendiumResponse, app: Backendium) => AuthType | null | Promise<AuthType | null>;
export type AuthFailedType = (request: Request, response: BackendiumResponse, app: Backendium) => void;

export type BackendiumRequestOptionsType<BodyType, ParamsType, QueryType, AuthType, HeadersType> = ValidatorsType<BodyType, ParamsType, QueryType, HeadersType> & {
    auth?: boolean,
    authChecker?: AuthCheckerType<AuthType>,
    authFailed?: AuthFailedType,
    errorMessage?: string,
    errorHandler?(request: Request, response: BackendiumResponse, data: any, app: Backendium, error: any): void,
    validationErrorMessage?: string,
    validationErrorHandler?(request: Request, response: BackendiumResponse, app: Backendium, data: Buffer, error: ValidationError, message?: string): void
};

export type BackendiumRequestType<BodyType, ParamsType, QueryType, AuthType, HeadersType, DefaultAuthType> = {
    expressRequest: Request,
    body: BodyType,
    params: ParamsType,
    query: QueryType,
    headers: HeadersType,
    bodyBuffer: Buffer,
    options: BackendiumRequestOptionsType<BodyType, ParamsType, QueryType, AuthType, HeadersType>,
    app: Backendium,
    auth: AuthType,
    globalAuth: DefaultAuthType
}

function parse<Type>(data: any, validator?: Validator<Type>): Type {
    if (!validator) {
        // @ts-ignore
        return data;
    }
    try {
        return validator(data, "");
    }
    catch (error0) {
        if (typeof data === "string") {
            try {
                return validator(JSON.parse(data), "");
            }
            catch (error) {
                if (error instanceof ValidationError) throw error;
                throw error0;
            }
        }
        throw error0;
    }
}

async function getBody(request: Request): Promise<Buffer> {
    if (request.body) return request.body;
    return new Promise(resolve => {
        let buffer = Buffer.alloc(0);
        request.on("data", chunk => buffer = Buffer.concat([buffer, chunk]));
        request.on("end", () => {
            request.body = buffer;
            resolve(buffer);
        });
    });
}

export default async function parseRequest<BodyType, ParamsType, QueryType, AuthType, HeadersType>(request: Request, app: Backendium,
    {bodyValidator, paramsValidator, queryValidator, headersValidator, ...other}: BackendiumRequestOptionsType<BodyType, ParamsType, QueryType, AuthType, HeadersType>
): Promise<Omit<Omit<BackendiumRequestType<BodyType, ParamsType, QueryType, AuthType, HeadersType, any>, "auth">, "globalAuth"> | [Buffer, ValidationError]> {
    let bodyBuffer = await getBody(request);
    try {
        let body = parse(bodyBuffer.toString("utf8"), bodyValidator);
        let params = parse(request.params, paramsValidator);
        let query = parse(request.query, queryValidator);
        let headers = parse(request.headers, headersValidator);
        return {
            expressRequest: request, body, params, query, headers, bodyBuffer, app,
            options: {bodyValidator, paramsValidator, queryValidator, headersValidator, ...other}
        };
    }
    catch (error) {
        if (error instanceof ValidationError) return [bodyBuffer, error];
        throw error;
    }
}