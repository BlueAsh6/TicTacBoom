const { creerRoom, getRoom, supprimerRoom, roomDuSocket, joueursVivants, prochainJoueur, roomPublic, dureeAleatoire, REDUCTION_MS } = require('../game/gameState')
const { estValide } = require('../game/dictionary')
const { run, get, all } = require('../db/database')

let SYLLABES = [
  // Faciles 
  'BLE','OUR','ANT','EUR','ION','OIR','AGE','ENT','QUI','ARC',
  'BAL','CAR','COM','COR','FOR','INT','JOU','NAT','PRE','SER',
  'TAB','UNI','TOU','VAL','SAI','RAN','MAR','MON','VER','MER',
  'CON','BOR','TER','MAN','CHA','GRA','DOU','GAR','LAN','TRA',
  'PAR','BON','MAL','BAS','HAU','FEU','EAU','AIL','OIS','AIN',
  'OIN','UIL','IEN','OUR','ANS','ONS','UNE','AME','ARE','IRE',

  // Moyennes 
  'MENT','TION','ANCE','ENCE','OIRE','IQUE','ISTE','ISME','ETTE','ILLE',
  'ASSE','ESSE','ISSE','ONNE','ENNE','ARRE','ERRE','ORRE','UBLE','ABLE',
  'IBLE','ACLE','YCLE','UPLE','EUSE','OUSE','AUSE','AISE','OISE','UISE',
  'ARME','ORME','URME','ARGE','ORGE','URGE','ARCE','ORCE','ANCE','INCE',

  // Difficiles 
  'TION','SION','XION','QUEL','QUOI','GNON','GNER','PLER','TRER','VRER',
  'PHIE','PHON','GRAPH','LOGIE','ISME','ISTE','IQUE','ENCE','ANCE','OIRE',
  'CHRON','PSYCH','RHYTH','LYMPH','SYMPH','SPHER','STRA','SCRI','SPRI','SPRO',

]

async function chargerSyllabes() {
  try {
    const rows = await all('SELECT word FROM words')
    if (rows?.length > 0) {
      const fromDB = rows.map(r => r.word.trim().toUpperCase()).filter(s => s.length >= 2)
      SYLLABES = [...new Set([...fromDB, ...SYLLABES])]
    }
  } catch { /* fallback hardcodé utilisé */ }
}

const syllabAlea = () => SYLLABES[Math.floor(Math.random() * SYLLABES.length)]

async function sauvegarderPartie(room, gagnant) {
  try {
    const now = new Date().toISOString()
    for (const j of room.joueurs) {
      const existing = await get('SELECT id FROM players WHERE name = ?', [j.name])
      if (existing) await run('UPDATE players SET score = score + ? WHERE id = ?', [j.score, existing.id])
      else          await run('INSERT INTO players (name, score) VALUES (?, ?)', [j.name, j.score])
    }
    const gagnantRow = await get('SELECT id FROM players WHERE name = ?', [gagnant.name])
    await run('INSERT INTO game (started_at, ended_at, winner_id) VALUES (?, ?, ?)',
      [room.tourDebut ? new Date(room.tourDebut).toISOString() : now, now, gagnantRow?.id || null])
  } catch (e) { console.error('Erreur BDD :', e.message) }
}

function demarrerTour(io, room) {
  if (room.bombeTimer) clearTimeout(room.bombeTimer)
  room.dureeMs   = dureeAleatoire(room.reductionMs)
  room.syllabe   = syllabAlea()
  room.tourDebut = Date.now()

  io.to(room.code).emit('nouveauTour', {
    room: roomPublic(room),
    joueurActuel: room.joueurs[room.currentIndex].socketId,
    syllabe: room.syllabe,
    // dureeMs absent volontairement — le client ne sait pas combien de temps il a
  })

  room.bombeTimer = setTimeout(() => bombeExplose(io, room), room.dureeMs)
}

function bombeExplose(io, room) {
  if (room.status !== 'playing') return
  const joueur = room.joueurs[room.currentIndex]
  joueur.vies -= 1

  io.to(room.code).emit('bombeExplosee', { joueurSocketId: joueur.socketId, viesRestantes: joueur.vies, room: roomPublic(room) })

  if (joueur.vies <= 0) {
    joueur.elimine = true
    io.to(room.code).emit('joueurElimine', { joueurSocketId: joueur.socketId, name: joueur.name, room: roomPublic(room) })
  }

  verifierFinPartie(io, room)
}

