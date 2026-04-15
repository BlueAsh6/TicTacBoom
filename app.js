const socket = io()

const sonExplosion  = () => new Audio('/sounds/die.mp3').play()
const sonMotAccepte = () => new Audio('/sounds/true.mp3').play()
const sonMotRefuse  = () => new Audio('/sounds/false.mp3').play()

let etat = { monSocketId: null, codeRoom: null, estHost: false, room: null, bombeInterval: null }

const $ = id => document.getElementById(id)

function afficherEcran(id) {
  document.querySelectorAll('.ecran').forEach(e => e.classList.remove('actif'))
  $(id).classList.add('actif')
}

function msgErreur(elemId, texte) {
  const el = $(elemId)
  if (!el) return
  el.textContent = texte
  el.style.display = texte ? 'block' : 'none'
}

const viesEmoji    = v => v <= 0 ? '☠️' : '💣'.repeat(v)
const medailleRang = r => ['🥇','🥈','🥉'][r] || (r + 1)

function demarrerAnimBombe() {
  stopAnimBombe()
  const bombe = $('bombe-emoji')
  etat.bombeInterval = setInterval(() => {
    if (Math.random() > 0.6) {
      const dx = (Math.random() - 0.5) * 6, dy = (Math.random() - 0.5) * 4
      bombe.style.transform = `translate(${dx}px, ${dy}px) scale(${1 + Math.random() * 0.08})`
    } else {
      bombe.style.transform = 'translate(0,0) scale(1)'
    }
  }, 80 + Math.floor(Math.random() * 60))
}

function stopAnimBombe() {
  clearInterval(etat.bombeInterval)
  etat.bombeInterval = null
  const bombe = $('bombe-emoji')
  if (bombe) bombe.style.transform = 'translate(0,0) scale(1)'
}

socket.on('connect',    () => { etat.monSocketId = socket.id })
socket.on('disconnect', () => console.log('❌ Déconnecté'))

socket.on('erreur', ({ message }) => {
  const ecran = document.querySelector('.ecran.actif')
  const msgId = ecran?.id.replace('ecran-', 'msg-')
  if (msgId && $(msgId)) msgErreur(msgId, '⚠️ ' + message)
  else alert('⚠️ ' + message)
})

// Accueil
$('btn-creer').addEventListener('click', () => {
  const pseudo = $('pseudo-creer').value.trim()
  if (!pseudo) return msgErreur('msg-accueil', 'Entre un pseudo.')
  msgErreur('msg-accueil', '')
  socket.emit('creerPartie', { pseudo })
})

$('btn-rejoindre').addEventListener('click', () => {
  const pseudo = $('pseudo-rejoindre').value.trim()
  const code   = $('code-input').value.trim().toUpperCase()
  if (!pseudo) return msgErreur('msg-accueil', 'Entre un pseudo.')
  if (!code)   return msgErreur('msg-accueil', 'Entre un code de room.')
  msgErreur('msg-accueil', '')
  socket.emit('rejoindrePartie', { pseudo, code })
})

$('pseudo-creer').addEventListener('keydown',    e => { if (e.key === 'Enter') $('btn-creer').click() })
$('pseudo-rejoindre').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-rejoindre').click() })
$('code-input').addEventListener('keydown',       e => { if (e.key === 'Enter') $('btn-rejoindre').click() })
$('code-input').addEventListener('input',         e => { e.target.value = e.target.value.toUpperCase() })

// Lobby
function afficherLobby(room) {
  etat.room = room; etat.codeRoom = room.code
  etat.estHost = room.hostSocketId === etat.monSocketId
  $('lobby-code').textContent = room.code
  $('lobby-lien').textContent = `localhost:3001?room=${room.code} — cliquer pour copier`
  const ul = $('lobby-joueurs')
  ul.innerHTML = ''
  room.joueurs.forEach(j => {
    const li = document.createElement('li')
    li.innerHTML = `👤 ${j.name}${j.socketId === room.hostSocketId ? ' <span class="badge-host">HOST</span>' : ''}`
    ul.appendChild(li)
  })
  const n = room.joueurs.length
  $('lobby-statut').textContent = `${n} joueur${n > 1 ? 's' : ''} — ${n >= 2 ? 'Prêt !' : 'En attente...'}`
  $('btn-lancer').style.display = etat.estHost ? 'block' : 'none'
  $('msg-lobby').textContent = etat.estHost ? '' : 'En attente que le host lance la partie…'
}

