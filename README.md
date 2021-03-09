# guilded-sauce

A simple image sauce bot for guilded.gg, designed to facilitate easier posting to media channels. This currently supports Twitter and Mastodon instances (Pawoo, etc).

## Installation

* Requires node. Run `npm install`, and start the bot with `npm start`.
* The Twitter module will require you to [create a Twitter app](https://developer.twitter.com/en). Provide the access keys as described in the config.json example.

## Usage

Currently, guilded-sauce only supports media channels. If a chat message containing both a link and channel is posted, the bot will attempt to handle it, e.g.: `https://twitter.com/Dev_Voxy/status/1367612376397193218 #cute_art`

If a post contains multiple images, the bot will create a reply with the other images in the set.

To prevent abuse, only the first channel and link in a message is handled. It is recommended that you create a dedicated submission channel to use as a portal.
