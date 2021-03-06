# SuperRoute
##### Non-pretentious, Mildly-opinionated  Express Framework

[![Build Status](https://travis-ci.org/roiperlman/super-route.svg?branch=master)](https://travis-ci.org/roiperlman/super-route)
[![Coverage Status](https://coveralls.io/repos/github/roiperlman/super-route/badge.svg?branch=master)](https://coveralls.io/github/roiperlman/super-route?branch=master)
[![Install Size](https://badgen.net/packagephobia/publish/super-route-express)](https://packagephobia.com/result?p=super-route-express)
[![Dependency Count](https://badgen.net/bundlephobia/dependency-count/super-route-express)](https://badgen.net/bundlephobia/dependency-count/super-route-express)

`SuperRoute` is a framework for building readable api routes,
aimed at improving code re-usability, code readability and route documentation.

### Main Features:

* Built in request **<a href="#Input-Validation">input validation</a>**
* Simple yet fine-grained **[access control management](#Access-Control)**
* **[Auto-generated documentation](#Generate-Route-Documentation)**
* **[Simple route versioning](#Route-Versioning)**
* **Inheritance-Based** - organize route types by classes
* Simple **<a href="#Error-Handling">Error handling</a>**

## Installation
***
```
npm install --save super-route-express
```

import:
```typescript
import {SuperRoute} from 'super-route-express';
```

## Usage

---
#### Create a new route class that extends `SuperRoute`.
You can create classes for specific route types or groups - e.g. routes that
require authentication, access control, or share data with the middleware.

```typescript
import {SuperRoute} from 'super-route-express';

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
A SuperRoute instance (and it's children's instances) is passed a <a href="#Class:-RouteSettings">`RouteSettings`</a> configuration object.
Each route has a stack of request handlers that or bound the route as their `this` argument when calling `mount()`,
it allows access to error handling methods as well as additional instance and class data that might be useful.

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
___
SuperRoute offers two levels of access control that can be defined in the extending class.
#### 1. Access Control function

Defined by the `$$accessControlFunction` property, it is used to limit access to users with defined permissions,
using the route's `permissions` settings.

**Setting Route Permissions**

Use a RoutePermissions object to configure access control
for a route instance or extending class with the following options.

* `equalOrGreaterThan` - requester must have a permission level that is equal or greater
  than the given string as defined by the hierarchy array.

* `specific` - requester must have all the given permissions

* `merge` - when set to 'and' requester must satisfy both the specific an hierarchical rules.

All properties are optional, but the configuration must contain either `equalOrGreaterThan` or `specific`.

Example:
```typescript
{
  equalOrGreaterThan: 'admin',
  specific: ['specialPermission', 'awesomeDude'],
  merge: 'and'
}
```
will only grant access to admins that also have the specialPermission and awesomeDude permisions

Per-route instance configuration:
```typescript
const route = new BasicRoute({
  path: 'some/path',
  verb: 'post',
  name: 'some name',
  permissions: {
    equalOrGreaterThan: 'admin',
    specific: ['specialPermission', 'awesomeDude'],
    merge: 'and'
  }
  // ... //
})
```
Or configure a child class:

```typescript
class AdminOnlyRoute extends SuperRoute {
  permissions: { specific: ['admin'] }
}
```

**Configure Access Control function**

* Assign an [`AccessControlFunction`](#Interface:-AccessControlFunction) to the `$$accessControlFunction` in the class definition.
  When mounted, it will be called with the route's permissions and should return a `RequestHandler`.
* Use the static method [`SuperRoute.checkPermissions`](#checkPermissions) to validate the user's permissions.
  note that `checkPermissions`receives a hierarchy Array in which the item with the largest index is the highest in the hierarchy.
* Also note that if the route's permissions are not defined by the class or it's instances, `$$accessControlFunction`
  will not be called.
```typescript
class AuthenticatedRoute extends SuperRoute {
  $$accessControlFunction: AccessControlFunction = (permissions: RoutePermissions) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      // define heirarchy
      const hierarchy = [
        'end_user',
        'editor',
        'admin'
      ]
      let auth;
      try {
        // check user permissions against route permissions ans heirarchy 
        auth = SuperRoute.checkPermissions(req.user.permissions, permissions, hierarchy);
      } catch (err) {
        return next(err);
      }
      if (!auth) {
        // Do some more logic.....
        this.handleError(req, res, next, `user does not have sufficient permissions to access ${this.path}`, 403)
      } else {
        // Do some more logic.....
        return next();
      }
    }
  }
}
```

#### 2. Authentication function
Defined by the `$$authenticationFunction` property, it is used to verify that the requester is logged in. it can be used to perform e.g. JWT verification or another login strategy,
or as a form of input validation to verify that the request reaching the middle contains an authenticated user's data.
When mounted, the function is called with the route's permissions definitions.
Example:

```typescript
class AuthenticatedRoute extends BasicRoute {
  authenticate: true;
  $$authenticationFunction = (req: Request, res: Response, next: NextFunction) => {
    if (req.hasOwnProperty(user)) {
      next();
    } else {
      this.handle(arguments, 'Not Authenticated', 400)
    }
  }
}
```
### Input Validation
___
SuperRoute offers both route parameters and body validation.
Route parameters and properties of the request's body can be defined in the route settings, serving both the purpose
of input validation and route documentation generation.

Input that doesn't meet the defined spec will return a detailed error and 400 status code.

#### ***Body Validation***
```typescript
const route = new BasicRoute({
  // ...route settings... //
  bodyParams: [
    new BodyParameter('id', 'string', 'user id', true)
  ]
})
```
Pass an array of `BodyParameter` to the route's settings with the following arguments:

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `name` | *string* | - | property name |
| `type` | *<a href="#ParameterType">ParameterType</a>* | 'any' | the expected type of the parameter. if defined, will throw an error if the parameter's type doesn't match |
| `description` | *string* | '' | text that will be displayed in the rendered help output |
| `required` | *boolean* | true | if true, will throw an error when the property is missing |
| `additionalTests` | [*RequestParameterTestFunction*](#Interface:-RequestParameterTestFunction)[] | [] | an array of additional test functions and their description |

`BodyParameter` (as well as `RouteParameter`) can be defined with additional validations (in addition to the type checking)

```typescript
new BodyParameter('mobilePhone', 'string', 'user mobile phone', true, [
  {
    test: (value: string) => {
      return value.length === 10
    },
    description: 'mobile phone must have 10 digits'
  }
])
```
All validation errors are combined and returned.

#### ***Route Parameters Validation***
```typescript
const route = new BasicRoute({
  // ...route settings... //
  bodyParams: [
    new RouteParameter('id', 'user id', true)
  ]
})
```
Pass an array of `RouteParameter` to the route's settings with the following arguments:

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `name` | *string* | - | property name |
| `description` | *string* | '' | text that will be displayed in the rendered help output |
| `required` | *boolean* | true | if true, will throw an error when the property is missing |
| `additionalTests` | [*RequestParameterTestFunction*](#Interface:-RequestParameterTestFunction)[] | [] | an array of additional test functions and their description |

**Route Parameters can also have additional validations same as body parameters**

### Error Handling
___
#### Handling with `this.handle()`
Middleware functions are all bound to the route as their `this` argument, so it is possible to call `this.handle()`
from any of the middleware functions, with following parameters:

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `middlewareArgs` | IArguments | - | req, res, next from the express middleware function |
| `errorOrMessage` | *string* | Error | Error object, or an error message string | - | error message |
| `statusCode` | *number* | 500 | html response status code |
| `respondWith?` | *string* | - | optional custom error message to send as response |
| `log` | *boolean* | `false` | log the error to the console if true |
| `redirect` | *string* | `false` | redirect url passed to the error handler |
| `options?` | *object* | - | options object to pass to a custom error handler |

It will construct a <a href="#RouteError">`RouteError`</a> object and pass it to `next()`.

It's also possible to just pass a vanilla Error object to next, but handling with RouteError


### Generate Route Documentation
___
Route information, including body / route parameters and their validation rules can be exported.
#### Export to markdown
call `toMarkdown()` method on any route to generate documentation.
Optionally, on an array of routes:
```typescript
fs.writeFileSync('routes.md', RoutesArray.map(route => route.toMarkdown()).join('<br><br>'))
```
Here's an example of a route that uses all features available for documentation.



You can see the resulting markdown output **[here](https://github.com/roiperlman/super-route/blob/master/etc/route_info_example.md)**.


#### View Documentation in terminal

It's also possible to enable making and `OPTIONS` http request to a route and receive a text output of the route's documentation,
which may be helpful during development.

Expample:

```typescript
import {SuperRoute} from "./SuperRoute";

function shouldShowHelp() {
  return process.env.test === 'true'
}

class RouteWithHelp extends SuperRoute {
  showHelp = (self: RouteWithHelp) => {
    return process.env.test === 'true';
  }
}

// Or 

const route = new BasicRoute({
  //... route settings ...//
  showHelp: true // or false
})


```

```bash
curl --request OPTIONS localhost:8080/path/to/route
```

### Route Versioning

SuperRoute can also `VersionedMiddleware` objects to handle route versioning.
See **[version-router-express](https://www.npmjs.com/package/version-router-express)** for further configuration details.

**Example:**

configure route with versioned routes
```typescript
app.use(VersionedRouter.ExtractVersionFromHeader('App-version'));

// .... server logic .... //

new BasicRoute({
  path: 'versioned_route',
  verb: 'get',
  name: 'versioned route',
  versionedMiddleware: [
    {
      version: '1.0.0',
      default: false,
      middleware: [
        (req: Request, res: Response, next: NextFunction) => {
          console.log('route 2 function 1')
          next()
        },
        (req: Request, res: Response, next: NextFunction) => {
          console.log('route 2 function 2')
          res.send({route: '1'})
        },
      ]
    },
    {
      version: '>=1.2.0 <2.0.0',
      default: false,
      middleware: [
        (req: Request, res: Response, next: NextFunction) => {
          console.log('route 2 function 1')
          next()
        },
        (req: Request, res: Response, next: NextFunction) => {
          console.log('route 2 function 2')
          res.send({route: '2'})
        },
      ]
    },
    {
      version: '2.0.0',
      default: true,
      middleware: [
        (req: Request, res: Response, next: NextFunction) => {
          console.log('route 3 function 1')
          next()
        },
        (req: Request, res: Response, next: NextFunction) => {
          console.log('route 3 function 2')
          res.send({route: '3'})
        },
      ]
    }
  ]
})
```
make requests with custom header
```bash
curl -H 'App-version: 1.0.0' -X GET localhost:8081/versioned_rout
## ==> '{route: '1'}'
curl -H 'App-version: 1.1.0' -X GET localhost:8081/versioned_rout
## will resolve to default
## ==> '{route: '3'}' 
curl -H 'App-version: 1.3.0' -X GET localhost:8081/versioned_rout
## ==> '{route: '2'}'
```


# API Reference

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
| `path` | <a href="#ExpressHttpVerb">*ExpressHttpVerb*</a> | Http Verb | `true` |
| `verb` | *string* | Route path | `true` |
| `name` | *string* | Route Name | `true` |
| `comments` | *string* | Additional comments for documentation | `fasle` |
| `description` | *string* | Route description | `fasle`|
| `middleware` | *RequestHandler[]* | Route Middleware |`fasle` |
| `versionedMiddleware` | *VersionedMiddleware[]* | An Array of VersionedMiddleware instances - see [https://www.npmjs.com/package/version-router-express](https://www.npmjs.com/package/version-router-express) |`fasle` |
| `bodyParams` |  <a href="#Class:-BodyParameter">*BodyParameter*</a>[] | An Array of BodyParameter instances, defining required and/or optional parameters for request body as well as input validation tests | `fasle`|
| `routeParams` |  <a href="#Class:-RouteParameter">*RouteParameter*</a>[] | An Array of RouteParameter instances, defining the types and validation rules for route parameters | `fasle`|
| `authenticate` | *boolean* | When true, will mount the authentication function as middleware before other routes | `fasle`|
| `permissions` | <a href="#Interface:-RoutePermissions">*RoutePermissions*</a> | A RoutePermissions object for use with the package's standard access control function | `fasle`|
| `responseContentType` | *string* | response content type - used to set headers | `false` |
| `errorHandlerOptions` | [*ErrorHandlerOptions*]() | Options that will be passed to the global error handler | |
| `redirectOnError` | *string* | Optional redirect when error is handled by the route | `false` |
| `showHelp` | *boolean* <br><br>or<br><br> (`self`: [*SuperRoute*](Class:-SuperRoute)) => *boolean*  | When set to true, will return an ascii output of the requested route's information when called with the OPTIONS http method. <br>Example: <br> ```curl --request OPTIONS https://localhost:8080/path/to/my/route``` | `fasle`|
| `responseFormat` | *string* | response body type - used for automated testing | `false` |
| `responseReturnType` | [*SuccessResponse*]() |response format used for documentation | `false` |


## Class: SuperRoute

---

Base Class for an express route super route
Middleware order:
1. Authentication function
2. Access control
3. Route Parameters validation
4. Route Parameters validation
5. Route Specific middleware defined in the middleware or versioned middleware arrays

### Implements

* <a href="#Interface:-RouteSettings">*RouteSettings*</a>

### Methods

#### handle

??? **handle**(`middlewareArgs`: IArguments, `errorOrMessage`: *string* | Error | <a href="#Class:-RouteError">*RouteError*</a>, `statusCode?`: *number*, `respondWith?`: *string*, `log?`: *boolean*, `redirect?`: *string* | ``false``, `options?`: { [key: string]: *any*;  }): *void*

**handles errors in the route's logic.**

errors can be channeled to a custom error handler  specific to the route by defining $$errorHandler
by default, a RouteError object containing route and request data will be created and passed to next(err)

##### Parameters:

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `middlewareArgs` | IArguments | - | req, res, next from the express middleware function |
| `errorOrMessage` | *string* | Error | <a href="#RouteError">*RouteError*</a> | - | error message |
| `statusCode` | *number* | 500 | html response status code |
| `respondWith?` | *string* | - | optional custom error message to send as response |
| `log` | *boolean* | `false` | log the error to the console if true |
| `redirect` | *string* | ``false`` | - | redirect url |
| `options?` | *object* | - | options object to pass to a custom error handler |

**Returns:** *void*

#### checkPermissions

??? `Static`**checkPermissions**(`userPermissions`: *string* | *string*[], `permissions`: <a href="#Interface:-RoutePermissions">*RoutePermissions*</a>, `hierarchy`: *string*[]): *boolean*

checks if the user has the permissions defined in the permissions object and according to the defined hierarchy
For use with an access control function.

##### Parameters:

| Name | Type |
| :------ | :------ |
| `userPermissions` | *string* | *string*[] |
| `permissions` | <a href="#RoutePermissions">*RoutePermissions*</a> |
| `hierarchy` | *string*[] |

**Returns:** *boolean*

___

### mount

??? **mount**(`router`: *Router*): *void*

mounts the route on a router instance or express app

#### Parameters:

| Name | Type |
| :------ | :------ |
| `router` | *Router* |

**Returns:** *void*

Defined in: src/SuperRoute.ts:159

___

### toMarkdown

??? **toMarkdown**(): *string*

Generates markdown documentation for hte route

**Returns:** *string*

Defined in: src/SuperRoute.ts:418

___

### DefaultErrorHandler

??? `Static`**DefaultErrorHandler**(`err`: <a href="#Class:-RouteError">*RouteError*</a> <br> RouteErrorI, `req`: *Request*<ParamsDictionary, any, any, ParsedQs, Record<string, any\>\>, `res`: *Response*<any, Record<string, any\>\>, `next`: NextFunction): *void*

a default error handler to mount as the last middleware of the app

#### Parameters:

| Name | Type |
| :------ | :------ |
| `err` | <a href="#Class:-RouteError">*RouteError*</a> <br> RouteErrorI |
| `req` | *Request* |
| `res` | *Response*|
| `next` | NextFunction |

**Returns:** *void*



## Class: BodyParameter

Defines a parameter expected to be present in the request's body

### constructor

**new BodyParameter**(`name`: *string*, `type?`: [*ParameterType*](), `description?`: *string*, `required?`: *boolean*, `additionalTests?`: [*RequestParameterTestFunction*](#Interface:-RequestParameterTestFunction)[]): <a href="#Class:-BodyParameter">*BodyParameter*</a>

Constructs a BodyParameter instance

#### Parameters:

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `name` | *string* | - | property name |
| `type` | <a href="#Type:-ParameterType">*ParameterType*</a> | 'any' | the expected type of the parameter. if defined, will throw an error if the parameter's type doesn't match |
| `description` | *string* | '' | text that will be displayed in the rendered help output |
| `required` | *boolean* | true | if true, will throw an error when the property is missing |
| `additionalTests` | [*RequestParameterTestFunction*](#Interface:-RequestParameterTestFunction)[] | [] | an array of additional test functions and their description |
| `nullable` | *boolean* | false | when true, allows a required parameter to be null, ignoring it's type definition |

## Class: RouteParameter

Defines a parameter expected to be present in the request's route

### constructor

**new RouteParameter**(`name`: *string*, `description?`: *string*, `required?`: *boolean*, `additionalTests?`: [*RequestParameterTestFunction*](#Interface: RequestParameterTestFunction)[]): <a href="#Interafce:-RouteParameter">*RouteParameter*</a>

Constructs a BodyParameter instance

#### Parameters:

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `name` | *string* | - | property name |
| `description` | *string* | '' | text that will be displayed in the rendered help output |
| `required` | *boolean* | true | if true, will throw an error when the property is missing |
| `additionalTests` | [*RequestParameterTestFunction*](#Interface:-RequestParameterTestFunction)[] | [] | an array of additional test functions and their description |


## Interface: RequestParameterTestFunction

A test function and test description for testing request parameters

```typescript
new BodyParameter('age', 'number', 'user age', true, [
  {
    test: (value) => value > 18,
    description: 'User must be over 18'
  }
])
```

| Name | Type | Description |
| :------ | :------ | :------ |
| `test` | ```test(value: any): boolean``` | a test function that receives the parameter value as an argument and returns a boolean |
| `description` | *string* | an optional description of the test that will be displayed in the error output in case the function returns false |

## Interface: AccessControlFunction

Access control function for SuperRoute settings
When mounted, it will be called with the route's permissions and should return a RequestHandler


??? **AccessControlFunction**(`permissions`: <a href="#RoutePermissions">*RoutePermissions*</a>): *RequestHandler*

#### Parameters:

| Name | Type |
| :------ | :------ |
| `permissions` | <a href="#RoutePermissions">*RoutePermissions*</a> |


## Interface: RoutePermissions

Access Control configuration for a route instance or extending class

* `equalOrGreaterThan` - requester must have a permission level that is equal or greater
  than the given string as defined by the hierarchy array.

* `specific` - requester must have all the given permissions

* `merge` - when set to 'and' requester must satisfy both the specific an hierarchical rules.

Example:

```typescript
{
  equalOrGreaterThan: 'admin';
  specific: ['specialPermission', 'awesomeDude'];
  merge: 'and'
}
```
will only grant access to admins that also have the specialPermission and awesomeDude permisions

## Interface: ErrorHandlerOptions

### Indexable

??? [key: *string*]: *any*

### Properties

### log

??? `Optional` **log**: *boolean*

___

### redirectOnError

??? `Optional` **redirectOnError**: *string*

---

## Class: RouteError

A SuperRoute error with additional data
* *Error*

  ??? **RouteError**

### constructor

\+ **new RouteError**(`message`: *string*, `statusCode`: *number*, `redirect?`: ``null`` | *string* | ``false``, `log?`: *boolean*): <a href="#Class:-RouteError">*RouteError*</a>

Constructs a RouteError instance

#### Parameters:

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `message` | *string* | - | Error message |
| `statusCode` | *number* | - | Http status code |
| `redirect` | ``null`` *string* ``false`` | false | tells the error handler if it should redirect the request |
| `log` | *boolean* | false | tells the error handler to log the error - use it to override the default logging behaviour for specific errors when needed. |

**Returns:** <a href="#Class:-RouteError">*RouteError*</a>

### Properties

### logError

??? **logError**: *boolean*
___

### message
Error message

??? **message**: *string*

Inherited from: Error.message
___

### redirect
Tells the error handler if it should redirect the request

??? **redirect**: *string* | ``false``
___

### requestPath
The path of the request that invoked the route that where the error was thrown

??? `Optional` **requestPath**: *string*

___

### response
Optional response to replace the error message when sent to the user
??? `Optional` **response**: *string*

___

### route
The path of the route where the error was thrown

??? `Optional` **route**: *string*

___

### statusCode

Response status code

??? **statusCode**: *number*

___

### Methods

### handle
Handles a RouteError with the data of the given route.
Example:
```typescript
new RouteError('SomeError', 400, null, true).handle(this, req, res, next);
```
??? **handle**(`route`: SuperRoute, `req`: *Request*, `res`: *Response*, `next`: NextFunction): *void*

#### Parameters:

| Name | Type |
| :------ | :------ |
| `route` | *any* |
| `req` | *Request*<ParamsDictionary, any, any, ParsedQs, Record<string, any\>\> |
| `res` | *Response*<any, Record<string, any\>\> |
| `next` | NextFunction |

**Returns:** *void*

Defined in: src/RouteError.ts:66

___

### respondWith
Attach a custom response to the RouteError object

??? **respondWith**(`response`: *string*): <a href="#Class:-RouteError">*RouteError*</a>

#### Parameters:

| Name | Type |
| :------ | :------ |
| `response` | *string* |

**Returns:** <a href="#Class:-RouteError">*RouteError*</a>

Defined in: src/RouteError.ts:61

___

### FromError
Generate a RouteError instance from a vanilla `Error` instance.

??? `Static`**FromError**(`err`: Error, `statusCode`: *number*, `redirect?`: ``null`` | *string* | ``false``, `log?`: *boolean*): <a href="#Class:-RouteError">*RouteError*</a>

#### Parameters:

| Name | Type | Default value |
| :------ | :------ | :------ |
| `err` | Error | - |
| `statusCode` | *number* | - |
| `redirect` | ``null`` <br> *string* <br> ``false`` | false |
| `log` | *boolean* | false |

**Returns:** <a href="#Class:-RouteError">*RouteError*</a>


## Type aliases

### ExpressHttpVerb
Available http verbs for super-route settings object

?? **ExpressHttpVerb**: ``"get"`` | ``"post"`` | ``"put"`` | ``"head"`` | ``"delete"`` | ``"options"`` | ``"trace"`` | ``"copy"`` | ``"lock"`` | ``"mkcol"`` | ``"move"`` | ``"purge"`` | ``"propfind"`` | ``"proppatch"`` | ``"unlock"`` | ``"report"`` | ``"mkactivity"`` | ``"checkout"`` | ``"merge"`` | ``"m-search"`` | ``"notify"`` | ``"subscribe"`` | ``"unsubscribe"`` | ``"patch"`` | ``"search"`` | ``"connect"``
___

### ParameterType

?? **ParameterType**: ``"string"`` | ``"number"`` | ``"boolean"`` | ``"object"`` | ``"array"`` | ``"parsableDateString"`` | ``"null"`` | ``"any"``

Optional types for a body parameter

Defined in: src/RequestParameters.ts:93

___

### SuccessResponse
response options

?? **SuccessResponse**: ``"message"`` | ``"Array"`` | ``"object"`` | ``"file"``
