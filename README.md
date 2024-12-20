# 🎥 Party Sync Watch

watch videos together with ur friends in perfect sync! built with next.js, express and socket.io

## 🚀 features
- create rooms and invite friends (just share the room code lol)
- upload videos and watch em together
- everything syncs perfectly (most of the time :d)
- modern ui with tailwind (tried my best ok)
- host controls
- volume control for everyone
- fullscreen support for mobile/desktop

## 🛠️ tech stack
- next.js 13 (app router btw)
- tailwind css (saved my life)
- express (for the backend stuff)
- socket.io (real-time magic ✨)
- framer motion (smooth af animations)

## 💻 getting started

ok so first clone this:
```bash
git clone https://github.com/wa0101/Party-Sync-Watch
cd party-sync-watch
```

install the dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

run this in dev mode:
```bash
npm run dev
```

now open [http://localhost:3000](http://localhost:3000) and pray it works 🙏

## 🚀 deployment on render.com

1. create a new web service on render
2. connect ur github repo
3. fill these settings:
   - build command: `npm install && npm run build`
   - start command: `npm start`
   - environment variables:
     ```
     NODE_ENV=production
     NEXT_PUBLIC_SOCKET_URL=https://your-app-url.onrender.com
     ```

## 📝 todo list (maybe someday lol)
- [ ] add chat system (cuz why not)
- [ ] youtube url support
- [ ] better mobile ui (its kinda wonky rn)
- [ ] user profiles with avatars (gotta look fancy)
- [ ] room passwords (for the secret watch parties)
- [ ] multiple hosts
- [ ] screen sharing (if i figure it out)
- [ ] better error handling (its a mess rn ngl)

## 🧑‍💻 contributing
feel free to contribute! the code is a bit messy but we're working on it

## ⚠️ known issues
- sometimes the sync gets weird
- mobile fullscreen is janky on some browsers
- the code needs some serious cleanup
- probably more that i haven't found yet 💀

## 📜 license
MIT (do whatever u want just dont sue me lol)

---
made with ❤️