import {ErrorRequestHandler, NextFunction, Request, RequestHandler, Response, Router} from "express";
import * as ejs from 'ejs';
import {RouteError, RouteErrorI} from "./RouteError";
import {BodyParameter, ParameterType, RouteParameter} from "./RequestParameters";
import {VersionRouter, VersionedRoute, VersionedMiddleware} from 'version-router-express';
import {md} from "./md";

/**
 * response options
 * @public
 */
export type SuccessResponse = 'message'|'Array'|'object'|'file'

export type RouteHandler = (req: Request,
                            res: Response,
                            next: NextFunction,
                            errorOrMessage: string|Error|RouteError,
                            statusCode: number,
                            log?: boolean,
                            redirect?: string|false,
                              options?: {[key: string]: any}) => {};

/**
 * Configuration Object for SuperRoute instance
 * @public
 */
export interface RouteSettings {
  /**
   * route path
   */
  path: string;
  /**
   * Http verb
   */
  verb: ExpressHttpVerb;
  /**
   * response content type - used to set headers
   */
  responseContentType?: string;
  /**
   * response body type - used for automated testing
   */
  responseReturnType?: SuccessResponse;
  /**
   * response format used for documentation
   */
  responseFormat?: string;
  /**
   * An array of Request Handlers hat will be mounted on the route
   */
  middleware?: Array<RequestHandler|RequestHandlerWithPromise>|RequestHandler|RequestHandlerWithPromise;
  /**
   * An Array of VersionedMiddleware instances - see {@link https://www.npmjs.com/package/version-router-express}
   * route can accept either
   */
  versionedMiddleware?: Array<VersionedMiddleware>;
  /**
   * Route name
   */
  name?: string;
  /**
   * Route description
   */
  description?: string;
  /**
   * Additional comments for documentation
   */
  comments?: string;
  /**
   * When true, will mount the authentication function as middleware before other routes
   */
  authenticate?: boolean;
  /**
   * A RoutePermissions object for use with the package's standard access control function
   */
  permissions?: RoutePermissions;
  /**
   * An Array of BodyParameter instances, defining required and/or optional parameters for request body
   * as well as input validation tests
   */
  bodyParams?: Array<BodyParameter>;
  /**
   * An Array of RouteParameter instances, defining the types and validation rules for route parameters
   */
  routeParams?: Array<RouteParameter>;
  /**
   * Optional redirect when error is handled by the route
   */
  redirectOnError?: string;
  /**
   * When set to true, will return an ascii output of the requested route's information when called with the OPTIONS http method.
   *
   * Example: curl --request OPTIONS https://localhost:8080/path/to/my/route
   */
  showHelp?: boolean;
  /**
   * Options that will be passed to the global error handler
   */
  errorHandlerOptions?: ErrorHandlerOptions;
}

export interface ErrorHandlerOptions {
  log?: boolean;
  redirectOnError?: string;
  [key: string]: any;
}

/**
 * Base Class for an express route super route
 * Middleware order:
 * 1. Authentication function
 * 2. Access control
 * 3. Route Parameters validation
 * 4. Route Parameters validation
 * 5. Route Specific middleware defined in the middleware or versioned middleware arrays
 * @class
 * @public
 */
export abstract class SuperRoute implements RouteSettings {
  path: string;
  verb: ExpressHttpVerb;
  responseContentType?: string;
  responseFormat?: string;
  middleware: Array<RequestHandler|RequestHandlerWithPromise>|RequestHandler|RequestHandlerWithPromise;
  versionedMiddleware: Array<VersionedMiddleware>;
  name: string;
  description: string;
  authenticate: boolean;
  permissions: RoutePermissions;
  bodyParams: Array<BodyParameter>;
  routeParams: Array<RouteParameter>;
  redirectOnError: string;
  showHelp: boolean;
  errorHandlerOptions: ErrorHandlerOptions;
  // set when a child class is defined
  $$authenticationFunction: RequestHandler|RequestHandlerWithPromise;
  $$accessControlFunction: AccessControlFunction;
  $$errorHandler: srErrorHandlerFunction;
  private settings: RouteSettings;
  private static defaultSettings = {
    authenticate: true,
    showHelp: false
  };

  /**
   * @param settings
   */
  constructor(settings: RouteSettings) {
    Object.assign(this, SuperRoute.defaultSettings);
    Object.assign(this, settings);
  }

