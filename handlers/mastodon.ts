import {Handler, HandlerResult} from "./handler";

const fetch = require('node-fetch');

export default class MastodonHandler extends Handler {
    id: string = "mastodon";

    async handle(url: string): Promise<HandlerResult> {
        // should handle most mastodon format uris
        const result = url.match(/^(https?:\/\/.*\..*)\/@(.*)\/([0-9]+)/i);

        if (result) {
            return this.doHandle(result[1], result[2], result[3]);
        } else {
            return Promise.reject("doesn't look like a mastodon instance url");
        }
    }

    async doHandle(host: string, username: string, id: string): Promise<HandlerResult> {
        const result = await fetch(`${host}/api/v1/statuses/${id}`);
        const json = await result.json();

        return {
            tags: [json.account.acct],
            description: json.url,
            media: json.media_attachments.filter(attachment => attachment.type == "image").map(attachment => attachment.url),
            title: json.account.username
        }
    }
}