import {Handler, HandlerResult} from "./handler";
const fetch = require('node-fetch');

export default class E621Handler extends Handler {
    id: string = "e621";

    async handle(url: string): Promise<HandlerResult> {
        // should handle most mastodon format uris
        const result = url.match(/^https:\/\/e621.net\/posts\/(\d*)/i);

        if (result) {
            return this.doHandle(result[1]);
        } else {
            return Promise.reject("not e621 url");
        }
    }

    async doHandle(id: string): Promise<HandlerResult> {
        // e621 hates non-browser UAs and blocks them all
        const result = await fetch(`https://e621.net/posts/${id}.json`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36"
            }
        });
        const json = await result.json();
        const post = json.post;

        return {
            tags: [].concat(post.tags.artist).concat(post.tags.character).concat(post.tags.copyright),
            description: `https://e621.net/posts/${id}`,
            media: [post.file.url],
            title: post.tags.artist[0] || "unknown artist"
        }
    }
}