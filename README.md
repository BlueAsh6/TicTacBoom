# 💣 Tic Tac Boom

> Jeu multijoueur en temps réel basé sur les mots et la pression 🔥  
> Projet 2026 — Node.js + Socket.IO

---

## 🚀 Aperçu

**Tic Tac Boom** est un jeu multijoueur en ligne où les joueurs doivent trouver des mots contenant une syllabe donnée… avant que la bombe n’explose 💥

- 👥 Jusqu’à **20 joueurs**
- 📡 Temps réel avec **Socket.IO**
- 📚 Dictionnaire de **336 000 mots**
- 🎯 Timer **secret et aléatoire**
- 🧠 Logique entièrement côté serveur

---

## 🏗️ Architecture

```
Frontend (HTML / JS)
        ⟷ Socket.IO
Backend (Node.js + Express)
        ⟶ Game Logic (gamesocket.js)
        ⟶ State Manager (gameState.js)
        ⟶ SQLite (scores + historique)
```

- **Frontend** : interface + interactions utilisateur
- **Backend** : gestion des parties en mémoire
- **Socket.IO** : communication temps réel
- **SQLite** : persistance des scores

---

## 📂 Structure du projet

```
TicTacBoom/
│
├── index.html        # UI (4 écrans)
├── app.js            # Frontend (socket + animations)
├── style.css         # Design
│
└── backend/
    ├── server.js     # Serveur Express + Socket.IO
    │
    ├── game/
    │   ├── gameState.js   # Rooms + état du jeu
    │   └── dictionary.js  # Validation mots (336k)
    │
    ├── socket/
    │   └── gamesocket.js  # Logique complète du jeu
    │
    ├── db/
    │   ├── database.js
    │   └── database.db
    │
    └── routes/
        └── games.js       # API REST (scores, historique)
```

---

## 🎮 Gameplay

1. 🏁 Un joueur crée une partie (code unique)
2. 👥 Les autres rejoignent
3. ▶️ Le host lance la partie
4. 🔤 Une syllabe est donnée
5. ⏱️ Trouve un mot avant l’explosion
6. 💥 Trop lent → perte de vie
7. 🏆 Dernier survivant = gagnant

---

## 💣 Timer secret (feature clé)

Le timer est :

- ❌ **Invisible côté client**
- 🎲 **Aléatoire côté serveur**
- 📉 **Réduit à chaque mot trouvé**

```js
function dureeAleatoire(reductionMs = 0) {
  const max = Math.max(8000, 45000 - reductionMs)
  return Math.floor(Math.random() * (max - 8000 + 1)) + 8000
}
```

👉 Plus la partie avance → plus la pression monte 😈

---

## 🔌 Socket.IO (events principaux)

### Lobby
- `creerPartie`
- `rejoindrePartie`
- `lancerPartie`

### Jeu
- `nouveauTour`
- `soumettreMotMain`
- `motAccepte`
- `motRefuse`
- `bombeExplosee`
- `partieTerminee`

---

## 🗄️ Base de données (SQLite)

### Tables

- **players** → score global
- **game** → historique des parties
- **words** → mots personnalisés

### API REST

```
GET /api/games/scores
GET /api/games/historique
```

---

## ⚙️ Installation

```bash
cd TicTacBoom/backend
npm install
```

---

## ▶️ Lancer le projet

```bash
npm start
```

➡️ http://localhost:3001

---

## 🧪 Test rapide

1. Ouvrir 2 onglets
2. Créer une partie
3. Rejoindre avec le code
4. Jouer 😎

---

## 🌐 Multijoueur en ligne

Utilise ngrok :

```bash
ngrok http 3001
```

➡️ Partage l’URL à tes joueurs

---

## 🧠 Points techniques intéressants

- Aucune API REST pendant la partie
- État des rooms en mémoire (ultra rapide)
- Validation stricte des mots (accent + casse)
- Anti-triche via timer serveur

---

## 📌 Stack technique

- Node.js
- Express
- Socket.IO
- SQLite
- HTML / CSS / JS

---

## 👨‍💻 Auteur

Solène Suchet
Rio Killian
Lilian Broque
Baptiste Ancelin 
