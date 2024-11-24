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
## GET
```typescript

```