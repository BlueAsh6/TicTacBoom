const sqlite3 = require('sqlite3').verbose()
const path    = require('path')

const db = new sqlite3.Database(path.join(__dirname, 'database.db'), err => {
  if (err) console.error('❌ BDD :', err.message)
  else     console.log('✅ SQLite connecté')
})

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY, name TEXT NOT NULL, score INTEGER DEFAULT 0)`)
  db.run(`CREATE TABLE IF NOT EXISTS words   (id INTEGER PRIMARY KEY, word TEXT UNIQUE)`)
  db.run(`CREATE TABLE IF NOT EXISTS game    (id INTEGER PRIMARY KEY, started_at TEXT, ended_at TEXT, word_id INTEGER, winner_id INTEGER,
    FOREIGN KEY(winner_id) REFERENCES players(id), FOREIGN KEY(word_id) REFERENCES words(id))`)
})

const run = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function(e) { e ? rej(e) : res(this) }))
const get = (sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, row) => e ? rej(e) : res(row)))
const all = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, rows) => e ? rej(e) : res(rows)))

module.exports = { db, run, get, all }