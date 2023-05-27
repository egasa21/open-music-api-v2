const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');

class CollaborationsService {
  constructor(usersService) {
    this._pool = new Pool();
    this._usersService = usersService;
  }

  async addCollaboration(playlistId, userId) {
    await this._usersService.verifyUserExists(userId);

    const id = `collab-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO collaborations VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, userId],
    };

    const { rows, rowCount } = await this._pool.query(query);

    if (!rowCount) throw new InvariantError('Gagal membuat kolaborasi');

    return rows[0].id;
  }

  async deleteCollaboration(playlistId, userId) {
    const query = {
      text: 'DELETE FROM collaborations WHERE playlist_id = $1 AND user_id = $2 RETURNING id',
      values: [playlistId, userId],
    };

    const { rowCount } = await this._pool.query(query);

    if (!rowCount) throw new InvariantError('Gagal menghapus kolaborasi');
  }

  async verifyCollaborator(playlistId, userId) {
    const query = {
      text: 'SELECT * FROM collaborations WHERE playlist_id = $1 AND user_id = $2',
      values: [playlistId, userId],
    };

    const { rowCount } = await this._pool.query(query);

    if (!rowCount) throw new InvariantError('Anda bukan kolaborator');
  }
}

module.exports = CollaborationsService;
