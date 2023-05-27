exports.up = (pgm) => {
  pgm.createTable("songs", {
    id: {
      type: "VARCHAR(50)",
      primaryKey: true,
    },
    album_id: {
      type: "VARCHAR(50)",
      references: '"albums"',
      onDelete: "cascade",
    },
    title: {
      type: "TEXT",
      notNull: true,
    },
    year: {
      type: "integer",
      notNull: true,
    },
    genre: {
      type: "TEXT",
      notNull: true,
    },
    performer: {
      type: "TEXT",
      notNull: true,
    },
    duration: {
      type: "integer",
      notNull: false,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("songs");
};
