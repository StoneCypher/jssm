const { execSync } = require('child_process');
const fs = require('fs');

function fetchLabels(repoName) {
  let hasNextPage = true;
  let cursor = null;
  let labels = [];

  while (hasNextPage) {
    const after = cursor ? `, after: "${cursor}"` : '';
    const query = `query { repository(owner: "StoneCypher", name: "${repoName}") { labels(first: 100${after}) { pageInfo { hasNextPage endCursor } nodes { name issues(states: OPEN) { totalCount } } } } }`;
    
    fs.writeFileSync(`temp_query_${repoName}.gql`, query);
    const result = execSync(`gh api graphql -F query=@temp_query_${repoName}.gql`).toString();
    const data = JSON.parse(result).data.repository.labels;
    
    labels = labels.concat(data.nodes);
    hasNextPage = data.pageInfo.hasNextPage;
    cursor = data.pageInfo.endCursor;
  }
  
  fs.unlinkSync(`temp_query_${repoName}.gql`);
  return labels;
}

const jssmLabels = fetchLabels('jssm');
const fslLabels = fetchLabels('fsl');

const merged = {};

function addLabels(labelsArr) {
  for (const l of labelsArr) {
    if (!merged[l.name]) {
      merged[l.name] = { name: l.name, count: 0 };
    }
    merged[l.name].count += l.issues.totalCount;
  }
}

addLabels(jssmLabels);
addLabels(fslLabels);

const sorted = Object.values(merged).sort((a, b) => b.count - a.count);
fs.writeFileSync('labels.json', JSON.stringify(sorted, null, 2));
console.log('Successfully wrote combined labels to labels.json');
