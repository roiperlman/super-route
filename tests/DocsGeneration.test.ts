import {expect} from 'chai';
import {md} from "../src/md";

describe('Documentation Generator Functions', async function () {
  describe('Markdown - generateTable()', async function () {
    it('should return an empty string when called with no table headings', async function () {
      expect(md.generateTable([
        [],
        ['aaaa','aaaa','aaaa','aaaa',],
        ['aaaa','aaaa','aaaa','aaaa',]
      ])).to.eq('')
    });
    it('should return an empty string when called with no data', async function () {
      expect(md.generateTable([])).to.eq('')
    });
  });

});
