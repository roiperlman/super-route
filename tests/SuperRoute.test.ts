import mocha from 'mocha';
import {expect} from 'chai';
import SuperRoute, {
  AccessControlFunction,
  RoutePermissions
} from "../src/SuperRoute";
// express
import Express, {ErrorRequestHandler, NextFunction, Request, RequestHandler, Response, Router} from 'express';

// @ts-ignore
import {configServer, listen, router, server} from "./testServer.test";
import * as http from 'http';
import {RouteError} from "../src";
import {BodyParameter, ParameterType, RouteParameter} from "../src";
import {md} from "../src/md";
import {Templates} from "../src/templates/route_info_template.ejs";
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
      'admin'
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
    if (!authenticated) {
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
        auth = await verifyUserPermissions(req.user.permissions, permissions)
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

export const routes: Array<TestRoute> = [
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
          TestRoute.HandleError(this)(req, res, next, 'throwError was true', 500, true)
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

  it('make a get request to a superroute instance mounted on a router', async function () {
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
  describe('Body Parameters Validation', async function() {
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
    });
  });
  describe('Route Parameters Validation', function () {
    it('should make a request with route params and error when they dont meet spec', async function () {
      userAuthState = true;
      await request(server)
        .post('/users/getSome/admin/12')
        .expect(200);
      const res = await request(server)
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
    });
  });
  describe('Middleware Functions', function () {
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
            userPermissions: ['editor'],
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
    it('should return false when parameter has the wrong type, true when correct type or when type is any', async function () {
      for (let i = 0; i < types.length - 2; i++) {
        expect(SuperRoute.matchesType(values[i], types[i])).to.eq(true);
        expect(SuperRoute.matchesType(values[i], types[i+1])).to.eq(false);
      }
      values.forEach(value => {
        expect(SuperRoute.matchesType(value, 'any')).to.eq(true);
      })
    });
  });
  describe('Route Help', function () {
    it('should return generate a markdown table from array', async function () {
      const str = md.generateTable(
        [
          ['Equal or Greater than', 'Specific permissions', 'Merge rule'],
          [ 'aaa', 'bbb', 'ccc' ],
          [ '😡😡😡', '🥨🥨🥨', '🚙🚙🚙']
        ]
      )
      console.log(str);
    });
    it('should return markdown info of route', async function () {
      // routes.forEach(route => console.log(route.toMarkdown()));

      console.log(routes[2].toMarkdown());
    });
    it('should return a markdown output of route socumentation', async function () {
      let response = await request(server)
        .options('/users/new ')
        .expect(200)

      console.log(response.error);
      console.log(response.body);
    });
  });
});
