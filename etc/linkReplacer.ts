import * as fs from "fs";

let file = fs.readFileSync('./README.md').toString();

let cont = true;
let index = 0;
while (cont) {
  const mid = file.indexOf('](#', index);
  // console.log(mid)
  if (mid == -1) {
    cont = false;
    continue;
  }
  const start = file.indexOf('[', mid - 20);
  const end = file.indexOf(')', mid) + 1;
  const slice = file.slice(start, end);

  console.log(slice);
  const text = slice.substr(1, slice.indexOf(']')-1)
  console.log('text:', text);
  const sliceMid = mid - start + 2;
  const link = slice.substr(sliceMid, slice.length - sliceMid - 1);
  console.log('link:', link)

  const newLink = `<a href="${link}">${text}</a>`
  console.log(newLink)
  file = file.replace(slice, newLink)

  index = end;
}

fs.writeFileSync('new_readme.md', file);
