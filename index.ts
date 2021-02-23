import {Client} from "@guildedjs/guilded.js"
import Message from "@guildedjs/guilded.js/types/structures/Message";
import {ResponseData} from "twitter";
import {v4 as uuidv4} from 'uuid';
import Twitter = require("twitter");
import DMChannel from "@guildedjs/guilded.js/types/structures/channels/DMChannel";
import TextChannel from "@guildedjs/guilded.js/types/structures/channels/TextChannel";
import PartialChannel from "@guildedjs/guilded.js/types/structures/channels/PartialChannel";
import Team from "@guildedjs/guilded.js/types/structures/Team";

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
const twitter = new Twitter(options.twitter);

guilded.on('ready', () => console.log(`Bot is successfully logged in`));

guilded.on("messageCreate", message => {
    interceptTwitter(message, function (link, username, id) {
        twitter.get(`statuses/show/${id}`, {tweet_mode: 'extended'}, async function (error: any, tweet: ResponseData, response: any) {
            if (error !== null) {
                console.log(error);
                return;
            }

            const targetChannel = locateChannel(message);

            if (!targetChannel) {
                console.log("no channel target");
                return;
            }

            const attachments: UploadResponse[] = [];
            const errors = [];

            for (const entity of tweet.extended_entities.media) {
                try {
                    attachments.push(await uploadFromUrl(entity.media_url));
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
                const resp = await media(targetChannel, {
                    additionalInfo: {},
                    description: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id} ${tweet.created_at}`,
                    src: attachments[0].url,
                    tags: [tweet.user.screen_name],
                    title: `${tweet.user.name}: ${tweet.full_text}`.substr(0,80),
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

            // post in-place example; disabled atm until it's relevant.

            // const nodes = attachments.map((result: UploadResponse) => imageUrlToNode(result.url));

            // const doc = {
            //     messageId: uuidv4(),
            //     content: {
            //         object: "value",
            //         document: {
            //             object: "document",
            //             data: {},
            //             nodes: nodes
            //         }
            //     }
            // }
            //
            // try {
            //     send(message.channel, doc);
            // } catch (e) {
            //     console.log(e)
            // }
        });
    })
})

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

async function mediaReply(media: Media, message: object): Promise<MediaReply> {
    const doc = {
        channelId: media.channelId,
        contentId: media.id,
        contentType: "team_media",
        gameId: null,
        id: Math.floor(Math.random() * 2**28), // too high makes the request fail, idk. ID sent by client seems random
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

function interceptTwitter(message: Message, callback) {
    const nodes = message.raw.content.document.nodes as Object[];

    nodes.filter((node: any) => node.type === 'paragraph').forEach((node: any) => {
        node.nodes.forEach((leaf: any) => {
            if (leaf.type === "link") {
                const result = leaf.data.href.match(/https:\/\/twitter.com\/(.*)\/status\/(.*)/i);

                if (result) {
                    callback(...result);
                }
            }
        });
    });
}

/**
 * grab last channel mention in the message
 * @param message
 */
function locateChannel(message: Message): string | undefined {
    const nodes = message.raw.content.document.nodes as Object[];
    let res = undefined;

    nodes.filter((node: any) => node.type === 'paragraph').forEach((node: any) => {
        node.nodes.forEach((leaf: any) => {
            if (leaf.type === "channel") {
                res = leaf.data.channel.id;
            }
        });
    });

    return res;
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