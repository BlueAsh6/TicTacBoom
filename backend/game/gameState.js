const rooms = {}

const VIES_INITIALES = 3
const TIMER_MIN_MS   = 8000   
const TIMER_MAX_MS   = 35000  // 45s plafond de départ
const REDUCTION_MS   = 200   //

function genererCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function dureeAleatoire(reductionMs = 0) {
  const max = Math.max(TIMER_MIN_MS, TIMER_MAX_MS - reductionMs)
  return Math.floor(Math.random() * (max - TIMER_MIN_MS + 1)) + TIMER_MIN_MS
}

function creerRoom(hostSocketId, hostName) {
  let code
  do { code = genererCode() } while (rooms[code])

  rooms[code] = {
    code, hostSocketId,
    status       : 'waiting',
    joueurs      : [{ socketId: hostSocketId, name: hostName, vies: VIES_INITIALES, score: 0, elimine: false }],
    currentIndex : 0,
    motsUtilises : new Set(),
    bombeTimer   : null,
    dureeMs      : 0,
    syllabe      : '',
    reductionMs  : 0,
    tourDebut    : null,
    round        : 0,
  }
  return rooms[code]
}

const getRoom       = code => rooms[code] || null
const supprimerRoom = code => { if (rooms[code]?.bombeTimer) clearTimeout(rooms[code].bombeTimer); delete rooms[code] }

const joueurParSocket = (code, socketId) => rooms[code]?.joueurs.find(j => j.socketId === socketId) || null
const roomDuSocket    = socketId => Object.values(rooms).find(r => r.joueurs.some(j => j.socketId === socketId)) || null
const joueursVivants  = room => room.joueurs.filter(j => !j.elimine)

function prochainJoueur(room) {
  const vivants = joueursVivants(room)
  if (vivants.length <= 1) return vivants[0] || null
  let idx = room.currentIndex
  do { idx = (idx + 1) % room.joueurs.length } while (room.joueurs[idx].elimine)
  room.currentIndex = idx
  return room.joueurs[idx]
}

function roomPublic(room) {
  return {
    code: room.code, status: room.status, hostSocketId: room.hostSocketId,
    joueurs: room.joueurs.map(({ socketId, name, vies, score, elimine }) => ({ socketId, name, vies, score, elimine })),
    currentIndex: room.currentIndex, syllabe: room.syllabe,
    tourDebut: room.tourDebut, round: room.round,
  }
}

module.exports = { rooms, creerRoom, getRoom, supprimerRoom, joueurParSocket, roomDuSocket, joueursVivants, prochainJoueur, roomPublic, dureeAleatoire, VIES_INITIALES, REDUCTION_MS }