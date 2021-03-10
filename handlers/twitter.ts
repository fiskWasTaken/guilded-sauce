import {Handler, HandlerResult} from "./handler";
import Twitter = require("twitter");
import {ResponseData} from "twitter";

export default class TwitterHandler extends Handler {
    id: string = "twitter";

    async handle(url: string): Promise<HandlerResult> {
        const result = url.match(/https:\/\/twitter\.com\/(.*)\/status\/([0-9]+)/i);

        if (result) {
            return this.resolve(result[1], result[2]);
        } else {
            return Promise.reject();
        }
    }

    async resolve(username: string, id: string): Promise<HandlerResult> {
        return new Promise((resolve, reject) => {
            const twitter = new Twitter(this.options as Twitter.AccessTokenOptions);

            twitter.get(`statuses/show/${id}`, {tweet_mode: 'extended'}, async function (error: any, tweet: ResponseData) {
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        media: tweet.extended_entities.media.map(m => `${m.media_url_https}:orig`) as string[],
                        description: `https://twitter.com/${tweet.user.screen_name}/status/${id}`,
                        tags: [tweet.user.screen_name],
                        title: `${tweet.user.name}: ${tweet.full_text}`,
                    });
                }
            })
        });
    }
}