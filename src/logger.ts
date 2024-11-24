import chalk from "chalk";
import * as fs from "node:fs";
import * as util from "node:util";

export function getDate() {
    let date = new Date();
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}

export default class Logger {
    protected logData = "";

    constructor(public log: (...data: Array<string>) => void, protected path_?: string) {}
    
    get path(): string | undefined {return this.path_;}
    set path(path: string) {
        this.path_ = path;
        if (this.path_) fs.writeFileSync(this.path_, this.logData);
    }

    clear() {
        if (this.path_) fs.writeFileSync(this.path_, "");
    }

    logSeparately(consoleData: Array<any>, fileData: Array<string>) {
        this.log(...consoleData);
        this.logData += (this.logData.length ? '\n' : "") + fileData.join(' ');
        if (this.path_) fs.writeFileSync(this.path_, this.logData);
    }

    getPrefix(tag: string) {
        return `[${getDate()}] ${tag}:`;
    }

    Log(tag: string, func = chalk.white, ...data: Array<any>) {
        let prefix = this.getPrefix(tag);
        this.logSeparately([func(prefix), ...data.map((elem) => typeof elem !== "string" ? elem : func(elem))],
            [prefix, ...data.map(elem => util.inspect(elem))]);
    }

    message(...data: Array<any>) {
        return this.Log("info", chalk.white, ...data);
    }

    info(...data: Array<any>) {
        return this.Log("info", chalk.white, ...data);
    }

    success(...data: Array<any>) {
        return this.Log("success", chalk.green, ...data);
    }

    warning(...data: Array<any>) {
        return this.Log("warn", chalk.yellow, ...data);
    }

    error(...data: Array<any>) {
        return this.Log("error", chalk.redBright, ...data);
    }

    fatal(...data: Array<any>) {
        return this.Log("fatal", chalk.red, ...data);
    }

    initMessage(name: string, version: string | number, port: number, host: string) {
        this.logSeparately([chalk.greenBright(`--++== ${chalk.green(name)} ${chalk.cyan('v' + version)}; ${chalk.cyan(`${host}:${port}`)} ==++--`)],
            [`--++== ${name} v${version}; port: ${port} ==++--`]);
    }

    protected formatData(data: any) {
        return Buffer.isBuffer(data) ? `"${data.toString()}"` : typeof data === "string" ? `"${data}"` : data;
    }

    protected formatDataColors(data: any, color = chalk.cyan) {
        return Buffer.isBuffer(data) ? `"${color(data.toString())}"` : typeof data === "string" ? `"${color(data)}"` : data;
    }

    requestFull(url: string, code: number, request: any, response: any) { // query, auth, headers
        request = typeof request === "string" ? request.replaceAll("\n", "\\n") : request;
        response = typeof response === "string" ? response.replaceAll("\n", "\\n") : response;
        let toLog: Array<any> = [this.getPrefix("request"), `Handled request to`];
        let toLogColours: Array<any> = [...toLog, chalk.cyan(url)];
        // toLog[0] = '\n' + toLog[0];
        toLog.push(url);
        if (code !== undefined) {
            toLog.push(". Code:", code);
            toLogColours.push(". Code:", code);
        }
        if (request !== undefined) {
            toLog.push(". Request:", this.formatData(request));
            toLogColours.push(". Request:", this.formatDataColors(request));
        }
        if (response !== undefined) {
            toLog.push(". Response:", this.formatData(response));
            toLogColours.push(". Response:", this.formatDataColors(response));
        }
        this.logSeparately(toLogColours.map(elem => typeof elem === "string" ? chalk.green(elem) : elem), toLog);
    }

    request(url: string, code: number) {
        let toLog: Array<any> = [this.getPrefix("request"), `Handled request to`];
        let toLogColours: Array<any> = [...toLog, chalk.cyan(url)];
        // toLog[0] = '\n' + toLog[0];
        toLog.push(url);
        if (code !== undefined) {
            toLog.push(". Code:", code);
            toLogColours.push(". Code:", code);
        }
        this.logSeparately(toLogColours.map(elem => typeof elem === "string" ? chalk.green(elem) : elem), toLog);
    }

