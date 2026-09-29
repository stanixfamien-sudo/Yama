# Architecture YAMA

## Objectif
YAMA est une application personnelle et évolutive : profil, préférences, mood, souvenirs, envies, surprises et assistant IA.

## Découpage
- `src/` : interface et logique frontend.
- `src/components/` : composants réutilisables.
- `src/features/` : fonctionnalités métier.
- `src/lib/` : intégrations externes.
- `docs/` : documentation technique et produit.
- Supabase : authentification, PostgreSQL et stockage.
- API IA : couche serveur à ajouter avant toute utilisation de clé privée.

## Règles de sécurité
1. Aucun secret dans Git.
2. `.env` reste local et ignoré.
3. `.env.example` contient uniquement des noms de variables.
4. Les clés privées d'IA ne seront jamais exposées dans le frontend.
5. Les données personnelles seront isolées par utilisateur avec des politiques RLS Supabase.
