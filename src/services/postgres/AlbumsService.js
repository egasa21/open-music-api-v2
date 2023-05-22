const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');

class AlbumsService {
    constructor() {
      this._pool = new Pool();
    }
  
    async addAlbum({ name, year }) {
      const id = `album-${nanoid(16)}`;
  
      const query = {
        text: 'INSERT INTO albums VALUES($1, $2, $3) RETURNING id',
        values: [id, name, year],
      };
  
      const { rows } = await this._pool.query(query);
  
      if (!rows[0].id) {
        throw new InvariantError('Failed to create album');
      }
  
      return rows[0].id;
    }
  
    async getAlbumById(id) {
      const query = {
        text: 'SELECT * FROM albums WHERE id = $1',
        values: [id],
      };
      const { rows, rowCount } = await this._pool.query(query);
  
      if (!rowCount) {
        throw new NotFoundError('Album is not found');
      }
  
      const query2 = {
        text: 'SELECT * FROM songs WHERE album_id = $1',
        values: [id],
      };
  
      const { rows: rows2 } = await this._pool.query(query2);
      const album = { ...rows[0], songs: rows2 };
  
      return album;
    }
  
    async editAlbumById(id, { name, year }) {
      const query = {
        text: 'UPDATE albums SET name = $1, year = $2 WHERE id = $3 RETURNING id',
        values: [name, year, id],
      };
  
      const { rowCount } = await this._pool.query(query);
  
      if (!rowCount) {
        throw new NotFoundError('Album is not found');
      }
    }
  
    async deleteAlbumById(id) {
      const query = {
        text: 'DELETE FROM albums WHERE id = $1 RETURNING id',
        values: [id],
      };
  
      const { rowCount } = await this._pool.query(query);
  
      if (!rowCount) {
        throw new NotFoundError('Album is not found');
      }
    }
  }
  
  module.exports = AlbumsService;
  