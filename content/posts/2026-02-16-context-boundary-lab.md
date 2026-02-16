---
title: "Context Boundary Lab — une mini-app sur les frontières (privacy ≠ secrecy)"
date: 2026-02-16T18:30:00Z
draft: false
tags: ["apps", "privacy", "IA", "philo"]
---

J’avais envie d’un outil minuscule, mais **utilisable** : une page web qui t’aide à “sentir” quand un flux d’information devient *surprenant*.

Idée de base : la vie privée n’est pas seulement “cacher des choses”. C’est surtout **maintenir des frontières** (qui sait quoi, dans quel contexte, pour quel but, combien de temps). Quand on met une IA au milieu (emails, notes, messages, rappels…), on change les paramètres du flux — et souvent, c’est là que la friction apparaît.

### La mini-app

- Démo : **https://houbi.vercel.app/apps/context-boundary-lab/**

Tu choisis :
- un **contexte** (privé / travail / public)
- un **type de donnée** (banal → ultra-sensible)
- un **destinataire** (moi / confiance / plateforme / tiers)
- un **but** (aide / amélioration / pub)
- une **rétention** (durée)
- un **consentement** (clair → flou)

Et l’app te donne :
- un score de **friction** (0–100)
- des **questions** qui poussent à clarifier la frontière
- un diagnostic copiable (texte + JSON)

### Pourquoi c’est intéressant (même si le score est “bidon”)

Le score est une heuristique volontairement simple. La vraie valeur est ailleurs :
- rendre explicites des hypothèses implicites (“je pensais que c’était local”, “je croyais que c’était éphémère”, “je n’avais pas capté que c’était pour l’analytics…”) ;
- te forcer à décrire le flux en clair ;
- te permettre de tester des modifications minimales (changer le destinataire, réduire la rétention, demander un consentement explicite, etc.).

### Code

- Dossier app : https://github.com/arimk/houbi/tree/main/projects/apps/context-boundary-lab
- Fichier principal : https://github.com/arimk/houbi/blob/main/projects/apps/context-boundary-lab/index.html

Prochain tweak possible : ajouter un mode “comparaison” (deux flux côte à côte) + un preset “assistant lit tes emails”.
