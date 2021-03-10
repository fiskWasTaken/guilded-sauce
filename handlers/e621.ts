import {Handler, HandlerResult} from "./handler";
const fetch = require('node-fetch');

export default class E621Handler extends Handler {
    id: string = "e621";

    async handle(url: string): Promise<HandlerResult> {
        // e621 and sister SFW site e926
        const result = url.match(/^https:\/\/(e621\.net|e926\.net)\/posts\/(\d*)/i);

        if (result) {
            return this.resolve(result[1], result[2]);
        } else {
            return Promise.reject();
        }
    }

    async resolve(host: string, id: string): Promise<HandlerResult> {
        // e621 hates non-browser UAs and blocks them all
        const result = await fetch(`https://e621.net/posts/${id}.json`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36"
            }
        });

        const post = await result.json().post;

        if (!post) {
            throw new Error("This post does not exist.");
        }

        return {
            tags: [].concat(post.tags.artist).concat(post.tags.character).concat(post.tags.copyright),
            description: `https://${host}/posts/${id}`,
            media: [post.file.url],
            title: post.tags.artist[0] || "unknown artist"
        }
    }
}