const MOTS_FR = require('an-array-of-french-words')

function normaliser(mot) {
  return mot.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// Set pour lookup O(1)
const DICTIONNAIRE = new Set(MOTS_FR.map(normaliser))

console.log(`Dictionnaire chargé : ${DICTIONNAIRE.size} mots`)

function estValide(mot, syllabe) {
  const motN     = normaliser(mot)
  const syllabeN = normaliser(syllabe)
  return DICTIONNAIRE.has(motN) && motN.includes(syllabeN)
}

module.exports = { DICTIONNAIRE, normaliser, estValide }