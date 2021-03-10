import {Handler, HandlerResult} from "./handler";

const fetch = require('node-fetch');

export default class MastodonHandler extends Handler {
    id: string = "mastodon";

    async handle(url: string): Promise<HandlerResult> {
        // should handle most mastodon format uris
        const result = url.match(/^(https?:\/\/.*\..*)\/@(.*)\/([0-9]+)/i);

        if (result) {
            return this.resolve(result[1], result[2], result[3]);
        } else {
            return Promise.reject();
        }
    }

    async resolve(host: string, username: string, id: string): Promise<HandlerResult> {
        const json = (await fetch(`${host}/api/v1/statuses/${id}`)).json();

        return {
            tags: [json.account.acct],
            description: json.url,
            media: json.media_attachments.filter(attachment => attachment.type == "image").map(attachment => attachment.url),
            title: json.account.username
        }
    }
}