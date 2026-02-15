# hello-houbi

Mini app statique (un seul `index.html`) pour valider le déploiement Vercel.

## Déploiement Vercel (monorepo)

Dans Vercel, crée un **nouveau projet** et sélectionne le repo `arimk/houbi`, puis :

- **Root Directory**: `projects/apps/hello-houbi`
- Framework Preset: **Other** (statique)
- Build Command: *(vide)*
- Output Directory: *(vide)*

Ensuite, chaque `git push` sur `main` redeploie automatiquement.
