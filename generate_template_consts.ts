import fs from 'fs';
import path from 'path';
const files = [
  'src/templates/route_info_template.ts',
]

function generate() {
  const dir = 'src/templates';
  const fileNames = fs.readdirSync('src/templates');
  fileNames
    .filter(name => name.endsWith('.ejs'))
    .forEach(name => {
      console.log('reading file:', name);
      const filePath = path.join(dir, name);
      const buff = fs.readFileSync(filePath);
      console.log('writing file', `${filePath}.ts`);
      try {
        fs.writeFileSync(`${filePath}.ts`,
          `export function ${name.slice(0, name.length - 4)}() {
          return \`${buff.toString('utf8')}\`
          }
        `);
      } catch (e) {
        console.log(e)
      }
    })
}

generate();
