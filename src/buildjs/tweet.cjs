
const { spawnSync }    = require('child_process'),
      { readFileSync } = require('fs');

const chalk             = require('chalk'),
      { TwitterClient } = require('twitter-api-client');

const blue = chalk.blueBright,
      cyan = chalk.cyanBright;

const pkg  = JSON.parse( readFileSync('./package.json') );

const tag            = pkg.version, // spawnSync(`awk -F'"' '/"version": ".+"/{ print $4; exit; }' package.json`),
      commit_message = handle_cmsg(process.env['TW_COMMIT_MESSAGE']);

console.log('found:');
console.log(tag);
console.log(commit_message);





// comes in as
//   1: "Merge pull request #foo from\n\nActual text we want"
//   2: "Merge pull request #foo from\n\nActual text we want\n\nMore stuff to ignore"

function handle_cmsg(cmsg) {

  const parsable = cmsg
                     .replace('\r', '\n')
                     .split('\n')
                     .filter(s => s !== '');

  // we almost certainly want 1, but if missing, fall back to merge notice in 0
  return parsable[1] ?? (parsable[0] ?? '');

}





const tweet = async (status) => {

  const twitterClient = new TwitterClient({
    apiKey            : process.env.JSSM_TWITTER_API_KEY,
    apiSecret         : process.env.JSSM_TWITTER_API_SECRET,
    accessToken       : process.env.JSSM_TWITTER_API_ACCESS_TOKEN,
    accessTokenSecret : process.env.JSSM_TWITTER_ACCESS_TOKEN_SECRET,
  });

  await twitterClient.tweets.statusesUpdate({status});

};





(async () => {


  const makeTweet = fromText => {

    const cap      = 280,
          addendum = ' #fsl #fsm #jssm #state #statemachine 🤖',
          alen     = addendum.length,
          mlen     = cap - alen,
          pref     = fromText.length > mlen? (fromText.substring(0, mlen-1) + '…') : fromText;

    return pref + addendum;

  };



  const the_tweet = makeTweet(`Released ${tag} - ${commit_message}`);

  try {

    console.log(`${blue('Tweeting ')}${cyan(process.argv[2])}`);
    await tweet(the_tweet);

  } catch (err) {

    console.error(err);

  }


})();
