import {expect} from 'chai';
import {RouteError} from "../src";

describe('RouteError', async function () {
  it('should generate a route error', async function () {
    const re1 = new RouteError('Some error massage', 500);
    expect(re1.redirect).to.eq(false);
    const re2 = new RouteError('Some error massage', 401, '/login', true);
    expect(re2.redirect).to.eq('/login');
    expect(re2).to.be.instanceOf(Error);
  });
  it('should generate a route error from Error instance', async function () {
    const e = new Error('some message');
    const re = RouteError.FromError(e, 500);
    expect(re).to.be.instanceOf(Error);
    expect(re).to.haveOwnProperty('statusCode').that.eq(500);

  });
});
