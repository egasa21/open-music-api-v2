require('dotenv').config();

const Hapi = require('@hapi/hapi')
const ClientError = require('./exceptions/ClientError');

// albums
const albums = require('./api/albums');
const AlbumsService = require('./services/postgres/AlbumsService');
const AlbumValidator = require('./validator/albums');

// songs
const songs = require('./api/songs');
const SongsService = require('./services/postgres/SongsService');
const SongValidator = require('./validator/songs');



const init = async () => {
    const albumService = new AlbumsService();
    const songService = new SongsService();

    const server = Hapi.server({
        port: process.env.PORT,
        host: process.env.HOST,
        routes: {
            cors: {
                origin: ["*"],
            },
        },
    });

    await server.register([
        {
            plugin: albums,
            options: {
                service: albumService,
                validator: AlbumValidator,
            },
        },
        {
            plugin: songs,
            options: {
                service: songService,
                validator: SongValidator,
            },
        },
    ])

    server.ext("onPreResponse", (request, h) => {
        const { response } = request;
        if (response instanceof Error) {
            if (response instanceof ClientError) {
                const newResponse = h.response({
                    status: "fail",
                    message: response.message,
                });
                newResponse.code(response.statusCode);
                return newResponse;
            }

            if (!response.isServer) {
                return h.continue;
            }

            console.log(response);
            const newResponse = h.response({
                status: "error",
                message: "Oops, something went wrong with the server.",
            });
            newResponse.code(500);
            return newResponse;
        }

        return h.continue;
    });

    await server.start();
    console.log(`Server is up and running on ${server.info.uri} `);
}

init();