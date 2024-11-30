<h1 align="center">Backendium</h1>

# Table of Contents
> 1. [Installation](#installation)
> 2. [Basics](#basics)
> 3. [Routing](#routing)
# Installation
```bash
npm i backendium checkeasy
```
# Basics
```typescript
import Backendium from "backendium";

const app = new Backendium;

app.get("*", (request, response, app, next) => {
    response.end({backendium: "0.0.0"});
});

app.start();
```
request:
```bash
curl http://localhost:8080/
```
response:
```json
{"backendium":"0.0.0"}
```
# Routing
## Router class
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
import {BackendiumRouter} from "backendium/dist/router";

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
router.post<Buffer, {}, {}, string>("/auth", (request, response) => {
    console.log(request.auth); // type of request.auth is string
    response.end();
}, {
    authChecker(request, response) {
        if (typeof request.headers.auth !== "string" || request.headers.auth !== "backendium") return null; // auth failed
        return request.headers.auth; // return auth data
    }
});
```
```bash
curl http://localhost:8080/auth -H "auth:backendium" -d ""
```
## Global (for router)
```typescript
const router = new BackendiumRouter<string>;

router.setAuth((request, response) => {
    if (typeof request.headers.auth !== "string" || request.headers.auth !== "backendium") return null; // auth failed
    return request.headers.auth; // return auth data
});

router.post("/auth", (request, response) => {
    console.log(request.globalAuth); // type of request.globalAuth is string
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