    requestError(url: string, request: any, stackTrace: any) {
        request = typeof request === "string" ? request.replaceAll("\n", "\\n") : request;
        let toLog = [this.getPrefix("request"), `Error during handling request to`];
        let toLogColours = [...toLog, chalk.cyan(url)];
        // toLog[0] = '\n' + toLog[0];
        toLog.push(url);
        if (request !== undefined) {
            toLog.push(". Request:", this.formatData(request));
            toLogColours.push(`. Request:`, this.formatDataColors(request));
        }
        toLog.push(`\n${stackTrace}`);
        toLogColours.push(`\n${stackTrace}`);
        this.logSeparately(toLogColours.map(elem => typeof elem === "string" ? chalk.redBright(elem) : elem), toLog);
    }

    wsConnected(url: string) {
        let prefix = this.getPrefix("wsConnected");
        this.logSeparately([chalk.green(prefix), chalk.green("Websocket connected on url"), chalk.cyan(url)], [prefix, "Websocket connected on url", url]);
    }

    wsRejected(url: string) {
        let prefix = this.getPrefix("wsRejected");
        this.logSeparately([chalk.red(prefix), chalk.red("Websocket rejected on url"), chalk.cyan(url)], [prefix, "Websocket rejected on url", url]);
    }

    wsInitFull(url: string, data: any) {
        let prefix = this.getPrefix("wsInit");
        this.logSeparately(
            [
                chalk.green(prefix), chalk.green("Websocket init on url"), chalk.cyan(url), chalk.green("done"),
                ...(data !== null && data !== undefined ? [chalk.green("Data:"), this.formatDataColors(data)] : [])
            ],
            [
                prefix, "Websocket init on url", url, "done",
                ...(data !== null && data !== undefined ? ["Data:", this.formatData(data)] : [])
            ]
        );
    }

    wsInitFailedFull(url: string, data: any) {
        let prefix = this.getPrefix("wsInitFailed");
        this.logSeparately(
            [
                chalk.green(prefix), chalk.green("Websocket init on url"), chalk.cyan(url), chalk.red("failed"),
                ...(data !== null && data !== undefined ? [chalk.green("Data:"), this.formatDataColors(data)] : [])
            ],
            [
                prefix, "Websocket init on url", url, "failed",
                ...(data !== null && data !== undefined ? ["Data:", this.formatData(data)] : [])
            ]
        );
    }

    wsInit(url: string) {
        let prefix = this.getPrefix("wsInit");
        this.logSeparately([chalk.green(prefix), chalk.green("Websocket init on url"), chalk.cyan(url), chalk.red("done")],
            [prefix, "Websocket init on url", url, "done"]);
    }

    wsInitFailed(url: string) {
        let prefix = this.getPrefix("wsInitFailed");
        this.logSeparately(
            [chalk.green(prefix), chalk.green("Websocket init on url"), chalk.cyan(url), chalk.red("failed")],
            [prefix, "Websocket init on url", url, "failed"]);
    }

    wsIncomingEventFull(url: string, event: string, data: any) {
        let prefix = this.getPrefix("wsIncomingEvent");
        this.logSeparately(
            [
                chalk.green(prefix), chalk.green("Client, connected on url"), chalk.cyan(url) + chalk.green(', '), chalk.green("has emitted event"), chalk.cyan(event),
                ...(data !== null && data !== undefined ? [chalk.green("with data:"), this.formatDataColors(data)] : [])
            ],
            [
                prefix, "Client, connected on url", url + ',', "has emitted event", event,
                ...(data !== null && data !== undefined ? ["with data:", this.formatData(data)] : [])
            ]
        );
    }

    wsIncomingEvent(url: string, event: string) {
        let prefix = this.getPrefix("wsIncomingEvent");
        this.logSeparately([chalk.green(prefix), chalk.green("Client, connected on url"),
                chalk.cyan(url) + chalk.green(', '), chalk.green("has emitted event"), chalk.cyan(event)],
            [prefix, "Client, connected on url", url + ',', "has emitted event", event]);
    }

