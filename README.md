#SuperRoute
Non-pretentious, Mildly-opinionated  Express Framework

[![Build Status](https://travis-ci.org/roiperlman/express-version-router.svg?branch=master)](https://travis-ci.org/roiperlman/express-version-router)
[![Coverage Status](https://coveralls.io/repos/github/roiperlman/express-version-router/badge.svg?branch=master)](https://coveralls.io/github/roiperlman/express-version-router?branch=master)
[![Install Sizze](https://badgen.net/packagephobia/publish/version-router-express)](hhttps://packagephobia.com/result?p=version-router-express)
[![Install Sizze](https://badgen.net/bundlephobia/dependency-count/version-router-express)](https://packagephobia.com/result?p=version-router-express)

___
 
`SuperRoute` is a framework for building readable api routes,
aimed at improving code re-usability, code readability and route documentation.

###Main Features:

* Built in request **[input validation](#Input-Validation)**
* Simple yet fine-grained **[access control management](#Access-Control)**
* **[Auto-generated documentation](#Generate-Route-Documentation)**
* **[Simple route versioning](#Route-Versioning)**
* **Inheritance-Based** - organize route types by classes
* Simple **[Error handling](#Error-Handling)**

## Installation
***
```
npm install --save super-route
```

import:
```typescript
import {SuperRoute} from 'super-route';
```

##Usage

---
####Create a new route class that extends `SuperRoute`.
You can create classes for specific route types or groups - e.g. routes that
require authentication, access control, or share data with the middleware.

```typescript
import {SuperRoute} from 'super-route';

class BasicRoute extends SuperRoute {}

// all created routes will require authentication
class AuthenticatedRoute extends BasicRoute {
  authenticate: true;
}
// all created routes will use access control function to block non admin users
class AdminOnlyRoute extends AuthenticatedRoute {
  permissions: {
    equalOrGreaterThan: 'admin'
  }
}
```
#### Instantiate Routes
A SuperRoute instance (and it's children's instances) is passed a [`RouteSettings`](#RouteSettings) configuration object.

See the Api section blow for full options.

```typescript
const routes: Array<SuperRoute> = [
  new AdminOnlyRoute({
    path: 'users/new',
    verb: 'post',
    name: 'new user',
    description: 'creates a new user',
    bodyParams: [
      new BodyParameter('firstName', 'string', 'user first name', true),
      new BodyParameter('lastName', 'string', 'user last name', true),
      new BodyParameter(
        'mobilePhone',
        'string',
        'user mobile phone',
        true,
        [{
            test: (value: string) => {
              return value.length === 10
            },
            description: 'checks if mobile phone has 10 digits'
        }]
      ),
    ],
    middleware: [
      (req: Request, res: Response, next: NextFunction) => {
        // ... Some middleware logic
      }
    ]
  }),
  new AuthenticatedRoute({
    path: 'users/read/:id',
    verb: 'post',
    name: 'new user',
    description: 'creates a new user',
    authenticate: true,
    routeParams: [
      new RouteParameter('id', 'mongodb id', true, [{
            test: (value: string) => ObjectId.isValid(value),
            description: 'id must be a valid mongodb ObjectId'
        }]
      ),
    ],
    middleware: [
      // stack req processing middleware here for re-usability
      SomeGenericMiddleWare,
      SomeMoreGenericMiddleware({configuration: 'some configuration'}),
      (req: Request, res: Response, next: NextFunction) => {
        // ... Some middleware logic
      }
    ]
  }),
]
```

#### Mount routes
```typescript
const apiRouter = Router();
routes.forEach(route => route.mount(router));
```

### Access Control

### Input Validation

### Error Handling

### Generate Route Documentation

### Route Versioning

## API

---

### Interface: RouteSettings

Configuration Object for SuperRoute instance

```typescript
const route = new SuperRoute({
  path: 'some/path',
  verb: 'post',
  name:'some name'
  // ....
})
```
| Name | Type |  Description | Required |
| :------ | :------ | :------ | :------ |
| `path` | [*ExpressHttpVerb*]() | Http Verb | `true` |
| `verb` | *string* | Route path | `true` |
| `name` | *string* | Route Name | `true` |
| `comments` | *string* | Additional comments for documentation | `fasle` |
| `description` | *string* | Route description | `fasle`|
| `middleware` | *RequestHandler[]* | Route Middleware |`fasle` |
| `versionedMiddleware` | *VersionedMiddleware[]* | An Array of VersionedMiddleware instances - see [https://www.npmjs.com/package/version-router-express](https://www.npmjs.com/package/version-router-express) |`fasle` |
| `bodyParams` |  [*BodyParameter*]()[]* | An Array of BodyParameter instances, defining required and/or optional parameters for request body as well as input validation tests | `fasle`|
| `routeParams` |  [*RouteParameter*]()[]* | An Array of RouteParameter instances, defining the types and validation rules for route parameters | `fasle`|
| `authenticate` | *boolean* | When true, will mount the authentication function as middleware before other routes | `fasle`|
| `permissions` | [*RoutePermissions*](routepermissions.md) | A RoutePermissions object for use with the package's standard access control function | `fasle`|
| `responseContentType` | *string* | response content type - used to set headers | `false` |
| `errorHandlerOptions` | [*ErrorHandlerOptions*]() | Options that will be passed to the global error handler | |
| `redirectOnError` | *string* | Optional redirect when error is handled by the route | `false` |
| `showHelp` | *boolean* | When set to true, will return an ascii output of the requested route's information when called with the OPTIONS http method. <br>Example: <br> ```console curl --request OPTIONS https://localhost:8080/path/to/my/route``` | `fasle`|
| `responseFormat` | *string* | response body type - used for automated testing | `false` |
| `responseReturnType` | [*SuccessResponse*]() |response format used for documentation | `false` |



