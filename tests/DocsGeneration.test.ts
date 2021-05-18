import {expect} from 'chai';
import {md} from "../src/md";
// @ts-ignore
import {routes} from './SuperRoute.test';
import * as fs from "fs";

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
  describe('Generate md file', async function () {
    it('should generate docs md file', async function () {
      const docsArray: string[] = [];
      routes.forEach(r => {
        docsArray.push(r.toMarkdown());
        docsArray.push('\n\n___\n\n');
      });

      const docsStr = docsArray.join('\n\n');

      console.log(docsStr);

      fs.writeFileSync('test.md', docsStr);
    });
  });

});
