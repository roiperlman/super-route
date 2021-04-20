export namespace md {
  export function generateTable(data: string[][]) {
    if (data.length === 0) {
      return '';
    }
    if (data[0].length === 0) {
      return '';
    }
    const resultArray = [];
    // push heading row
    resultArray.push(`|  ${data[0].join(' | ')}  |`);
    resultArray.push(`|  ${data[0].map(item => '---').join(' | ')}  |`);
    data.shift();
    data.forEach(row => {
      resultArray.push(`| ${row.join('  |  ')} |`)
    });
    return resultArray.join('\n');
  }

  export function generateList(data: string[]) {
    return data
      .map(item => `\<li\> ${item}`)
      .join('\<br\>');
  }
}
