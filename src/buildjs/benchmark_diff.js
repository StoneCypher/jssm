
const fs = require('fs');

const fileA = JSON.parse(fs.readFileSync(process.argv[2]).toString()),
      fileB = JSON.parse(fs.readFileSync(process.argv[3]).toString());





const diffs = fileB.results.map( (resultB) => {

  const oldResult = fileA.results.find(
    (resultA) => resultA.name === resultB.name,
  );

  if (!oldResult) {
    return { name: resultB.name, diff: null };
  }

  const diff = ((resultB.ops - oldResult.ops) / oldResult.ops) * 100;

  return {
    name: resultB.name,
    diff,
  };

});



console.log(

  diffs
    .map(
      ({ name, diff }) =>
        `${name}: ${diff.toFixed(2)}% ${
          diff > 0
            ? 'faster'
            : diff < 0
                ? 'slower'
                : 'same'
        }`,
    )
    .join('\n')

);



const changed = diffs.filter((item) => item.diff !== null),
      average = changed.reduce((a, b) => a + b.diff, 0) / changed.length;



console.log(
  `Average: ${average.toFixed(2)}% ${
    average > 0 ? 'faster' : average < 0 ? 'slower' : 'same'
  }`,
)