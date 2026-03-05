# more-ideal-palm-tree
to-do application for progress tracking w/ Button School

For project context, product direction, and design guidance, start in the [`docs/`](docs/) folder.

## Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Configure Supabase**
   - Copy `.env.example` to `.env`
   - Either:
     - **Remote project:** In [Supabase Dashboard](https://supabase.com/dashboard) → your project → Settings → API, copy **Project URL** and **anon public** key into `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY`
     - **Local (Docker):** Run `pnpm exec supabase start`, then use the API URL and anon key it prints

3. **Run the app**
   ```bash
   pnpm dev
   ```
   Open the URL shown in the terminal (usually http://localhost:5173).