function verifierFinPartie(io, room) {
  const vivants = joueursVivants(room)
  if (vivants.length <= 1) {
    room.status = 'ended'
    if (room.bombeTimer) clearTimeout(room.bombeTimer)
    const gagnant = vivants[0] || room.joueurs.reduce((a, b) => a.score > b.score ? a : b)
    sauvegarderPartie(room, gagnant)
    io.to(room.code).emit('partieTerminee', {
      gagnant: gagnant.name,
      classement: [...room.joueurs].sort((a, b) => b.score - a.score)
        .map(({ name, score, vies, elimine }) => ({ name, score, vies, elimine })),
    })
  } else {
    prochainJoueur(room)
    room.round++
    demarrerTour(io, room)
  }
}

module.exports = (io) => {
  chargerSyllabes()

  io.on('connection', socket => {
    socket.on('creerPartie', ({ pseudo }) => {
      if (!pseudo?.trim()) return socket.emit('erreur', { message: 'Pseudo invalide.' })
      const room = creerRoom(socket.id, pseudo.trim().toUpperCase())
      socket.join(room.code)
      socket.emit('partieCreee', { room: roomPublic(room) })
    })

    socket.on('rejoindrePartie', ({ pseudo, code }) => {
      const room = getRoom(code?.toUpperCase())
      if (!room)                          return socket.emit('erreur', { message: 'Room introuvable.' })
      if (room.status !== 'waiting')      return socket.emit('erreur', { message: 'Partie déjà en cours.' })
      if (!pseudo?.trim())                return socket.emit('erreur', { message: 'Pseudo invalide.' })
      if (room.joueurs.length >= 20)      return socket.emit('erreur', { message: 'Salle pleine (20 max).' })
      const name = pseudo.trim().toUpperCase()
      if (room.joueurs.find(j => j.name === name)) return socket.emit('erreur', { message: 'Pseudo déjà pris.' })

      room.joueurs.push({ socketId: socket.id, name, vies: 3, score: 0, elimine: false })
      socket.join(room.code)
      io.to(room.code).emit('misaJourRoom', { room: roomPublic(room) })
      socket.emit('partieRejointe', { room: roomPublic(room) })
    })

    socket.on('lancerPartie', ({ code }) => {
      const room = getRoom(code)
      if (!room)                          return socket.emit('erreur', { message: 'Room introuvable.' })
      if (room.hostSocketId !== socket.id) return socket.emit('erreur', { message: 'Seul le host peut lancer.' })
      if (room.joueurs.length < 2)        return socket.emit('erreur', { message: 'Il faut au moins 2 joueurs.' })
      if (room.status !== 'waiting')      return socket.emit('erreur', { message: 'Partie déjà lancée.' })

      Object.assign(room, { status: 'playing', currentIndex: 0, round: 0, tourDebut: Date.now() })
      io.to(room.code).emit('partieLancee', { room: roomPublic(room) })
      demarrerTour(io, room)
    })

    socket.on('soumettreMotMain', ({ code, mot }) => {
      const room = getRoom(code)
      if (!room || room.status !== 'playing') return
      const joueurActuel = room.joueurs[room.currentIndex]
      if (joueurActuel.socketId !== socket.id) return socket.emit('erreur', { message: "Ce n'est pas ton tour !" })

      const motNet = mot.trim().toLowerCase()
      if (room.motsUtilises.has(motNet)) return socket.emit('motRefuse', { raison: 'Mot déjà utilisé.' })
      if (!estValide(motNet, room.syllabe)) {
        return socket.emit('motRefuse', {
          raison: !motNet.includes(room.syllabe.toLowerCase())
            ? `Le mot ne contient pas « ${room.syllabe} ».`
            : 'Mot inconnu du dictionnaire.',
        })
      }

      clearTimeout(room.bombeTimer)
      room.motsUtilises.add(motNet)
      room.reductionMs += REDUCTION_MS

      const points = motNet.length * 10
      joueurActuel.score += points

      io.to(room.code).emit('motAccepte', { joueurSocketId: socket.id, name: joueurActuel.name, mot: mot.trim(), points, room: roomPublic(room) })
      prochainJoueur(room)
      room.round++
      demarrerTour(io, room)
    })

    socket.on('disconnect', () => {
      const room = roomDuSocket(socket.id)
      if (!room) return
      const idx = room.joueurs.findIndex(j => j.socketId === socket.id)
      if (idx !== -1) room.joueurs.splice(idx, 1)
      if (room.joueurs.length === 0) return supprimerRoom(room.code)
      if (room.hostSocketId === socket.id) room.hostSocketId = room.joueurs[0].socketId
      io.to(room.code).emit('misaJourRoom', { room: roomPublic(room) })
      if (room.status === 'playing') {
        if (room.currentIndex >= room.joueurs.length) room.currentIndex = 0
        verifierFinPartie(io, room)
      }
    })
  })
}