  /**
   * mounts the route on a router instance or express app
   * @param router
   * @public
   */
  mount(router: Router) {
    let middlewareFunctions: Array<RequestHandler> = [];
    let optionalMiddleware = ['$$authenticationFunction', '$$accessControlFunction'];
    // set authentication
    if (this.authenticate) {
      if (!this.$$authenticationFunction) {
        throw new Error(`Authentication function not defined for route ${this.path}`);
      } else {
        middlewareFunctions.push(this.$$authenticationFunction);
      }
    }
    // set access control
    if (this.permissions) {
      if (!this.$$accessControlFunction) {
        throw new Error(`Access Control function not defined for route ${this.path}`);
      } else {
        middlewareFunctions.push(this.$$accessControlFunction(this.permissions).bind(this));
      }
    }
    // set validation functions
    if (this.routeParams) {
      middlewareFunctions.push(this.validateRouteParams.bind(this))
    }
    if (this.bodyParams) {
      middlewareFunctions.push(this.validateBody.bind(this))
    }
    // set middleware functions

    if (this.versionedMiddleware) {
      // generate version router from versioned middleware definitions
      const versionRouter = new VersionRouter(
        this.versionedMiddleware.map(m => {
          return new VersionedRoute({
            default: m.default,
            middleware: m.middleware.map(f => f.bind(this)),
            version: m.version
          })
        })
      );
      middlewareFunctions.push(versionRouter.routeRequestByVersion())
    } else {
      if (!Array.isArray(this.middleware)) {
        middlewareFunctions.push(this.middleware.bind(this));
      } else {
        this.middleware.forEach(m => middlewareFunctions.push(m.bind(this)));
      }
    }
    const path = `${this.path.charAt(0) === '/' ? '' : '/'}${this.path}`;
    try {
      router[this.verb](path, middlewareFunctions)
    } catch (err) {
      throw new Error(err);
    }

    if (this.showHelp) {
      router.options(path, this.help.bind(this))
    }
  }

  //*************************************//
  //********** UTILITY METHODS **********//
  //*************************************//

  /**
   * checks if the route or body param matches the specified type
   * @param value
   * @param type
   * @hidden
   */
  static matchesType(value: any, type: ParameterType): boolean {
    if (type === 'any' || !type) { // if type is any or no type was defined return true
      return true;
    } else if (['string','number','boolean','object'].includes(type)) {
      return typeof value === type;
    } else {
      switch (type) {
        case 'array':
          return Array.isArray(value);
        case 'parsableDateString':
          return (typeof value === 'string' && (new Date(value).toString() !== 'Invalid Date'));
        case "null":
          return value === null;
        default:
          return false;
      }
    }
  }

  /**
   * checks if the user has the permissions defined in the permissions object and according to the defined hierarchy
   * For use with an access control function.
   * @param userPermissions
   * @param permissions
   * @param hierarchy
   */
  static checkPermissions(userPermissions: Array<string>|string, permissions: RoutePermissions, hierarchy: Array<string>): boolean {
    if (!permissions.hasOwnProperty('equalOrGreaterThan') && !permissions.hasOwnProperty('specific')) {
      throw new Error('Missing configuration in permissions object. should contain a least one rule');
    }
    userPermissions = Array.isArray(userPermissions) ? userPermissions : [userPermissions];
    // get minimal permission index
    let userPermissionInSpec: boolean|undefined = undefined;
    if (permissions.hasOwnProperty('equalOrGreaterThan') && typeof permissions.equalOrGreaterThan === 'string' ) {
      const minimalPermission = hierarchy.indexOf(permissions.equalOrGreaterThan);
      // get user's highest permission
      let userHighestPermission = 0;
      hierarchy.forEach((permission, index) => {
        if (userPermissions.includes(permission)) {
          userHighestPermission = index;
        }
      });
      userPermissionInSpec = userHighestPermission >=  minimalPermission;
    }

    // check if user has any or all of the specific permissions
    let hasSpecific: boolean|undefined;
    if (permissions.hasOwnProperty('specific') && Array.isArray(permissions.specific)) {
      let hasSpecificArr: Array<boolean> = [];
      permissions.specific.forEach(permission => {
        hasSpecificArr.push(userPermissions.includes(permission));
      });
      if (permissions.merge === 'and' || !permissions.merge) {
        hasSpecific = hasSpecificArr.every(item => item);
      } else {
        hasSpecific = hasSpecificArr.some(item => item);
      }
    }

    // merge the specific and hierarchical permission results
    let finalResultArr: Array<boolean> = [];
    let finalResult = false;
    // if a test result is undefined it means that it's rule wasn't defined in the configuration
    // test results are pushed to an array and reduced to on value according to the merge rule
    if (typeof userPermissionInSpec !== "undefined") {
      finalResultArr.push(userPermissionInSpec);
    }
    if (typeof hasSpecific !== "undefined") {
      finalResultArr.push(hasSpecific);
    }
    // check test results according to rule
    if (permissions.merge === 'and' || !permissions.merge) {
      finalResult = finalResultArr.every(item => item);
    } else {
      // if merge rule = 'or' =>
      finalResult = finalResultArr.some(item => item);
    }
    return finalResult;
  }

