# 🎥 Party Sync Watch

watch videos together with ur friends in perfect sync! built with next.js, express and socket.io

## 🚀 features
- create rooms and invite friends (just share the room code lol)
- upload videos and watch em together
- everything syncs perfectly (most of the time :d)
- modern ui with tailwind (tried my best ok)
- host controls with fancy progress bar
- volume control for everyone
- fullscreen support for mobile/desktop
- upload progress tracking with fancy animations
- drag n drop video uploads

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

1. fork this repo to ur github

2. create a new web service on render:
   - connect to ur github repo


3. use these settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

4. add these environment variables:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_SOCKET_URL=https://your-app-url.onrender.com
   RENDER_EXTERNAL_URL=https://your-app-url.onrender.com
   ```
   (replace `your-app-url` with ur actual render url)

5. click deploy and grab a coffee ☕
   - it might take a few mins
   - if it fails, check the logs
   - make sure all env vars are set

6. once its done, ur app will be live at:
   `https://your-app-name.onrender.com`

## 📝 todo list (maybe someday lol)
- [ ] switch to cloud storage (render storage kinda sucks rn)
  - aws s3 or cloudflare r2 for better reliability
  - faster upload speeds
  - no storage limits to worry about
  - better cdn for faster video loading
  - maybe add resumable uploads
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
- uploads are slow and limited by render.com storage
- probably more that i haven't found yet 💀


---
made with ❤️