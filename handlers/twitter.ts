import {Handler, HandlerResult} from "./handler";
import Twitter = require("twitter");
import {ResponseData} from "twitter";

export default class TwitterHandler extends Handler {
    id: string = "twitter";

    constructor(private twitter: Twitter) {
        super();
    }

    async handle(url: string): Promise<HandlerResult> {
        const result = url.match(/https:\/\/twitter.com\/(.*)\/status\/([0-9]+)/i);

        if (result) {
            return this.doHandle(result[1], result[2]);
        } else {
            return Promise.reject("not a tweet");
        }
    }

    async doHandle(username: string, id: string): Promise<HandlerResult> {
        return new Promise((resolve, reject) => {
            this.twitter.get(`statuses/show/${id}`, {tweet_mode: 'extended'}, async function (error: any, tweet: ResponseData, response: any) {
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        media: tweet.extended_entities.media.map(m => `${m.media_url_https}:orig`) as string[],
                        description: `https://twitter.com/${tweet.user.screen_name}/status/${id} ${tweet.created_at}`,
                        tags: [tweet.user.screen_name],
                        title: `${tweet.user.name}: ${tweet.full_text}`.substr(0, 80),
                    });
                }
            })
        });
    }
}