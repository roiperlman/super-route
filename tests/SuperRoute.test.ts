// import mocha from 'mocha';
import {expect} from 'chai';
import {
  SuperRoute,
  AccessControlFunction,
  RoutePermissions
} from "../src";
// express
import Express, {ErrorRequestHandler, NextFunction, Request, RequestHandler, Response, Router} from 'express';

// @ts-ignore
import {configServer, listen, router, server} from "./testServer.test";
import * as http from 'http';
import {RouteError} from "../src";
import {BodyParameter, ParameterType, RouteParameter} from "../src";
import {md} from "../src/md";
const request = require('supertest');

const port = 8082;
// this is a dummy authentication function, the authentication state of the user is set from
// the test function by changing the value of userAuthState
let userAuthState: boolean = false;
function authFunction(req: Request, res: Response, next: NextFunction): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    // console.log(`authenticating request from ip: `, req.ip);
    resolve(userAuthState);
  });
}
function verifyUserPermissions(req: Request, permissions: RoutePermissions): Promise<boolean> {
  return new Promise<boolean>(async (resolve, reject) => {
    const hierarchy: Array<string> = [
      'normal',
      'editor',
      'admin',
      'super'
    ];
    let authStatus: boolean|undefined;
    try {
      // @ts-ignore
      authStatus = TestRoute.checkPermissions(req['user']['permissions'], permissions, hierarchy);
    } catch (err) {
      reject(err);
    }

    resolve(authStatus === true)
  });
}

/**
 * test class that extends super route
 */
export class TestRoute extends SuperRoute {
  $$authenticationFunction = async (req: Request, res: Response, next: NextFunction) => {
    let authenticated;
    try {
      authenticated = await authFunction(req, res, next);
    } catch (err) {
      next(err)
    }
    if (!authenticated && !req.hasOwnProperty('user')) {
      // return next(this.Error('user not authenticated', 403))
      this.handleError(req, res, next, `user not authenticated on route ${req.path}`, 403)
    } else {
      next();
    }
  };

  $$accessControlFunction: AccessControlFunction = (permissions: RoutePermissions) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      let auth;
      try {
        // @ts-ignore
        auth = await verifyUserPermissions(req, permissions)
      } catch (err) {
        return next(err);
      }
      if (!auth) {
        this.handleError(req, res, next, `user does not have sufficient permissions to access ${this.path}`, 403)
      } else {
        return next();
      }
    }
  }
}

export class TestRouteSpecialHandler extends SuperRoute {
  $$errorHandler =
    (error: RouteError,
     req: Request,
     res: Response,
     next: NextFunction,
     options: { [key: string]: any }) => {

        res.status(501).send('specific')
  }
}

