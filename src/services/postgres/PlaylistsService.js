const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class PlaylistsService {
  constructor(collaborationService) {
    this._pool = new Pool();
    this._collaborationService = collaborationService;
  }

  async verifyPlaylistOwner(id, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };
    const { rows, rowCount } = await this._pool.query(query);
    if (!rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const playlist = rows[0];
    if (playlist.owner !== owner) {
      throw new AuthorizationError(
        'Anda tidak punya akses ke resource ini',
      );
    }
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      try {
        await this._collaborationService.verifyCollaborator(playlistId, userId);
      } catch {
        throw error;
      }
    }
  }

  async addPlaylist(name, owner) {
    const id = `playlist-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    };

    const { rows } = await this._pool.query(query);

    if (!rows[0].id) {
      throw new InvariantError('Gagal membuaat playlist');
    }

    return rows[0].id;
  }

  async verifySongExists(songId) {
    const query = {
      text: 'SELECT * FROM songs WHERE id = $1',
      values: [songId],
    };
    const { rowCount } = await this._pool.query(query);

    if (!rowCount) {
      throw new NotFoundError('Lagu tidak ditemukan');
    }
  }

  async addPlaylistSong(playlistId, songId, userId) {
    const playlistSongId = `playlist-song-${nanoid(16)}`;
    const playlistActivityId = `playlist-activity-${nanoid(16)}`;

    await this._pool.query('BEGIN');

    const insertSongQuery = {
      text: 'INSERT INTO playlist_songs VALUES($1, $2, $3) RETURNING id',
      values: [playlistSongId, playlistId, songId],
    };
    const insertActivityQuery = {
      text: 'INSERT INTO playlist_song_activities VALUES($1, $2, $3, $4, $5) RETURNING id',
      values: [playlistActivityId, playlistId, songId, userId, 'add'],
    };

    const { rows: songRows } = await this._pool.query(insertSongQuery);
    const { rows: activityRows } = await this._pool.query(insertActivityQuery);

    if (!songRows[0].id || !activityRows[0].id) {
      await this._pool.query('ROLLBACK');
      throw new InvariantError('Gagal menambah lagu ke playlist');
    }
    await this._pool.query('COMMIT');
  }

  async getPlaylists(owner) {
    const query = {
      text: `SELECT playlists.id, playlists.name, users.username FROM playlists
        LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
        JOIN users ON users.id = playlists.owner
        WHERE playlists.owner = $1 OR collaborations.user_id = $1
        GROUP BY playlists.id, users.username`,
      values: [owner],
    };

    const { rows } = await this._pool.query(query);
    return rows;
  }

  async getPlaylistById(id) {
    const query = {
      text: `SELECT playlists.id, playlists.name, users.username FROM playlists
      JOIN users ON users.id = playlists.owner
      WHERE playlists.id = $1`,
      values: [id],
    };

    const { rows, rowCount } = await this._pool.query(query);
    if (!rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    return rows[0];
  }

  async getPlaylistSongsById(id) {
    const query = {
      text: `SELECT songs.id, songs.title, songs.performer 
      FROM playlist_songs
      JOIN songs ON songs.id = playlist_songs.song_id
      WHERE playlist_songs.playlist_id = $1`,
      values: [id],
    };

    const { rows } = await this._pool.query(query);
    return rows;
  }

  async getPlaylistActivitiesById(id) {
    const query = {
      text: `SELECT users.username, songs.title, playlist_song_activities.action, playlist_song_activities.time
      FROM playlist_song_activities
      JOIN songs ON songs.id = playlist_song_activities.song_id
      JOIN users ON users.id = playlist_song_activities.user_id
      WHERE playlist_song_activities.playlist_id = $1`,
      values: [id],
    };

    const { rows, rowCount } = await this._pool.query(query);
    if (!rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    return rows;
  }

  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id',
      values: [id],
    };

    const { rowCount } = await this._pool.query(query);

    if (!rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }
  }

  async deletePlaylistSong(playlistId, songId, userId) {
    const playlistActivityId = `playlist-activity-${nanoid(16)}`;

    await this._pool.query('BEGIN');

    const deleteQuery = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2 RETURNING id',
      values: [playlistId, songId],
    };
    const insertActivityQuery = {
      text: 'INSERT INTO playlist_song_activities VALUES($1, $2, $3, $4, $5) RETURNING id',
      values: [playlistActivityId, playlistId, songId, userId, 'delete'],
    };

    const { rowCount } = await this._pool.query(deleteQuery);
    const { rows: activityRows } = await this._pool.query(insertActivityQuery);

    if (!rowCount) {
      await this._pool.query('ROLLBACK');
      throw new NotFoundError(
        `Playlist id ${playlistId} dengan lagu id ${songId} is tidak ditemukan`,
      );
    }

    if (!activityRows[0].id) {
      await this._pool.query('ROLLBACK');
      throw new InvariantError('Gagal menambah activity');
    }

    await this._pool.query('COMMIT');
  }
}

module.exports = PlaylistsService;