    wsOutgoingEventFull(url: string, event: string, data: any) {
        let prefix = this.getPrefix("wsOutgoingEvent");
        this.logSeparately(
            [
                chalk.green(prefix), chalk.green("Server has emitted event"), chalk.cyan(event), chalk.green("to websocket connection on url"), chalk.cyan(url),
                ...(data !== null && data !== undefined ? [chalk.green("with data:"), this.formatDataColors(data)] : [])
            ], [
                prefix, "Server has emitted event", event, "to websocket connection on url", url,
                ...(data !== null && data !== undefined ? ["with data:", this.formatData(data)] : [])
            ]
        );
    }

    wsOutgoingEvent(url: string, event: string) {
        let prefix = this.getPrefix("wsOutgoingEvent");
        this.logSeparately([chalk.green(prefix), chalk.green("Server has sent message"),
                chalk.green("to websocket connection on url"), chalk.cyan(url)],
            [prefix, "Server has sent message", "to websocket connection on url", url]);
    }

    wsInputFull(url: string, data: any) {
        let prefix = this.getPrefix("wsInput");
        this.logSeparately([chalk.green(prefix), chalk.green("Client, connected on url"),
                chalk.cyan(url) + chalk.green(', '), chalk.green("has sent message"), this.formatDataColors(data)],
            [prefix, "Client, connected on url", url + ',', "has sent message", this.formatData(data)]);
    }

    wsInput(url: string) {
        let prefix = this.getPrefix("wsInput");
        this.logSeparately([chalk.green(prefix), chalk.green("Client, connected on url"),
                chalk.cyan(url) + chalk.green(', '), chalk.green("has sent message")],
            [prefix, "Client, connected on url", url + ',', "has sent message"]);
    }

    wsOutputFull(url: string, data: any) {
        let prefix = this.getPrefix("wsOutput");
        this.logSeparately([chalk.green(prefix), chalk.green("Server has sent message"), this.formatDataColors(data),
            chalk.green("to websocket connection on url"),
            chalk.cyan(url)], [prefix, "Server has sent message", this.formatData(data),
            "to websocket connection on url", url]);
    }

    wsOutput(url: string) {
        let prefix = this.getPrefix("wsOutput");
        this.logSeparately([chalk.green(prefix), chalk.green("Server has sent message"),
                chalk.green("to websocket connection on url"), chalk.cyan(url)],
            [prefix, "Server has sent message", "to websocket connection on url", url]);
    }

    wsError(url: string, data: any, stackTrace: any) {
        data = typeof data === "string" ? data.replaceAll("\n", "\\n") : data;
        let toLog = [this.getPrefix("error"), `Error during handling websocket input to`];
        let toLogColours = [...toLog, chalk.cyan(url)];
        // toLog[0] = '\n' + toLog[0];
        toLog.push(url);
        if (data !== undefined) {
            toLog.push(". Data:", this.formatData(data));
            toLogColours.push(`. Data:`, this.formatDataColors(data));
        }
        toLog.push(`\n${stackTrace}`);
        toLogColours.push(`\n${stackTrace}`);
        this.logSeparately(toLogColours.map(elem => typeof elem === "string" ? chalk.redBright(elem) : elem), toLog);
    }

    wsClose(url: any) {
        let prefix = this.getPrefix("wsClose");
        this.logSeparately([chalk.green(prefix), chalk.green("Websocket connection on url"), chalk.cyan(url),
            chalk.green("closed")], [prefix, "Websocket connection on url", url, "closed"]);
    }

    wsTerminate(url: any) {
        let prefix = this.getPrefix("wsTerminate");
        this.logSeparately([chalk.green(prefix), chalk.green("Websocket connection on url"), chalk.cyan(url),
            chalk.red("terminated")], [prefix, "Websocket connection on url", url, "terminated"]);
    }
}