  /**
   * a default error handler to mount as the last middleware of the app
   * @param err
   * @param req
   * @param res
   * @param next
   */
  static DefaultErrorHandler(err: RouteError|RouteErrorI, req: Request, res: Response, next: NextFunction) {
    console.log('logging error',err);
    if (err) {
      console.error(err);
      if (err.logError) console.error(err);
      res.status(err.statusCode ? err.statusCode : 500);
      if (err.redirect) {
        res.redirect(err.redirect);
      } else {
        res.send(err.response ? err.response : err.message);
      }
    }
  }

  static HandleError(route: any): RouteHandler {
    return route.handleError.bind(route);
  }

  /**
   * Middleware that handles body parameters validation
   * It runs the following tests in this order, for all defined parameters, and can return more than one error:
   * 1. Checks the presence of the property in the body
   * 2. Matches the type of the property's value
   * 3. Runs additional tests if such were defined (e.g. RegEx match test for a string)
   * @param req
   * @param res
   * @param next
   * @hidden
   */
  protected validateBody(req: Request, res: Response, next: NextFunction) {
    const errors: Array<string> = [];
    // check all body parameters defined for the route and push errors
    this.bodyParams.forEach(bodyParam => {
      if (!req.body.hasOwnProperty(bodyParam.name) && bodyParam.required) { // check if parameter is present and required
        errors.push(`Request body is missing parameter ${bodyParam.name}`)
      } else if (req.body.hasOwnProperty(bodyParam.name)) {
        const value = req.body[bodyParam.name];
        if (!SuperRoute.matchesType(value, bodyParam.type)) { // check if parameter type matches
          errors.push(`Request body parameter ${bodyParam.name} is not of type ${bodyParam.type} (${typeof value})`)
        }
        if (bodyParam.additionalTests) { // run additional tests
          bodyParam.runTests(value).forEach(result => errors.push(result))
        }
      }
    });
    //
    if (errors.length > 0) {
      this.handleError(req, res, next, errors.join('\n'), 400);
    } else {
      return next();
    }
  }

  /**
   * Middleware that handles route parameters validation
   * It runs the following tests in this order, for all defined parameters, and can return more than one error:
   * 1. Checks the presence of the property in the route
   * 2. Runs additional tests if such were defined (e.g. RegEx match test for a string)
   * @param req
   * @param res
   * @param next
   * @hidden
   */
  protected validateRouteParams(req: Request, res: Response, next: NextFunction) {
    const errors: Array<string> = [];
    this.routeParams.forEach(routeParam => {
      if (!req.params.hasOwnProperty(routeParam.name) || typeof req.params[routeParam.name] === 'undefined') { // check if parameter is present
        if (routeParam.required) {
          errors.push(`Request is missing parameter ${routeParam.name}`)
          return this.handleError(req, res, next, errors.join('\n'), 400);
        } else {
          return;
        }
      } else {
        const value = req.params[routeParam.name];
        if (routeParam.additionalTests) { // run additional tests
          routeParam.runTests(value)
            .forEach(err => errors.push(err));
        }
      }
    });
    if (errors.length > 0) {
      this.handleError(req, res, next, errors.join('\n'), 400);
    } else {
      return next();
    }
  }

  /**
   * Renders markdown output containing the description of the route and sends back
   * @param req
   * @param res
   * @param next
   * @hidden
   */
  protected async help(req: Request, res: Response, next: NextFunction) {
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(this.toMarkdown());
  }