// @ts-ignore
export const routes: Array<TestRoute|TestRouteSpecialHandler> = [
  new TestRoute({
    path: 'test',
    verb: 'get',
    name: 'test route',
    authenticate: false,
    middleware: [
      (req: Request, res: Response, next: NextFunction) => {
        res.status(200).send({response: 'Ok'})
      }
    ]
  }),
  new TestRoute({
    path: 'required/:route/*',
    verb: 'get',
    name: 'required route param',
    authenticate: false,
    routeParams: [
      new RouteParameter(
        'route',
        '---',
        true,
        [
          {
            test: (value: string) => {
              return ['admin', 'super'].includes(value)
            },
            description: 'user role is admin or super'
          }
        ]
      ),
      new RouteParameter(
        'param',
        '---',
        true,
        [
          {
            test: value => value > 10,
            description: 'checks if age is above 10'
          }
        ]
      )
    ],
    middleware: [
      (req: Request, res: Response, next: NextFunction) => {
        res.status(200).send({response: 'Ok'})
      }
    ]
  }),
  new TestRoute({
    path: 'limited',
    verb: 'get',
    name: 'authenticated route',
    authenticate: true,
    middleware: [
      (req: Request, res: Response, next: NextFunction) => {
        res.status(200).send({response: 'Ok'})
      }
    ]
  }),
  new TestRoute({
    path: 'users/new',
    verb: 'post',
    name: 'new user',
    description: 'creates a new user',
    authenticate: true,
    showHelp: true,
    bodyParams: [
      new BodyParameter('firstName', 'string', 'user first name', true),
      new BodyParameter('lastName', 'string', 'user last name', true),
      new BodyParameter('isAdmin', 'boolean', 'is the user an admin', true),
      new BodyParameter('mobilePhone',
        'string',
        'user mobile phone',
        true,
        [
          {
            test: (value: string) => {
              return value.length === 10
            },
            description: 'checks if mobile phone has 10 digits'
          }
        ]
      ),
      new BodyParameter(
        'age',
        'number',
        'user age',
        false,
        [
          {
            test: (value: number) => {
              return value >= 18
            },
            description: 'checks if age is above 18'
          },
          {
            test: (value: number) => {
              return value <= 25
            },
            description: 'checks if age is below 25'
          }
        ]
      ),
    ],
    middleware: [
      (req: Request, res: Response, next: NextFunction) => {
        res.status(200).send(req.body)
      }
    ]
  }),
  new TestRoute({
    path: 'users/getSome/:role/:age?',
    verb: 'post',
    name: 'get some',
    description: 'get some users',
    authenticate: true,
    routeParams: [
      new RouteParameter(
        'role',
        'user role',
        true,
        [
          {
            test: (value: string) => {
              return ['admin', 'super'].includes(value)
            },
            description: 'user role is admin or super'
          }
        ]
      ),
      new RouteParameter(
        'age',
        'user age',
        false,
        [
          {
            test: value => value > 10,
            description: 'checks if age is above 10'
          }
        ]
      )
    ],
    middleware: [
      (req: Request, res: Response, next: NextFunction) => {
        res.status(200).send({user: 'Ok'})
      }
    ]
  }),
  new TestRoute({
    path: 'users/getSome2/:role/:age?',
    verb: 'post',
    name: 'get some 2',
    description: 'get some users',
    authenticate: true,
    routeParams: [
      new RouteParameter(
        'role',
        'user role',
        true,
        [
          //@ts-ignore
          {
            test: (value: string) => {
              return ['admin', 'super'].includes(value)
            },
          }
        ]
      ),
      new RouteParameter(
        'age',
        'user age',
        false,
        [
          //@ts-ignore
          {
            test: value => value > 10,

          }
        ]
      )
    ],
    middleware: [
      (req: Request, res: Response, next: NextFunction) => {
        res.status(200).send({user: 'Ok'})
      }
    ]
  }),
  new TestRoute({
    path: 'users/getSome3/:miss/:age?',
    verb: 'post',
    name: 'get some 3',
    description: 'get some users',
    authenticate: true,
    routeParams: [
      new RouteParameter(
        'role',
        'user role',
        true,
        [
          //@ts-ignore
          {
            test: (value: string) => {
              return ['admin', 'super'].includes(value)
            },
          }
        ]
      ),
      new RouteParameter(
        'age',
        'user age',
        false,
        [
          //@ts-ignore
          {
            test: value => value > 10,

          }
        ]
      )
    ],
    middleware: [
      (req: Request, res: Response, next: NextFunction) => {
        res.status(200).send({user: 'Ok'})
      }
    ]
  }),
  new TestRoute({
    path: 'users/getSome4/:role/:age?',
    verb: 'post',
    name: 'get some 4',
    description: 'get some users',
    authenticate: true,
    routeParams: [
      new RouteParameter('role', 'user role', true, ),
      new RouteParameter('age', 'user age', false)
    ],
    middleware: [
      (req: Request, res: Response, next: NextFunction) => {
        res.status(200).send({user: 'Ok'})
      }
    ]
  }),
  new TestRoute({
    path: 'handleWithStatic',
    verb: 'post',
    name: 'handle with static',
    description: 'handles error with the static method',
    authenticate: true,
    bodyParams: [
      new BodyParameter('throwError', 'boolean', 'will throw error if true', true)
    ],
    middleware: [
      function (req: Request, res: Response, next: NextFunction) {
        if (req.body.throwError) {
          TestRoute.HandleError(this)(req, res, next, 'throwError was true', 500)
        } else {
          res.status(200).send({user: 'Ok'})
        }
      }
    ]
  }),
  new TestRoute({
    path: 'handleWithStaticRedirect',
    verb: 'post',
    name: 'handle with static redirect',
    description: 'handles error with the static method and redirect',
    redirectOnError: '/login',
    authenticate: true,
    bodyParams: [
      new BodyParameter('throwError', 'boolean', 'will throw error if true', true)
    ],
    middleware: [
      function (req: Request, res: Response, next: NextFunction) {
        if (req.body.throwError) {
          TestRoute.HandleError(this)(req, res, next, 'throwError was true', 500)
        } else {
          res.status(200).send({user: 'Ok'})
        }
      }
    ]
  }),
  new TestRoute({
    path: 'handleWithRouteError',
    verb: 'post',
    name: 'handle with route error',
    description: 'handles error with a route error object',
    authenticate: true,
    bodyParams: [
      new BodyParameter('throwError', 'boolean', 'will throw error if true', true)
    ],
    middleware: [
      function (req: Request, res: Response, next: NextFunction) {
        if (req.body.throwError) {
          let err = new RouteError('route error thrown', 500, null, false);
          err.handle(this, req, res, next);
        } else {
          res.status(200).send({user: 'Ok'})
        }
      }
    ]
  }),
  new TestRoute({
    path: 'handleWithThisHandle',
    verb: 'post',
    name: 'handle with this.handle',
    description: 'handles error with this.handle',
    authenticate: true,
    errorHandlerOptions: {somekey: 'some value'},
    bodyParams: [
      new BodyParameter('throwError', 'boolean', 'will throw error if true', true)
    ],
    middleware: [
      function (req: Request, res: Response, next: NextFunction) {
        if (req.body.throwError) {
          this.handle(arguments, new Error('some error'), 402, 'custom response', true, false, {somekey: 'somevalue'});
        } else {
          res.status(200).send({user: 'Ok'})
        }
      }
    ]
  }),
  new TestRoute({
    path: 'handleWithThisHandleDefault',
    verb: 'post',
    name: 'handle with this.handle default',
    description: 'handles error with this.handle',
    authenticate: true,
    errorHandlerOptions: {somekey: 'some value'},
    bodyParams: [
      new BodyParameter('throwError', 'boolean', 'will throw error if true', true)
    ],
    middleware: [
      function (req: Request, res: Response, next: NextFunction) {
        if (req.body.throwError) {
          this.handle(arguments, new Error('some error'));
        } else {
          res.status(200).send({user: 'Ok'})
        }
      }
    ]
  }),
  new TestRoute({
    path: 'versioned1',
    verb: 'post',
    name: 'versioned route 1',
    authenticate: false,
    bodyParams: [
      new BodyParameter('sum', 'number', '', true)
    ],
    versionedMiddleware: [
      {
        version: '1.0.0',
        default: false,
        middleware: [
          (req: Request, res: Response, next: NextFunction) => {
            req.body.sum += 10;
            next()
          },
          (req: Request, res: Response, next: NextFunction) => {
            req.body.sum += 10;
            res.send({sum: req.body.sum})
          },
        ]
      },
      {
        version: '>=1.2.0 <2.0.0',
        default: false,
        middleware: [
          (req: Request, res: Response, next: NextFunction) => {
            req.body.sum += 100;
            next()
          },
          (req: Request, res: Response, next: NextFunction) => {
            req.body.sum += 100;
            res.send({sum: req.body.sum})
          },
        ]
      },
      {
        version: '2.0.0',
        default: true,
        middleware: [
          (req: Request, res: Response, next: NextFunction) => {
            req.body.sum += 1000;
            next()
          },
          (req: Request, res: Response, next: NextFunction) => {
            req.body.sum += 1000;
            res.send({sum: req.body.sum})
          },
        ]
      },

    ]
  }),
  new TestRoute({
    path: 'adminOnly',
    verb: 'get',
    name: 'admin only',
    authenticate: true,
    permissions: {
      specific: ['admin']
    },
    middleware: [
      (req: Request, res: Response, next: NextFunction) => {
        res.status(200).send({response: 'Ok'})
      }
    ]
  }),
  new TestRoute({
    path: 'adminOrGt',
    verb: 'get',
    name: 'admin or gt',
    authenticate: true,
    permissions: {
      equalOrGreaterThan: 'admin'
    },
    middleware: [
      (req: Request, res: Response, next: NextFunction) => {
        res.status(200).send({response: 'Ok'})
      }
    ]
  }),
  new TestRoute({
    path: 'users/new/:upsert',
    verb: 'post',
    name: 'Create or upsert user',
    description: ' Creates or updates an existing user',
    comments: 'Creates a new user. if the user exists and upsert is set to true, will update the user. if set to false and user exists, will return an error',
    responseFormat: `{
      createdUser: User
    }
    `,
    responseContentType: 'application/json',
    permissions: {
      equalOrGreaterThan: 'admin',
      specific: ['awesomePerson'],
      merge: 'and'
    },
    authenticate: true,
    showHelp: true,
    bodyParams: [
      new BodyParameter('firstName', 'string', 'user first name', true),
      new BodyParameter('lastName', 'string', 'user last name', true),
      new BodyParameter('isAdmin', 'boolean', 'is the user an admin', true),
      new BodyParameter('mobilePhone',
        'string',
        'user mobile phone',
        true,
        [
          {
            test: (value: string) => {
              return value.length === 10
            },
            description: 'checks if mobile phone has 10 digits'
          }
        ]
      ),
      new BodyParameter(
        'age',
        'number',
        'user age',
        false,
        [
          {
            test: (value: number) => {
              return value >= 18
            },
            description: 'age must be greater or equal to 18'
          },
          {
            test: (value: number) => {
              return value <= 25
            },
            description: 'age must be smaller or equal to 25'
          }
        ]
      ),
    ],
    routeParams: [
      new RouteParameter('upsert', 'set upsert true or false to update user if it exists', true, [
        {
          test: (value) => value === 'true' || value === false,
          description: 'Value must be either "true" or "false"'
        }
      ])
    ],
    middleware: [
      (req: Request, res: Response, next: NextFunction) => {
        // TODO implement logic
        res.status(200).send(req.body)
      }
    ]
  }),
  new TestRouteSpecialHandler({
    path: 'specificErrorHandler',
    verb: 'get',
    name: 'specificErrorHandler',
    authenticate: false,
    middleware: [
      function (req: Request, res: Response, next: NextFunction) {
        this.handle(arguments, 'error to override', 400)
        // res.status(200).send({response: 'Ok'})
      }
    ]
  }),
  new TestRouteSpecialHandler({
    path: 'd_error/:status?',
    verb: 'post',
    name: 'd_error',
    authenticate: false,
    middleware: [
      function (req: Request, res: Response, next: NextFunction) {
        if (req.params.status) {
          next(new RouteError('default error handler', Number(req.params.status)));
        } else {
          next(new Error('default error handler'))
        }
      }
    ]
  }),
];

