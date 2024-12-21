<h1 align="center">Backendium</h1>

# Table of Contents
> 1. [Installation](#installation)
> 2. [Basics](#basics)
> 3. [Routing](#routing)
> 4. [Request validation](#request-validation-checkeasy)
> 5. [Authorization](#authorization)
> 6. [Dynamic routing](#dynamic-routing)
> 7. [Websocket](#websocket)
# Installation
The easiest way to install the library is using the `npm`. Type the following in the terminal:
```bash
npm i backendium checkeasy
```
# Basics
You can use the following code as the default code for your projects:
```typescript
import Backendium from "backendium";

const app = new Backendium;

app.get("*", (request, response, app, next) => {
    response.end({backendium: "0.0.0"});
});

app.start();
```
It creates a server that answers with json `{backendium: "0.0.0"}`, when you ask for any page.
You can send a request with this command:
```bash
curl http://localhost:8080/
```
The responce will be:
```json
{"backendium":"0.0.0"}
```
# Routing
## Router class
Now we 
```typescript
// main.ts
import Backendium from "backendium";
import handlers from "./handlers.js";

const app = new Backendium;

app.router(handlers);

app.start();
```
```typescript
// handlers.ts
import {BackendiumRouter} from "backendium";

const router = new BackendiumRouter;

router.get("*", (request, response, app, next) => {
    response.end({backendium: "0.0.0"});
});

export default router;
```
Backendium class extends BackendiumRouter
## Methods
```typescript
router.get("/route", (request, response, app, next) => {
    // handler
});

router.post("/route", (request, response, app, next) => {
    // handler
});
```
### Supported methods:
"get", "post", "put", "delete", "patch", "options", "head", "checkout", "connect", "copy", "lock", "merge", "mkactivity", "mkcol", "move", "m-search", "notify", "propfind", "proppatch", "purge", "report", "search", "subscribe", "unsubscribe", "trace", "unlock", "link", "unlink"
# Request validation ([checkeasy](https://github.com/smbwain/checkeasy))
Checkeasy imports:
```typescript
import {int, object, string, strToInt} from "checkeasy";
```
```typescript
router.post<{n: number}>("/validated", (request, response) => {
    console.log(request.body);
    response.end(Math.sqrt(request.body.n));
}, {
    bodyValidator: object({
        n: int()
    })
});
```
```bash
curl http://localhost:8080/validated -d '{"n": 2}'
```
## Query
```typescript
router.get<Buffer /*default type for request body*/, {}, {n: number}>("/validated/query", (request, response) => {
    console.log(request.query);
    response.end(Math.sqrt(request.query.n));
}, {
    queryValidator: object({
        n: strToInt()
    })
});
```
```bash
curl "http://localhost:8080/validated/query?n=2"
```
## Headers
```typescript
router.get<Buffer, {}, {}, undefined, {n: number}>("/validated/headers", (request, response) => {
    console.log(request.headers);
    response.end(Math.sqrt(request.headers.n));
}, {
    headersValidator: object({
        n: strToInt()
    }, {ignoreUnknown: true})
});
```
```bash
curl http://localhost:8080/validated/headers -H "n:2" 
```
# Authorization
```typescript
const USERS: {[key: number]: string} = {
    54: "sizoff"
}

router.post<Buffer, {}, {}, string>("/auth", (request, response) => {
    console.log(request.auth); // type of request.auth is string
    response.end();
}, {
    authChecker(request, response) {
        if (typeof request.headers.auth !== "string" || !(Number(request.headers.auth) in USERS)) return null; // auth failed
        return USERS[Number(request.headers.auth)]; // return auth data
    }
});
```
```bash
curl http://localhost:8080/auth -H "auth:54" -d ""
```
## Global (for router)
```typescript
const router = new BackendiumRouter<string>;

const USERS: {[key: number]: string} = {
    54: "sizoff"
}

router.setAuth((request, response) => {
    if (typeof request.headers.auth !== "string" || !(Number(request.headers.auth) in USERS)) return null; // auth failed
    return USERS[Number(request.headers.auth)]; // return auth data
});

router.post("/auth", (request, response) => {
    console.log(request.globalAuth); // type of request.auth is string
    response.end();
}, {
    auth: true
});
```
# Dynamic routing
More info: https://expressjs.com/en/guide/routing.html#route-paths
```typescript
router.get<Buffer, {n: number}>("/dynamic/:n", (request, response) => {
    console.log(request.params);
    response.end(Math.sqrt(request.params.n));
}, {
    paramsValidator: object({
        n: strToInt()
    })
});
```
```bash
curl http://localhost:8080/dynamic/2
```
# Websocket
```typescript
router.ws("/ws")
    .on("message", (data, socket) => {
        console.log(data.toString()); // data is Buffer
        socket.send(data);
    });
```
### js build-in websockets:
```javascript
const connection = new WebSocket("ws://localhost:8080/ws");
connection.send("test");
connection.onmessage = (message) => {
    console.log(message.data);
};
```
### [Backendium connect](https://github.com/vssizoff/backendiumConnect)
```typescript
import {websocketRequest} from "backendium-connect";

websocketRequest()
    .on("message", (data, socket) => {
        console.log(data); // data is Buffer
    })
    .send("ws://localhost:8080/ws")
    .then(socket => {
        socket.send("test");
    });
```
## Events
```typescript
router.ws("/ws")
    .event<number>("sqrt", (data, socket) => {
        console.log(data);
        socket.emit("response", Math.sqrt(data));
    }, int());
```
only Backendium connect
```typescript
websocketRequest()
    .event<number>("response", data => console.log(data), float())
    .send("ws://localhost:8080/ws")
    .then(socket => {
        socket.emit("sqrt", 2);
    });
```
## Init
```typescript
router.ws<string>("/ws-init")
    .event("test", (data, socket) => {
        socket.send(socket.initData);
    })
    .requireInit<number>((socket, data) => {
        if (!(data in USERS)) return null; // auth failed
        return USERS[data]; // return auth data
    }, int());
```
```typescript
websocketRequest<number>()
    .on("message", data => {
        console.log(data.toString());
    })
    .send("ws://localhost:8080/ws-init", 54)
    .then(socket => {
        socket.emit("test");
    });
```