  /**
   * Generates markdown documentation for hte route
   */
  toMarkdown() {
    let tables;
    try { tables = this.generateTables() } catch (err) { throw err; }
    console.log(this);
    let md;
    try {
      md = ejs.render(Templates.routeInfoMarkdown, {
        route: this,
        tables: tables
      })
    } catch (e) {
      throw(e);
    }
    return md;
  }

  /**
   * generates tables
   * @protected
   * @hidden
   */
  protected generateTables(): {
    bodyParamsTable: string,
    routeParamsTable: string,
    permissionsTable: string }
  {
    let permissionsTable;
    if (this.permissions) {
      permissionsTable = md.generateTable([
        ['Equal or Greater than', 'Specific permissions', 'Merge rule'],
        [
          this.permissions.equalOrGreaterThan || '',
          this.permissions.specific ? this.permissions.specific.join(', ') : '',
          this.permissions.merge || '',
        ]
      ]);
    } else {
      permissionsTable = 'None';
    }
    let routeParamsTable;
    if (this.routeParams) {
      routeParamsTable = md.generateTable([
        [
          'Name',
          'Description',
          'Required',
          'AdditionalTests'
        ],
        ...this.routeParams.map(p => [
          p.name,
          p.description,
          `\`${p.required}\``,
          md.generateList(p.additionalTests.map(t => t.description))
        ])
      ]);
    } else {
      routeParamsTable = 'None';
    }
    let bodyParamsTable;
    if (this.bodyParams) {
      bodyParamsTable = md.generateTable([
        [
          'Name',
          'Description',
          'Type',
          'Required',
          'AdditionalTests'
        ],
        ...this.bodyParams.map(p => [
          p.name,
          p.description,
          `\`${p.type}\``,
          `\`${p.required}\``,
          md.generateList(p.additionalTests.map(t => t.description))
        ])
      ]);
    } else {
      bodyParamsTable = 'None'
    }

    return {
      bodyParamsTable: bodyParamsTable,
      routeParamsTable: routeParamsTable,
      permissionsTable: permissionsTable
    }
  }

  /**
   * generates a route error
   * @param message - error message
   * @param statusCode - http status code for response
   * @param redirect - optional redirect
   * @param logError
   * @hidden
   */
  Error(message: string, statusCode: number = 500, redirect: string|false = this.redirectOnError, logError: boolean = false): RouteError {
    return new RouteError(message, statusCode, redirect, logError);
  }

  /**
   * handles errors in the routes logic.
   * errors can be channeled to a custom error handler by defining $$errorHandler
   * by default, a RouteError object will be created and passed to next(err)
   * @param req
   * @param res
   * @param next
   * @param errorOrMessage - error message
   * @param statusCode - html response status code
   * @param respondWith - optional custom error message to send as response
   * @param log - log the error to the console if true
   * @param redirect - redirect url
   * @param options - options object to pass to a custom error handler
   * @hidden
   */
  handleError(req: Request,
              res: Response,
              next: NextFunction,
              errorOrMessage: string|Error|RouteError,
              statusCode: number = 500,
              respondWith?: string,
              log: boolean = false,
              redirect: string|false = this.redirectOnError,
              options: {[key: string]: any} = {}) {
    let err: RouteError;
    if (errorOrMessage instanceof RouteError) {
      err = errorOrMessage;
    } else if (errorOrMessage instanceof Error) {
      err = RouteError.FromError(errorOrMessage, statusCode, redirect, log);
    } else {
      err = this.Error(errorOrMessage, statusCode, redirect);
    }
    if (this.errorHandlerOptions) {
      options = this.errorHandlerOptions;
    }
    if (respondWith) {
      err.respondWith(respondWith);
    }

    err.route = `${this.verb.toUpperCase()} ${this.path}`;
    err.requestPath = req.path;

    if (this.$$errorHandler) {
      this.$$errorHandler(req, res, next, err, options);
    } else {
      if (log) {
        console.error(err)
      }
      return next(err);
    }
  }

