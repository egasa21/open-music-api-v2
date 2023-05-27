class PlaylistsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePlaylistPayload(request.payload);
    const { name } = request.payload;
    const { id: userId } = request.auth.credentials;

    const playlistId = await this._service.addPlaylist(name, userId);

    const response = h.response({
      status: 'success',
      message: 'Playlist has been created',
      data: {
        playlistId,
      },
    });
    response.code(201);
    return response;
  }

  async getPlaylistsHandler(request) {
    const { id: userId } = request.auth.credentials;
    const playlists = await this._service.getPlaylists(userId);
    return {
      status: 'success',
      data: {
        playlists,
      },
    };
  }

  async deletePlaylistByIdHandler(request) {
    const { id: playlistId } = request.params;
    const { id: userId } = request.auth.credentials;

    await this._service.verifyPlaylistOwner(playlistId, userId);
    await this._service.deletePlaylistById(playlistId);

    return {
      status: 'success',
      message: 'Playlist has been deleted',
    };
  }

  async postSongToPlaylistHandler(request, h) {
    this._validator.validatePlaylistSongPayload(request.payload);
    const { id: playlistId } = request.params;
    const { songId } = request.payload;
    const { id: userId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess(playlistId, userId);
    await this._service.verifySongExists(songId);
    await this._service.addPlaylistSong(playlistId, songId, userId);

    const response = h.response({
      status: 'success',
      message: 'Song has been added to the playlist',
    });
    response.code(201);
    return response;
  }

  async getPlaylistByIdHandler(request) {
    const { id: playlistId } = request.params;
    const { id: userId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess(playlistId, userId);
    const playlist = await this._service.getPlaylistById(playlistId);
    const playlistSongs = await this._service.getPlaylistSongsById(playlistId);

    return {
      status: 'success',
      data: {
        playlist: {
          ...playlist,
          songs: playlistSongs,
        },
      },
    };
  }

  async getPlaylistActivitiesHandler(request) {
    const { id: playlistId } = request.params;
    const { id: userId } = request.auth.credentials;

    await this._service.verifyPlaylistOwner(playlistId, userId);
    const playlistActivities = await this._service.getPlaylistActivitiesById(
      playlistId,
    );

    return {
      status: 'success',
      data: {
        playlistId,
        activities: playlistActivities,
      },
    };
  }

  async deleteSongFromPlaylistHandler(request) {
    this._validator.validatePlaylistSongPayload(request.payload);
    const { id: playlistId } = request.params;
    const { songId } = request.payload;
    const { id: userId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess(playlistId, userId);
    await this._service.deletePlaylistSong(playlistId, songId, userId);

    return {
      status: 'success',
      message: 'Song has been deleted from playlist',
    };
  }
}

module.exports = PlaylistsHandler;
