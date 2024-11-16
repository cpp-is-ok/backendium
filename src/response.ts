import {Response} from "express";
import Backendium from "./index.js";

export default class BackendiumResponse {
    constructor(public expressResponse: Response, public app: Backendium) {}

    status(status: number) {
        this.expressResponse.status(status);
    }

    end(data?: any, status?: number) {
        if (status) this.expressResponse.status(status);
        this.expressResponse.end(typeof data === "string" || data instanceof Buffer || data instanceof ArrayBuffer ? data : JSON.stringify(data));
    }
}