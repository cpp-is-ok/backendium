import {Response} from "express";
import Backendium from "./index.js";

export default class BackendiumResponse {
    public lastStatus = 200;
    public lastResponse: any;

    constructor(public expressResponse: Response, public app: Backendium) {

    }

    status(status: number) {
        this.lastStatus = status;
        this.expressResponse.status(status);
    }

    end(data?: any, status?: number) {
        if (status) this.status(status);
        this.lastResponse = data;
        this.expressResponse.end(typeof data === "string" || data instanceof Buffer || data instanceof ArrayBuffer ? data : JSON.stringify(data));
    }
}