import Express, {ErrorRequestHandler, NextFunction, Request, RequestHandler, Response} from 'express';
import http from 'http';
import * as bodyParser from "body-parser";
import morgan from "morgan";
import * as path from "path";
import {Router} from 'express'
import {SuperRoute} from "../src";
import {VersionedRoute, VersionRouter} from "version-router-express";
export const router = Router();
export const server = Express();


export function configServer(routes: Array<SuperRoute>, middleware?: Array<RequestHandler|ErrorRequestHandler>) {
  // server.use(morgan('dev'));                                         // log every request to the console
  server.use(bodyParser.urlencoded({'extended':true}));            // parse application/x-www-form-urlencoded
  server.use(bodyParser.json({limit : '20mb'}));                                     // parse application/json
  server.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
  server.use(function(req: Request, res: Response, next: NextFunction) {
    if (req.header('User')) {
      // @ts-ignore
      req.user = JSON.parse(req.header('User') as string);
      return next()
    } else {
      next()
    }
  });
  server.use(VersionRouter.ExtractVersionFromHeader('Accept-version')); // parse application/vnd.api+json as json
  routes.forEach(route => {
    console.log('mounting route', route.name)
    route.mount(router)
  });
  server.use('/', router);
  if (middleware) {
    middleware.forEach(m => {
      server.use(m);
    })
  }

}
export function listen(port: number): Promise<http.Server> {
  return new Promise<http.Server>(async (resolve, reject) => {
    let s;
    try {
      s = server.listen(port);
    } catch (err) {
      return reject(err);
    }
    resolve(s)
  });
}