  /**
   * handles errors in the routes logic.
   * errors can be channeled to a custom error handler by defining $$errorHandler
   * by default, a RouteError object containing route and request data will be created and passed to next(err)
   * @param middlewareArgs - req, res, next from the express middleware function
   * @param errorOrMessage - error message
   * @param statusCode - html response status code
   * @param respondWith - optional custom error message to send as response
   * @param log - log the error to the console if true
   * @param redirect - redirect url
   * @param options - options object to pass to a custom error handler
   */
  handle(middlewareArgs: IArguments,
         errorOrMessage: string|Error|RouteError,
         statusCode: number = 500,
         respondWith?: string,
         log: boolean = false,
         redirect: string|false = this.redirectOnError,
         options?: {[key: string]: any}) {
    const req = middlewareArgs[0];
    const res = middlewareArgs[1];
    const next = middlewareArgs[2];
    this.handleError(req, res, next, errorOrMessage, statusCode, respondWith, log, redirect, options)
  }
}

/**
 * Access Control configuration for a route instance or extending class
 * equalOrGreaterThan - requester must have a permission level that is equal or greater
 * than the given string as defined by the hierarchy array.
 * specific - requester must have all the given permissions
 * merge - when set to 'and' requester must satisfy both the specific an hierarchical rules.
 *
 * Example:
 *
 * {
 *   equalOrGreaterThan: 'admin',
 *   specific: ['specialPermission', 'awesomeDude'],
 *   merge: 'and'
 * }
 * will only grant access to admins that also have the specialPermission and awesomeDude permisions
 */
export interface RoutePermissions {
  equalOrGreaterThan?: string;
  specific?: Array<string>;
  merge?: 'and'|'or';
}

export interface RequestHandlerWithPromise extends RequestHandler {
  (req: Request, res: Response, next: NextFunction): Promise<any>;
}

/**
 * A function that returns a request handler
 */
export interface RequestHandlerFactoryFunction {
  (...args: Array<any>): RequestHandler|RequestHandlerWithPromise
}

/**
 * Access control function for SuperRoute settings
 * When mounted, it will be called with the route's permissions and should return a RequestHandler
 */
export interface AccessControlFunction extends RequestHandlerFactoryFunction{
  (permissions: RoutePermissions): RequestHandler|RequestHandlerWithPromise
}

/**
 * A function that replaces the default error handler of the SuperRoute class
 */
export interface srErrorHandlerFunction extends ErrorRequestHandler {
  (req: Request,
   res: Response,
   next: NextFunction,
   error: RouteError,
   options: { [key: string]: any }): void;
}

/**
 * Available http verbs for super-route settings object
 */
export type ExpressHttpVerb = 'get'|'post'|'put'|'head'|'delete'|'options'|'trace'|'copy'|'lock'|'mkcol'|'move'|'purge'|'propfind'|'proppatch'|'unlock'|'report'|'mkactivity'|'checkout'|'merge'|'m-search'|'notify'|'subscribe'|'unsubscribe'|'patch'|'search'|'connect';

export const AvailableVerbs: Array<ExpressHttpVerb> = [
  'get',
  'post',
  'put',
  'head',
  'delete',
  'options',
  'trace',
  'copy',
  'lock',
  'mkcol',
  'move',
  'purge',
  'propfind',
  'proppatch',
  'unlock',
  'report',
  'mkactivity',
  'checkout',
  'merge',
  'm-search',
  'notify',
  'subscribe',
  'unsubscribe',
  'patch',
  'search',
  'connect',
];

export class Templates {
  static routeInfoMarkdown =
    `## <%= route.name %>
###### <%= route.verb.toUpperCase() %> <%= route.path %>
<%= route.description %>
___
<% if(route.comments){ %> <%= route.comments %> <% } %>

###Route Details:

* Authenticated: <% if(route.authenticate){ %>✅<% } %><% if(!route.authenticate) { %>❌<% } %>

* Has Access Control: <% if(route.permissions){ %>✅<% } %><% if(!route.permissions){ %>❌<% } %>

* Response content type: <%= route.responseContentType %>

* Response Format: <% if(route.responseFormat){ %>\`<%= route.responseFormat || '' %>\`<% } %><% if(!route.permissions){ %>''<% } %>

* Redirect on error: <% if(route.redirectOnError){ %>\`<%= route.redirectOnError || '' %>\`<% } %>

###Access Control:
___
<%- tables.permissionsTable %>
###Route Parameters:
___
<%- tables.routeParamsTable %>
###Body Parameters:
___
<%- tables.bodyParamsTable %>

`
}