socket.on('partieCreee',   ({ room }) => { etat.monSocketId = socket.id; afficherLobby(room); afficherEcran('ecran-lobby') })
socket.on('partieRejointe',({ room }) => { etat.monSocketId = socket.id; afficherLobby(room); afficherEcran('ecran-lobby') })
socket.on('misaJourRoom',  ({ room }) => { etat.room = room; if (document.querySelector('#ecran-lobby.actif')) afficherLobby(room) })

$('lobby-lien').addEventListener('click', () => {
  navigator.clipboard?.writeText(etat.codeRoom).then(() => {
    $('lobby-lien').textContent = '✅ Copié !'
    setTimeout(() => { $('lobby-lien').textContent = `localhost:3001?room=${etat.codeRoom} — cliquer pour copier` }, 2000)
  })
})
$('btn-lancer').addEventListener('click', () => socket.emit('lancerPartie', { code: etat.codeRoom }))

// Jeu
socket.on('partieLancee', ({ room }) => { etat.room = room; afficherEcran('ecran-jeu'); msgErreur('msg-jeu', '') })

socket.on('nouveauTour', ({ room, joueurActuel, syllabe }) => {
  etat.room = room
  $('syllabe-affichage').textContent = syllabe
  const j = room.joueurs.find(j => j.socketId === joueurActuel)
  $('nom-joueur-actuel').textContent = j?.name ?? '?'
  mettreAJourBarreJoueurs(room, joueurActuel)

  const estMonTour = joueurActuel === etat.monSocketId
  $('input-mot').value       = ''
  $('input-mot').disabled    = !estMonTour
  $('btn-ok').disabled       = !estMonTour
  $('input-mot').placeholder = estMonTour ? `Tapez un mot avec « ${syllabe} »…` : `Tour de ${j?.name ?? '?'}…`
  if (estMonTour) $('input-mot').focus()

  $('bombe-emoji').textContent = '💣'
  $('bombe-emoji').classList.remove('explose')
  msgErreur('msg-jeu', '')
  demarrerAnimBombe()
})

function mettreAJourBarreJoueurs(room, joueurActuelId) {
  const barre = $('barre-joueurs')
  barre.innerHTML = ''
  room.joueurs.forEach(j => {
    const chip = document.createElement('div')
    chip.className = `chip${j.socketId === joueurActuelId ? ' actif-tour' : ''}${j.elimine ? ' elimine' : ''}`
    chip.innerHTML = `<div>${j.name}</div><div class="vies">${viesEmoji(j.vies)}</div><div class="score-chip">${j.score} pts</div>`
    barre.appendChild(chip)
  })
}

function soumettreMot() {
  const mot = $('input-mot').value.trim()
  if (!mot) return
  socket.emit('soumettreMotMain', { code: etat.codeRoom, mot })
  $('input-mot').value = ''
}

$('btn-ok').addEventListener('click', soumettreMot)
$('input-mot').addEventListener('keydown', e => { if (e.key === 'Enter') soumettreMot() })

socket.on('motAccepte', ({ joueurSocketId, mot, points, room }) => {
  etat.room = room
  stopAnimBombe()
  sonMotAccepte()
  mettreAJourBarreJoueurs(room, room.joueurs[room.currentIndex]?.socketId)
  if (joueurSocketId === etat.monSocketId) msgErreur('msg-jeu', `✅ "${mot}" — +${points} pts !`)
})

socket.on('motRefuse', ({ raison }) => { sonMotRefuse(); msgErreur('msg-jeu', `❌ ${raison}`); $('input-mot').select() })

socket.on('bombeExplosee', ({ room }) => {
  etat.room = room
  stopAnimBombe(); sonExplosion()
  $('bombe-emoji').textContent = '💥'
  $('bombe-emoji').classList.add('explose')
  mettreAJourBarreJoueurs(room, null)
})

socket.on('joueurElimine', ({ joueurSocketId, room }) => {
  etat.room = room
  mettreAJourBarreJoueurs(room, null)
  if (joueurSocketId === etat.monSocketId) {
    msgErreur('msg-jeu', '💀 Tu es éliminé !')
    $('input-mot').disabled = $('btn-ok').disabled = true
  }
})

// Classement
socket.on('partieTerminee', ({ gagnant, classement }) => {
  stopAnimBombe()
  $('gagnant-nom').textContent = gagnant
  const tbody = $('classement-tbody')
  tbody.innerHTML = ''
  classement.forEach((j, i) => {
    const tr = document.createElement('tr')
    tr.innerHTML = `<td class="rang">${medailleRang(i)}</td><td>${j.name}</td><td>${j.score}</td><td>${viesEmoji(j.vies)}</td>`
    tbody.appendChild(tr)
  })
  afficherEcran('ecran-classement')
})

$('btn-rejouer').addEventListener('click', () => location.reload())