let httpServer: http.Server;

/**
 * returns a test request to the specified route name
 * @param name - route name, not path
 */
export function routeTestRequest(name: string) {
  let route;
  try {
    route = getRoute(name);
  } catch (e) {
    throw(e)
  }
  if (route) {
    return request(server)[route.verb](`/${route.path}`)
  }
}

export function getRoute(name: string) {
  const route = routes.find(route => route.name === name);
  if (!route) {
    throw new Error('route not found');
  } else {
    return routes.find(route => route.name === name);
  }
}

describe('Class SuperRoute', async function () {
  this.timeout(60000)
  before(async function () {
    return new Promise(async (resolve, reject) => {
      configServer(routes);
      server.use(TestRoute.DefaultErrorHandler);
      try {
        httpServer = await listen(port);
      } catch (e) {
        reject(e)
      }
      setTimeout(resolve, 2000)
    });
  });
  after(async function () {
    return new Promise(async (resolve, reject) => {
      httpServer.close((err) => {
        if (err) {
          console.error(err);
          reject(err)
        }
        console.log('test server closed');
        resolve()
      });
    });
  });
  this.timeout(600000);

  describe('Mounting', async function () {
    it('should fail to mount an authenticated route with no authentication function', async function () {
      class NoAuthFunction extends SuperRoute {}
      const route = new NoAuthFunction({
        path: "/some_path",
        verb: 'post',
        name: 'authenticated',
        authenticate: true,
      })
      const router = Router();
      expect(function() {
        route.mount(router)
      }).to.throw(Error, `Authentication function not defined for route /some_path`)
    });
    it('should fail to mount a route with permissions definitions with no access control function', async function () {
      class NoAccessFunction extends SuperRoute {
        $$authenticationFunction = function() {};
      }
      const route = new NoAccessFunction({
        path: "/some_path",
        verb: 'post',
        name: 'access',
        authenticate: false,
        permissions: {
          equalOrGreaterThan: 'admin'
        },
      })
      const router = Router();
      expect(function() {
        route.mount(router)
      }).to.throw(Error,`Access Control function not defined for route /some_path`)
    });
    it('should mount versioned routes', async function () {
      const router = Router();
      const route = getRoute('versioned route 1');
      if (route) {
        route.mount(router);
        expect(router.stack[0].route.stack).to.have.length(2);
      }
    });
    it('should mount route with a function as middleware argument instead of array', async function () {
      const route = new TestRoute({
        path: "/some_path",
        verb: 'post',
        name: 'authenticated',
        authenticate: true,
        middleware: (req: Request, res: Response, next: NextFunction) => {

        }
      })
      const router = Router();
      expect(function() {
        route.mount(router)
      }).to.not.throw(Error);
    });
    it('should fail to mount with wrong verb', async function () {

      const route = new TestRoute({
        path: "/some_path",
        // @ts-ignore
        verb: 'something',
        name: 'authenticated',
        middleware: (req: Request, res: Response, next: NextFunction) => {}
      })
      const router = Router();
      expect(function() {
        route.mount(router)
      }).to.throw(Error);
    });
  });
  describe('Access Control Routes', async function () {
    it('should block and allow request to a route with equalOrGreaterThan route permissions', async function () {
      await routeTestRequest('admin or gt')
        .set({User: JSON.stringify({permissions: ['editor','admin']})})
        .expect(200);
      await routeTestRequest('admin or gt')
        .set({User: JSON.stringify({permissions: ['admin']})})
        .expect(200);
      await routeTestRequest('admin or gt')
        .set({User: JSON.stringify({permissions: ['editor']})})
        .expect(403);
      await routeTestRequest('admin or gt')
        .set({User: JSON.stringify({permissions: ['super']})})
        .expect(200);
    });
    it('should block and allow request to a route with specific route permissions', async function () {
      await routeTestRequest('admin only')
        .set({User: JSON.stringify({permissions: ['editor','admin']})})
        .expect(200);
      await routeTestRequest('admin only')
        .set({User: JSON.stringify({permissions: ['admin']})})
        .expect(200);
      await routeTestRequest('admin only')
        .set({User: JSON.stringify({permissions: ['editor']})})
        .expect(403);
      await routeTestRequest('admin only')
        .set({User: JSON.stringify({permissions: ['super']})})
        .expect(403);
    });
  });
  describe('Vanilla Requests', async function () {
    it('should make a get request to a superroute instance mounted on a router', async function () {
      await routeTestRequest('test route')
        .expect(200)
    });
    it('should use an authentication function and return a result that matches the user auth state', async function () {
      userAuthState = false;
      let response = await routeTestRequest('authenticated route')
        .expect(403);
      userAuthState = true;
      response = await routeTestRequest('authenticated route')
        .expect('Content-Type', /json/)
        .expect(200)
    });
  });
  describe('Body Parameters Validation', async function() {
    it('should create a default body parameter', async function () {
      const p = new BodyParameter('name');
      expect(p.type).to.eq('any');
    });
    it('should mount a route with body parameters and make a successful request', async function () {
      userAuthState = true;
      let response = await routeTestRequest('new user')
        .send({
          firstName: 'first',
          lastName: 'last',
          isAdmin: true,
          mobilePhone: '0509999999',
          age: 20
        })
        .expect(200);
      let route = getRoute('new user');
      if (route) {
        route.bodyParams.forEach(param => {
          expect(response.body).to.haveOwnProperty(param.name);
        })
      }
    });
    it('should make a successful request when an optional body param is missing', async function () {
      userAuthState = true;
      let response = await routeTestRequest('new user')
        .send({
          firstName: 'first',
          lastName: 'last',
          isAdmin: true,
          mobilePhone: '0509999999',
        })
        .expect(200);
    });
    it('should error when a required body param is missing', async function () {
      userAuthState = true;
      let response = await routeTestRequest('new user')
        .send({
          firstName: 'first',
          lastName: 'last',
          isAdmin: true,
          age: 20
        })
        .expect(400);
    });
    it('should error when at least one of the additional body param tests fails and return a list of body param errors', async function () {
      userAuthState = true;
      let response = await routeTestRequest('new user')
        .send({
          firstName: 'first',
          lastName: 'last',
          isAdmin: true,
          mobilePhone: '0509999999',
          age: 35
        })
        .expect(400);
      expect(response.error.text.split('\n')).to.have.length(1);
      response = await routeTestRequest('new user')
        .send({
          firstName: 'first',
          lastName: 'last',
          isAdmin: true,
          mobilePhone: '050999999',
          age: 10
        })
        .expect(400);

      expect(response.error.text.split('\n')).to.have.length(2);
      response = await routeTestRequest('new user')
        .send({
          firstName: 'first',
          lastName: 'last',
          isAdmin: 'true',
          mobilePhone: '050999999',
          age: 10
        })
        .expect(400);
      expect(response.error.text.split('\n')).to.have.length(3);
      response = await routeTestRequest('new user')
        .send({
          firstName: 'first',
          lastName: 'last',
          isAdmin: 'true',
          mobilePhone: true,
          age: 10
        })
        .expect(400);
      expect(response.error.text.split('\n')).to.have.length(4);
    });
  });
  describe('Route Parameters Validation', function () {
    it('should create a default route parameter', async function () {
      const p = new RouteParameter('name');
      expect(p.required).to.eq(true);
    });
    it('should make a request with route params and error when they dont meet spec', async function () {
      userAuthState = true;
      console.log(await request(server)
        .post('/users/getSome/admin/12')
        .expect(200));
      // await request(server)
      //   .post('/required/route/')
      //   .expect(400);
      await request(server)
        .post('/users/getSome/admin')
        .expect(200)
      await request(server)
        .post('/users/getSome/admin/5')
        .expect(400);
      await request(server)
        .post('/users/getSome/something/12')
        .expect(400);
      await request(server)
        .post('/users/getSome/something/5')
        .expect(400);
      await request(server)
        .post('/users/getSome/super/5')
        .expect(400);
      // no description in route overridden by ts-ignore should default to test number.
      await request(server)
        .post('/users/getSome2/admin/12')
        .expect(200);
      await request(server)
        .post('/users/getSome2/admin')
        .expect(200)
      await request(server)
        .post('/users/getSome2/admin/5')
        .expect(400);
      await request(server)
        .post('/users/getSome2/something/12')
        .expect(400);
      await request(server)
        .post('/users/getSome2/something/5')
        .expect(400);
      await request(server)
        .post('/users/getSome2/super/5')
        .expect(400);
      // miss-configured route params
      await request(server)
        .post('/users/getSome3/admin/5')
        .expect(400);
      await request(server)
        .post('/users/getSome3/something/12')
        .expect(400);
      await request(server)
        .post('/users/getSome3/something/5')
        .expect(400);
      await request(server)
        .post('/users/getSome3/super/5')
        .expect(400);
      // no additional tests
      await request(server)
        .post('/users/getSome4/admin/5')
        .expect(200);
      await request(server)
        .post('/users/getSome4/something/12')
        .expect(200);

    });
  });
  describe('Error Handling', function () {
    it('should mount a middleware function that summons the error handler using the static method', async function () {
      let response = await routeTestRequest('handle with static')
        .send({throwError: false})
        .expect(200);
      response = await routeTestRequest('handle with static')
        .send({throwError: true})
        .expect(500);
      expect(response.error.text).to.eq('throwError was true');
    });
    it('should mount a middleware function that uses the RouteError class from error handling', async function () {
      let response = await routeTestRequest('handle with route error')
        .send({throwError: false})
        .expect(200);
      response = await routeTestRequest('handle with route error')
        .send({throwError: true})
        .expect(500);
      expect(response.error.text).to.eq('route error thrown');
    });
    it('should handle error with this.handle', async function () {
      let response = await routeTestRequest('handle with this.handle')
        .send({throwError: true})
        .expect(402);
      expect(response.error.text).to.eq('custom response');
    });
    it('should handle error with this.handle', async function () {
      let response = await routeTestRequest('handle with this.handle default')
        .send({throwError: true})
        .expect(500);
      expect(response.error.text).to.eq('some error');
    });
    it('should redirect to defined path on error', async function () {
      let response = await routeTestRequest('handle with static redirect')
        .send({throwError: true})
        .expect(302);
    });
    it('should handle error with route specific error handler ', async function () {
      let res = await routeTestRequest('specificErrorHandler')
        .expect(501);
      expect(res.error.text).to.eq('specific')
      //specificErrorHandler
    });
    it('should use the default error handler ', async function () {
      let res = await request(server)
        .post('/d_error')
        .expect(500);
      expect(res.error.text).to.eq('default error handler')
      res = await request(server)
        .post('/d_error/501')
        .expect(501);
      expect(res.error.text).to.eq('default error handler')
      res = await request(server)
        .post('/d_error/502')
        .expect(502);
      expect(res.error.text).to.eq('default error handler')
      //specificErrorHandler
    });
  });
  describe('Versioned Routes', async function () {
    it('should make request to versioned route and get result matching the version', async function () {
      let response
      response = await routeTestRequest('versioned route 1')
        .set({'Accept-version': '1.0.0'})
        .send({sum: 0})
        .expect(200);
      expect(response.body).to.haveOwnProperty('sum').that.eq(20);
     response = await routeTestRequest('versioned route 1')
        .set({'Accept-version': '1.2.0'})
        .send({sum: 0})
        .expect(200);
      expect(response.body).to.haveOwnProperty('sum').that.eq(200);
      response = await routeTestRequest('versioned route 1')
        .set({'Accept-version': '1.3.0'})
        .send({sum: 0})
        .expect(200);
      expect(response.body).to.haveOwnProperty('sum').that.eq(200);
      response = await routeTestRequest('versioned route 1')
        .set({'Accept-version': '2.0.0'})
        .send({sum: 0})
        .expect(200);
      expect(response.body).to.haveOwnProperty('sum').that.eq(2000);
      response = await routeTestRequest('versioned route 1')
        .set({'Accept-version': '1.1.0'})
        .send({sum: 0})
        .expect(200);
      expect(response.body).to.haveOwnProperty('sum').that.eq(2000);
      response = await routeTestRequest('versioned route 1')
        .send({sum: 0})
        .expect(200);
      expect(response.body).to.haveOwnProperty('sum').that.eq(2000);
    });
  });
  describe('Static class methods', async function() {
    const hierarchy: Array<string> = [
      'normal',
      'editor',
      'admin',
      'super'
    ];
    const types: Array<ParameterType> = [
      'string',
      'number',
      'boolean',
      'object',
      'array',
      'parsableDateString',
      'null',
      'string',
      'any'
    ];
    const values: Array<any> = [
      'abc',
      123,
      false,
      {a: 1, b: 2},
      [1,2,3],
      '2019-10-01',
      null,
    ];
    it('should return true when users permissions match the provided spec', async function () {

      const permissionOptions: {[key: string]: Array<{
          routePermission: RoutePermissions,
          userPermissions: Array<string>,
          expected: boolean
        }>} = {
        onlyHierarchy: [
            {
              routePermission: {
                equalOrGreaterThan: 'editor',
              },
              userPermissions: ['normal'],
              expected: false
            },
            {
              routePermission: {
                equalOrGreaterThan: 'editor',
              },
              userPermissions: ['editor'],
              expected: true
            },
            {
              routePermission: {
                equalOrGreaterThan: 'editor',
              },
              userPermissions: ['super'],
              expected: true
            },
            {
              routePermission: {
                equalOrGreaterThan: 'super',
              },
              userPermissions: ['super'],
              expected: true
            },
            {
              routePermission: {
                equalOrGreaterThan: 'super',
              },
              userPermissions: ['editor'],
              expected: false
            }
            ],
        onlySpecific: [
          {
            routePermission: {
              specific: ['editor'],
              merge: 'and'
            },
            userPermissions: ['normal'],
            expected: false
          },
          {
            routePermission: {
              specific: ['editor'],
              merge: 'and'
            },
            userPermissions: ['editor'],
            expected: true
          },
          {
            routePermission: {
              specific: ['editor'],
              merge: 'and'
            },
            userPermissions: ['super'],
            expected: false
          },
          {
            routePermission: {
              specific: ['editor','admin'],
              merge: 'and'
            },
            userPermissions: ['editor'],
            expected: false
          },
          {
            routePermission: {
              specific: ['editor','admin'],
              merge: 'and'
            },
            userPermissions: ['editor','admin'],
            expected: true
          },
          {
            routePermission: {
              specific: ['editor','admin'],
              merge: 'and'
            },
            userPermissions: ['editor','admin','super'],
            expected: true
          },
          {
            routePermission: {
              specific: ['editor','admin'],
              merge: 'or'
            },
            userPermissions: ['editor'],
            expected: true
          },
          {
            routePermission: {
              specific: ['editor','admin'],
              merge: 'or'
            },
            userPermissions: ['normal','super'],
            expected: false
          },
        ],
        bothOr: [
          {
            routePermission: {
              equalOrGreaterThan: 'admin',
              specific: ['editor'],
              merge: 'or'
            },
            userPermissions: ['editor','normal'],
            expected: true
          },
          {
            routePermission: {
              equalOrGreaterThan: 'super',
              specific: ['editor', 'normal'],
              merge: 'or'
            },
            userPermissions: ['normal'],
            expected: true
          },
          {
            routePermission: {
              equalOrGreaterThan: 'super',
              specific: ['editor', 'normal'],
              merge: 'or'
            },
            userPermissions: ['admin'],
            expected: false
          },
        ],
        bothAnd: [
          {
            routePermission: {
              equalOrGreaterThan: 'super',
              specific: ['editor'],
              merge: 'and'
            },
            userPermissions: ['normal'],
            expected: false
          },
          {
            routePermission: {
              equalOrGreaterThan: 'super',
              specific: ['editor'],
              merge: 'and'
            },
            userPermissions: ['super'],
            expected: false
          },
          {
            routePermission: {
              equalOrGreaterThan: 'super',
              specific: ['editor'],
              merge: 'and'
            },
            // @ts-ignore
            userPermissions: 'editor',
            expected: false
          },
          {
            routePermission: {
              equalOrGreaterThan: 'super',
              specific: ['editor'],
              merge: 'and'
            },
            userPermissions: ['editor', 'super'],
            expected: true
          },
          {
            routePermission: {
              equalOrGreaterThan: 'super',
              specific: ['editor','normal'],
              merge: 'and'
            },
            userPermissions: ['normal','editor'],
            expected: false
          },
          {
            routePermission: {
              equalOrGreaterThan: 'super',
              specific: ['editor','normal'],
              merge: 'and'
            },
            userPermissions: ['normal','editor','super'],
            expected: true
          },
        ]
        };
      for (let key in permissionOptions) {
        permissionOptions[key].forEach((option: {
          routePermission: RoutePermissions,
          userPermissions: Array<string>,
          expected: boolean
        }) => {
          expect(TestRoute.checkPermissions(option.userPermissions, option.routePermission, hierarchy))
            .to.eq(option.expected)
        })
      }
    });
    it('static permissions check method should return error when permissions configuration is missing properties ', async function () {
      expect(function() {
        // @ts-ignore
        SuperRoute.checkPermissions(['admin'], {
          merge: 'and'
        })
      }).to.throw('Missing configuration in permissions object. should contain a least one rule')
    });
    it('should return false when parameter has the wrong type, true when correct type or when type is any', async function () {
      for (let i = 0; i < types.length - 2; i++) {
        expect(SuperRoute.matchesType(values[i], types[i])).to.eq(true);
        expect(SuperRoute.matchesType(values[i], types[i+1])).to.eq(false);
      }
      values.forEach(value => {
        expect(SuperRoute.matchesType(value, 'any')).to.eq(true);
      })
      // @ts-ignore
      expect(SuperRoute.matchesType(123, 'something')).to.eq(false);
    });
  });
  describe('Route Help', function () {
    it('should generate a markdown table from array', async function () {
      const str = md.generateTable(
        [
          ['Equal or Greater than', 'Specific permissions', 'Merge rule'],
          [ 'aaa', 'bbb', 'ccc' ],
          [ '😡😡😡', '🥨🥨🥨', '🚙🚙🚙']
        ]
      );
      expect(str).to.be.a('string');
    });
    it('should return markdown info of route', async function () {
      expect(function() {
        // @ts-ignore
        getRoute('Create or upsert user').toMarkdown()
      }).to.not.throw();
      routes.forEach(route => {
        expect(function() {
          // @ts-ignore
          route.toMarkdown()
          console.log(route.toMarkdown());
        }).to.not.throw();
      });
    });
    it('should return a markdown output of route documentation', async function () {
      let response = await request(server)
        .options('/users/new ')
        .expect(200)
    });
  });
});
