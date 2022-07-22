
const chalk             = require('chalk'),
      { TwitterClient } = require('twitter-api-client');

const blue = chalk.blueBright,
      cyan = chalk.cyanBright;





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

  try {
    console.log(`${blue('Tweeting ')}${cyan(process.argv[2])}`);
    await tweet(process.argv[2]);
  } catch (err) {
    console.error(err);
  }

})();
