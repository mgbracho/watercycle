# Deploy: GitHub → Vercel

## Part 1 — Put the project on GitHub

### 1. Open a terminal in the project folder

In VS Code/Cursor: **Terminal → New Terminal**, or open PowerShell and run:

```powershell
cd "C:\Users\mildr\OneDrive\Desktop\watercycle"
```

### 2. Initialize Git and make the first commit

```powershell
git init
git add .
git commit -m "Initial commit: Temperature Painter water cycle prototype"
```

### 3. Create a new repository on GitHub

1. Go to **https://github.com/new**
2. **Repository name:** e.g. `watercycle` or `temperature-painter`
3. Choose **Public**
4. Do **not** check “Add a README” (you already have local files)
5. Click **Create repository**

### 4. Connect your local repo and push

GitHub will show commands; use these (replace `YOUR_USERNAME` and `YOUR_REPO` with your actual GitHub username and repo name):

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

If GitHub asks you to sign in, use your username and a **Personal Access Token** as the password (Settings → Developer settings → Personal access tokens).

---

## Part 2 — Deploy on Vercel

### Option A — Deploy from the Vercel website (recommended)

1. Go to **https://vercel.com** and sign in (use “Continue with GitHub”).
2. Click **Add New… → Project**.
3. **Import** the repository you just pushed (e.g. `watercycle`).
4. Vercel will detect it as a static site:
   - **Framework Preset:** Other (or leave as detected)
   - **Root Directory:** leave as `.` (project root)
   - **Build Command:** leave empty
   - **Output Directory:** leave empty (Vercel serves the root as static files)
5. Click **Deploy**.
6. When it’s done, you’ll get a URL like `https://watercycle-xxx.vercel.app`. Open it to see your app.

### Option B — Deploy with Vercel CLI

1. Install the CLI (one time):

   ```powershell
   npm i -g vercel
   ```

2. In the project folder:

   ```powershell
   cd "C:\Users\mildr\OneDrive\Desktop\watercycle"
   vercel
   ```

3. Follow the prompts:
   - Log in or create a Vercel account
   - Link to existing project or create a new one
   - Confirm project settings (root `.`, no build)

4. After deployment you’ll see the live URL in the terminal.

---

## After the first deploy

- **Updates:** Push to `main` on GitHub. If the project is connected in Vercel, it will redeploy automatically.
- **Custom domain:** In the Vercel project → Settings → Domains you can add your own domain.
