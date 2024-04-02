"use strict";

 

const fs = require("fs");

const tls = require("tls");

const WebSocket = require("ws");

const extract_json_from_string_1 = require("extract-json-from-string");

 

const config = {

    discordHost: "canary.discord.com",

    discordToken: "OTg3Mzg4MDI4NzM5ODEzNDc4.GhdLKw.SlYENiHxBOhHIanoZ_ALpI1snMhbKQXavMz-zg",

    guildId: "1211740903085965432",

    channelId: "1215972739828154449",

    gatewayUrl: "wss://gateway.discord.gg",

    os: "linux",

    browser: "firefox",

    device: "firefox"

};

 

let vanity;

const guilds = {};

let start;

let end;

 

const tlsSocket = tls.connect({ host: config.discordHost, port: 443 });

 

tlsSocket.on("data", async (data) => {

    const ext = (0, extract_json_from_string_1)(data.toString());

    const find = ext.find((e) => e.code) || ext.find((e) => e.message);

    if (find) {

        end = Date.now();

        const sure = end - start;

        console.log(find);

        const requestBody = JSON.stringify({

            content: `@everyone ${vanity}\n\`\`\`json\n${JSON.stringify(find)}\`\`\``,

        });

        const contentLength = Buffer.byteLength(requestBody);

        const requestHeader = [

            `POST /api/v9/channels/${config.channelId}/messages HTTP/1.1`, //channel

            "Host: discord.com",

            `Authorization: ${config.discordToken}`, //self token

            "Content-Type: application/json",

            `Content-Length: ${contentLength}`,

            "",

            "",

        ].join("\r\n");

        const request = requestHeader + requestBody;

        tlsSocket.write(request);

    }

});

 

 

tlsSocket.on("error", (error) => {

    console.log(`tls error`, error);

    process.exit();

});

 

tlsSocket.on("end", () => {

    console.log("tls connection closed");

    process.exit();

});

 

tlsSocket.on("secureConnect", () => {

    const websocket = new WebSocket(config.gatewayUrl);

 

    websocket.onclose = (event) => {

        console.log(`ws connection closed ${event.reason} ${event.code}`);

        process.exit();

    };

 

    websocket.onmessage = async (message) => {

        const { d, op, t } = JSON.parse(message.data);

 

        if (t === "GUILD_UPDATE") {

            const find = guilds[d.guild_id];

            if (find && find !== d.vanity_url_code) {

                start = Date.now();

                const requestBody = JSON.stringify({ code: find });

                const requestHeader = [

                    `PATCH /api/v8/guilds/${config.guildId}/vanity-url HTTP/1.1`,

                    `Host: ${config.discordHost}`,

                    `Authorization: ${config.discordToken}`,

                    `Content-Type: application/json`,

                    `Content-Length: ${requestBody.length}`,

                    "",

                    "",

                ].join("\r\n");

                const request = requestHeader + requestBody;

                tlsSocket.write(request);

                vanity = `guild patch ${find}`;

            }

        } else if (t === "READY") {

            d.guilds.forEach((guild) => {

                if (guild.vanity_url_code) {

                    guilds[guild.id] = guild.vanity_url_code;

                } else {

                    console.log(guild.name);

                }

            });

            console.log(guilds);

        }

 

        if (op === 10) {

            websocket.send(JSON.stringify({

                op: 2,

                d: {

                    token: config.discordToken,

                    intents: 1 << 0,

                    properties: {

                        os: config.os,

                        browser: config.browser,

                        device: config.device,

                    },

                },

            }));

            setInterval(() => websocket.send(JSON.stringify({ op: 0.1, d: {}, s: null, t: "heartbeat" })), d.heartbeat_interval);

        } else if (op === 7) {

            process.exit();

        }

    };

 

    setInterval(() => {

        tlsSocket.write(["GET / HTTP/1.1", `Host: ${config.discordHost}`, "", ""].join("\r\n"));

    }, 7500);

});