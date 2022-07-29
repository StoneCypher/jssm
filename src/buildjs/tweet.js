
const { spawnSync } = require('child_process');

const chalk             = require('chalk'),
      { TwitterClient } = require('twitter-api-client');

const blue = chalk.blueBright,
      cyan = chalk.cyanBright;

const tag            = spawnSync(`awk -F'"' '/"version": ".+"/{ print $4; exit; }' package.json`),
      commit_message = spawnSync('git log -1 --pretty=format:%B');

console.log(tag);
console.log(commit_message);





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
          addendum = ' #fsl #fsm #jssm #state 🤖',
          alen     = addendum.length,
          mlen     = cap - alen,
          pref     = fromText.length > mlen? (fromText.substring(0, mlen-1) + '…') : fromText;

    return pref + addendum;

  };

  const the_tweet = makeTweet(process.argv[2]);

  try {
    console.log(`${blue('Tweeting ')}${cyan(process.argv[2])}`);
    await tweet(the_tweet);
  } catch (err) {
    console.error(err);
  }

})();
