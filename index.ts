import {Client} from "@guildedjs/guilded.js"
import Message from "@guildedjs/guilded.js/types/structures/Message";
import DMChannel from "@guildedjs/guilded.js/types/structures/channels/DMChannel";
import TextChannel from "@guildedjs/guilded.js/types/structures/channels/TextChannel";
import PartialChannel from "@guildedjs/guilded.js/types/structures/channels/PartialChannel";
import {HandlerResult} from "./handlers/handler";

interface UploadResponse {
    url: string;
}

interface Media {
    id?: number; // returned on created media object
    channelId?: string; // returned on created object
    additionalInfo: object; // ?
    description: string; // description
    src: string; // uploaded file url
    tags: string[]; // idk yet
    teamId?: string; // not needed when posting
    title: string; // title
    type: string; // "image"
}

interface MediaReply {
    teamId?: string;
    message: object; // message blob
    contentId: number; // the media ID
    id: number; // random?
    postId: number; // also the media ID?
}

const options = require('./config.json');
const guilded = new Client();

const handlers = options.handlers.map(handler => {
    const exp = require(`./handlers/${handler}`);
    const h = new exp.default(options[handler] || {});
    console.log(`Loaded handler '${h.id}'`);
    return h;
});

guilded.on('ready', () => console.log(`Bot is successfully logged in`));

guilded.on("messageCreate", async message => {
    const targetChannel = parseChannels(message)[0];

    if (!targetChannel) {
        // no channel target, nothing to do
        return;
    }

    try {
        await postMediaThread(targetChannel, await resolveHandler(message));
    } catch (e) {
        console.log(e);
    }
})

async function postMediaThread(channel: string, result: HandlerResult) {
    const attachments: UploadResponse[] = [];
    const errors = [];

    for (const url of result.media) {
        try {
            attachments.push(await uploadFromUrl(url));
        } catch (e) {
            errors.push(e);
        }
    }

    if (errors.length > 0) {
        console.log(`${errors.length} errors encountered`)
        errors.forEach(e => console.log(e));
    }

    if (attachments.length == 0) {
        console.log("no media to upload, stop");
        return;
    }

    try {
        const resp = await media(channel, {
            additionalInfo: {},
            description: result.description,
            src: attachments[0].url,
            tags: result.tags,
            title: result.title.substr(0, 80),
            type: "image"
        });

        if (attachments.length > 1) {
            const nodes = attachments.splice(1).map((result: UploadResponse) => imageUrlToCaptionedNode(result.url));

            try {
                await mediaReply(resp, {
                    document: {
                        object: "document",
                        data: {},
                        nodes: nodes
                    },
                    object: "value"
                });
            } catch (e) {
                console.log(e)
            }
        }
    } catch (e) {
        console.log(e)
    }
}

function uploadFromUrl(url: string): Promise<UploadResponse> {
    return getMediaManager().post('/media/upload', {
        dynamicMediaTypeId: "ContentMedia",
        mediaInfo: {
            src: url
        },
        uploadTrackingId: "r-0000000-0000000" // don't care about this
    });
}

function media(channelId: string, media: Media): Promise<Media> {
    return guilded.rest.post(`/channels/${channelId}/media`, media) as Promise<Media>;
}

function mediaReply(media: Media, message: object): Promise<MediaReply> {
    const doc = {
        channelId: media.channelId,
        contentId: media.id,
        contentType: "team_media",
        gameId: null,
        id: Math.floor(Math.random() * 2 ** 28), // afaik this is completely random and matters not at all
        isContentReply: true,
        message: message,
        postId: media.id,
        teamId: media.teamId
    };

    return guilded.rest.post(`/content/team_media/${media.id}/replies`, doc) as Promise<MediaReply>;
}

function send(channel: DMChannel | TextChannel | PartialChannel, message: object) {
    guilded.rest.post(`/channels/${channel.id}/messages`, message).then((newMessage) => {
        channel.messages.add(newMessage);
    });
}

/**
 * grab message channel mentions
 * @param message
 */
function parseChannels(message: Message): string[] {
    const out = [];

    (message.raw.content.document.nodes as Object[]).filter((node: any) => node.type === 'paragraph').forEach((node: any) => {
        out.push(...node.nodes.filter(leaf => leaf.type === "channel").map(leaf => leaf.data.channel.id));
    });

    return out;
}

/**
 * grab message urls
 * @param message
 */
function parseUrls(message: Message): string[] {
    const out = [];

    (message.raw.content.document.nodes as Object[]).filter((node: any) => node.type === 'paragraph').forEach((node: any) => {
        out.push(...node.nodes.filter(leaf => leaf.type === "link").map(leaf => leaf.data.href));
    });

    return out;
}

async function resolveHandler(message: Message): Promise<HandlerResult> {
    const url = parseUrls(message)[0];

    if (!url) {
        return Promise.reject("no resource url.");
    }

    console.log(`intercepted url '${url}'`);

    for (const handler of handlers) {
        try {
            console.log(`trying handler '${handler.id}'`);
            return await handler.handle(url);
        } catch (e) {
            console.log(`handler returned failure result: ${e}`);
        }
    }

    return Promise.reject("no handler.");
}

function getMediaManager(): any {
    /*
     for some reason there was a problem importing the type so we do this weird shit
     in order to clone the prototype
     */
    const con = (guilded.rest as Object).constructor as any;
    const clone = new con();
    clone.baseDomain = 'media.guilded.gg';
    clone.apiURL = 'https://media.guilded.gg';
    clone.cookieJar = guilded.rest.cookieJar;
    clone.token = guilded.rest.token;
    return clone;
}

/**
 * image url to message node
 * @param url
 */
function imageUrlToNode(url: string): object {
    return {
        object: "block",
        type: "image",
        data: {
            src: url,
        },
        nodes: [{
            object: "text",
            leaves: [
                {
                    object: "leaf",
                    text: "",
                    marks: []
                }
            ]
        }]
    }
}

function imageUrlToCaptionedNode(url: string, caption: string = ""): object {
    return {
        object: "block",
        type: "image",
        data: {
            src: url,
        },
        nodes: [{
            object: "block",
            type: "image-caption-line",
            data: {},
            nodes: [{
                object: "text",
                leaves: [
                    {
                        object: "leaf",
                        text: caption,
                        marks: []
                    }
                ]
            }]
        }]
    }
}

guilded.login(options.guilded);