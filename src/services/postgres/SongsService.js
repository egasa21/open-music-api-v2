const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');

class SongsService {
  constructor() {
    this._pool = new Pool();
  }

  async addSong({ albumId, title, year, genre, performer, duration }) {
    const id = `song-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO songs VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      values: [id, albumId, title, year, genre, performer, duration],
    };

    const { rows } = await this._pool.query(query);

    if (!rows[0].id) {
      throw new InvariantError('Failed to create song');
    }

    return rows[0].id;
  }

  async getSongs() {
    const query = 'SELECT id, title, performer FROM songs';
    const { rows } = await this._pool.query(query);
    return rows;
  }

  async getSongById(id) {
    const query = {
      text: 'SELECT * FROM songs WHERE id = $1',
      values: [id],
    };
    const { rows, rowCount } = await this._pool.query(query);

    if (!rowCount) {
      throw new NotFoundError('Song is not found');
    }

    return rows[0];
  }

  async editSongById(id, { albumId, title, year, genre, performer, duration }) {
    const query = {
      text: 'UPDATE songs SET album_id = $1, title = $2, year = $3, genre = $4, performer = $5, duration = $6 WHERE id = $7 RETURNING id',
      values: [albumId, title, year, genre, performer, duration, id],
    };

    const { rowCount } = await this._pool.query(query);

    if (!rowCount) {
      throw new NotFoundError('Song is not found');
    }
  }

  async deleteSongById(id) {
    const query = {
      text: 'DELETE FROM songs WHERE id = $1 RETURNING id',
      values: [id],
    };

    const { rowCount } = await this._pool.query(query);

    if (!rowCount) {
      throw new NotFoundError('Song is not found');
    }
  }
}

module.exports = SongsService;
