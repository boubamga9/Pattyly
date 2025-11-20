# Feuille de route SEO - Pattyly.com

**Date de création** : Janvier 2025  
**Objectif** : Améliorer la visibilité organique et attirer du trafic qualifié de cake designers et pâtissiers indépendants

---

## 📊 État actuel (diagnostic)

### ✅ Points forts
- Site récent avec structure simple et claire
- HTTPS et Cloudflare en place
- Design responsive
- Meta descriptions présentes sur les pages principales
- FAQ existante (mais non optimisée SEO)

### ⚠️ Problèmes identifiés
- **Absence de H1** sur la page d'accueil (slogan en H2)
- **Pas de sitemap.xml** généré automatiquement
- **robots.txt** basique (pas de blocage des environnements de test)
- **Pas de données structurées** (Schema.org) pour FAQ
- **Contenu limité** : pas de blog, peu de pages thématiques
- **Environnement de test indexé** (test.pattyly.com)
- **Faible densité de mots-clés** sur les pages existantes
- **Pas de backlinks** sectoriels identifiés

---

## 🎯 Objectifs SEO (6-12 mois)

### Objectifs quantitatifs
- **Trafic organique** : Passer de ~0 à 500-1000 visiteurs/mois d'ici 6 mois
- **Mots-clés positionnés** : 50+ mots-clés longue traîne dans le top 10
- **Backlinks** : 20-30 liens de qualité depuis des sites sectoriels
- **Pages indexées** : 30-50 pages de contenu (blog + landing pages)

### Objectifs qualitatifs
- Devenir une référence sur les sujets "gestion pâtisserie" et "boutique en ligne cake design"
- Améliorer le taux de conversion du trafic organique (visiteurs → essais gratuits)
- Renforcer l'autorité de domaine dans le secteur

---

## 🗺️ Plan d'action par phases

### **PHASE 1 : Optimisations techniques (Priorité HAUTE - Semaines 1-2)**

**Objectif** : Corriger les erreurs techniques bloquantes et mettre en place les bases SEO

#### 1.1 Corrections on-page urgentes
- [ ] **Ajouter un H1 sur la homepage** avec mots-clés principaux
  - Exemple : "Plateforme de gestion en ligne pour cake designers et pâtissiers"
- [ ] **Optimiser les balises `<title>`** de toutes les pages
  - Homepage : "Logiciel de gestion pour cake designers – Gagnez du temps avec Pattyly"
  - Tarifs : "Tarifs et abonnements – Logiciel gestion pâtisserie | Pattyly"
  - Contact : "Contact – Support Pattyly pour pâtissiers"
- [ ] **Enrichir les meta descriptions** (155 caractères max, incitatives)
  - Homepage : "Pattyly – Plateforme de gestion pour pâtissiers. Créez votre boutique en ligne, gérez commandes, devis, factures et planning facilement. Essai gratuit 7 jours."
- [ ] **Vérifier la hiérarchie Hn** sur toutes les pages (1 seul H1, H2/H3 logiques)

#### 1.2 Données structurées (Schema.org)
- [ ] **Ajouter FAQPage schema** sur la section FAQ de la homepage
  - Permet l'affichage en rich snippets dans Google
- [ ] **Ajouter Organization schema** sur la homepage
  - Logo, nom, description, réseaux sociaux
- [ ] **Ajouter BreadcrumbList** (quand le blog sera créé)

#### 1.3 Sitemap et robots.txt
- [ ] **Créer un sitemap.xml dynamique** (SvelteKit)
  - Inclure toutes les pages marketing
  - Mise à jour automatique lors de l'ajout de contenu
- [ ] **Améliorer robots.txt**
  - Bloquer `/test/`, `/dashboard/`, `/api/`
  - Autoriser uniquement les pages publiques
  - Pointer vers le sitemap
- [ ] **Bloquer l'indexation de test.pattyly.com**
  - Ajouter `noindex` meta tag ou robots.txt sur l'environnement de test
  - Ou configurer Cloudflare pour bloquer les robots sur ce sous-domaine

#### 1.4 Performance et Core Web Vitals
- [ ] **Audit PageSpeed Insights** (mobile + desktop)
- [ ] **Optimiser les images**
  - Convertir en WebP
  - Activer le lazy loading
  - Compresser les images existantes
- [ ] **Minifier CSS/JS** (vérifier la config de build)
- [ ] **Configurer le cache navigateur** (via Cloudflare ou headers HTTP)

**Livrables Phase 1** :
- ✅ H1 corrigé sur toutes les pages
- ✅ Meta tags optimisées
- ✅ Schema.org FAQPage implémenté
- ✅ Sitemap.xml fonctionnel
- ✅ robots.txt amélioré
- ✅ Score PageSpeed > 80 (mobile)

---

### **PHASE 2 : Enrichissement du contenu existant (Priorité HAUTE - Semaines 3-4)**

**Objectif** : Améliorer le contenu des pages existantes pour mieux cibler les mots-clés

#### 2.1 Page d'accueil
- [ ] **Ajouter un paragraphe introductif** sous le hero
  - Inclure naturellement : "logiciel", "gestion", "cake design", "facturation", "commande en ligne"
  - ~150-200 mots
- [ ] **Enrichir les sections fonctionnalités** avec plus de détails
  - Mentionner "devis", "factures", "planning", "boutique en ligne"
- [ ] **Optimiser les alt text des images** avec mots-clés pertinents

#### 2.2 Page Tarifs
- [ ] **Ajouter des descriptions sous chaque plan**
  - Exemple : "Le plan Basic convient aux cake designers débutants pour gérer jusqu'à 10 produits, avec boutique en ligne, paiement sécurisé, etc."
  - Inclure des mots-clés : "abonnement pâtissier", "logiciel gestion prix"
- [ ] **Ajouter une section FAQ spécifique aux tarifs**
  - "Quel plan choisir pour mon activité ?"
  - "Puis-je changer de plan ?"

#### 2.3 Page Contact
- [ ] **Ajouter un texte d'introduction** avant le formulaire
  - ~100 mots expliquant comment contacter, temps de réponse, etc.
  - Mots-clés : "support pâtissier", "aide logiciel gestion"

#### 2.4 FAQ enrichie
- [ ] **Étoffer les réponses existantes** (actuellement courtes)
  - Chaque réponse : 100-150 mots minimum
  - Inclure des variantes de mots-clés naturellement
- [ ] **Ajouter 5-10 nouvelles questions** ciblant la longue traîne
  - "Comment calculer le prix de revient d'un gâteau ?"
  - "Quelle est la différence entre Pattyly et un site e-commerce classique ?"
  - "Puis-je intégrer Pattyly avec mon compte Instagram ?"
- [ ] **Créer une page FAQ dédiée** (`/faq`) en plus de la section homepage
  - Plus de place pour le contenu
  - Meilleure indexation

**Livrables Phase 2** :
- ✅ Homepage enrichie (500+ mots de contenu indexable)
- ✅ Page Tarifs optimisée avec descriptions
- ✅ Page Contact avec texte introductif
- ✅ FAQ enrichie (15-20 questions, réponses détaillées)
- ✅ Page FAQ dédiée créée

---

### **PHASE 3 : Création de landing pages thématiques (Priorité MOYENNE - Semaines 5-8)**

**Objectif** : Créer des pages optimisées pour des requêtes spécifiques et fonctionnalités

#### 3.1 Landing pages fonctionnalités
- [ ] **Page "Gestion des devis et factures pour cake designers"** (`/devis-factures`)
  - Mots-clés ciblés : "devis cake designer", "facturation pâtisserie"
  - Contenu : 800-1000 mots
  - Détaille comment Pattyly gère devis/factures
  - Inclure des captures d'écran
  - CTA vers essai gratuit

- [ ] **Page "Formulaire de commande de gâteau en ligne"** (`/formulaire-commande`)
  - Mots-clés : "formulaire commande gâteau", "prise de commande pâtisserie"
  - Contenu : 800-1000 mots
  - Explique la personnalisation des formulaires
  - Comparaison avec Google Forms / Jotform
  - CTA vers essai gratuit

- [ ] **Page "Boutique en ligne pour pâtissiers"** (`/boutique-en-ligne`)
  - Mots-clés : "boutique en ligne pâtissier", "créer site pâtisserie en ligne"
  - Contenu : 1000-1200 mots
  - Guide "Comment créer sa boutique en ligne"
  - Avantages vs marketplace (AlloCakes, etc.)
  - CTA vers essai gratuit

- [ ] **Page "Logiciel de gestion pour pâtissiers"** (`/logiciel-gestion`)
  - Mots-clés : "logiciel gestion pâtisserie", "logiciel facturation pâtissier"
  - Contenu : 1000-1500 mots
  - Comparaison avec ProCake, Cake Designer Club
  - Tableau comparatif
  - CTA vers essai gratuit

#### 3.2 Structure des landing pages
Chaque landing page doit inclure :
- H1 avec le mot-clé principal
- Introduction (150 mots) avec variantes du mot-clé
- Sections H2 structurées (3-5 sections)
- Images avec alt text optimisés
- FAQ spécifique (3-5 questions)
- CTA clair vers l'essai gratuit
- Liens internes vers autres pages (homepage, tarifs, blog)

**Livrables Phase 3** :
- ✅ 4 landing pages créées et optimisées
- ✅ Contenu de qualité (800-1500 mots/page)
- ✅ Images et schémas explicatifs
- ✅ FAQ intégrées
- ✅ Maillage interne mis en place

---

### **PHASE 4 : Lancement du blog (Priorité MOYENNE - Semaines 9-16)**

**Objectif** : Créer un blog pour attirer du trafic organique sur des requêtes informationnelles

#### 4.1 Infrastructure du blog
- [ ] **Créer la structure `/blog`** dans SvelteKit
  - Page liste des articles (`/blog`)
  - Page article individuel (`/blog/[slug]`)
  - Catégories/tags
- [ ] **Ajouter le menu "Blog" ou "Ressources"** dans la navigation
- [ ] **Créer un système de catégories** (silos thématiques)
  - Gestion & Business
  - Vendre en ligne
  - Métier & Formation
  - Témoignages
- [ ] **Ajouter Article schema** sur chaque article de blog
- [ ] **Créer un flux RSS** pour le blog

#### 4.2 Calendrier éditorial (6 premiers mois)
**Rythme** : 2 articles/mois minimum

**Mois 1-2 : Fondations**
- [ ] "Comment fixer le prix de vente de ses gâteaux ?" (Gestion)
- [ ] "Créer son site de cake design : guide pas à pas" (Vendre en ligne)
- [ ] "5 astuces pour mieux gérer son planning de commandes" (Gestion)
- [ ] "Boutique en ligne vs marketplace : où vendre ses gâteaux ?" (Vendre en ligne)

**Mois 3-4 : Approfondissement**
- [ ] "Logiciels de facturation pour pâtissiers : lequel choisir ?" (Gestion)
- [ ] "Comment prendre des commandes de gâteaux en ligne sans se tromper" (Vendre en ligne)
- [ ] "Devenir cake designer : par où commencer ?" (Métier)
- [ ] "Cake designer auto-entrepreneur : obligations légales" (Métier)

**Mois 5-6 : Expertise et preuve sociale**
- [ ] "10 erreurs à éviter quand on gère une pâtisserie à domicile" (Gestion)
- [ ] "Comment organiser ses commandes de gâteaux sans Excel" (Gestion)
- [ ] "Témoignage : Comment [Nom] a gagné 10h par semaine avec Pattyly" (Témoignages)
- [ ] "Calcul du prix de revient d'un gâteau : méthode complète" (Gestion)

#### 4.3 Standards de qualité des articles
Chaque article doit :
- **Longueur** : 1000-1500 mots minimum
- **Structure** : H1, 3-5 H2, sous-sections H3
- **Mots-clés** : Mot-clé principal dans le titre, première phrase, et naturellement dans le contenu
- **Images** : 2-4 images par article (captures d'écran, infographies, exemples)
- **Liens internes** : 3-5 liens vers autres pages/articles du site
- **Liens externes** : 2-3 liens vers des sources fiables
- **CTA** : Bandeau en fin d'article "Essayez gratuitement Pattyly pendant 7 jours"
- **Meta description** : Unique et incitative (155 caractères)

**Livrables Phase 4** :
- ✅ Infrastructure blog créée
- ✅ 12 articles publiés (2/mois sur 6 mois)
- ✅ Catégories organisées en silos
- ✅ Schema Article sur tous les articles
- ✅ Maillage interne fonctionnel

---

### **PHASE 5 : Pages pilier et stratégie de contenu avancée (Priorité BASSE - Semaines 17-24)**

**Objectif** : Créer des pages "pilier" qui centralisent l'autorité sur un thème

#### 5.1 Pages pilier (4-5 pages)
- [ ] **Page pilier "Gestion & Facturation pour cake designers"** (`/gestion-facturation`)
  - Page complète (2000+ mots) couvrant tous les aspects
  - Liens vers articles de blog (pages support)
  - Tableau comparatif des solutions
  - Guide téléchargeable (lead magnet)

- [ ] **Page pilier "Vendre ses gâteaux en ligne"** (`/vendre-gateaux-en-ligne`)
  - Guide exhaustif (2000+ mots)
  - Comparaison site vitrine vs marketplace
  - Étapes concrètes
  - Liens vers articles support

- [ ] **Page pilier "Organiser son activité de cake design"** (`/organiser-activite`)
  - Planning, commandes, stock, etc.
  - 2000+ mots
  - Liens vers articles support

#### 5.2 Lead magnets (contenus téléchargeables)
- [ ] **Guide PDF "Le guide du cake designer débutant"**
  - Pricing, gestion, vente en ligne
  - Page de landing pour capturer des emails
  - Distribution via blog/articles

- [ ] **Modèle Excel "Calcul de prix de revient"**
  - Alternative gratuite pour attirer
  - Mentionner Pattyly comme solution pro

#### 5.3 Contenu saisonnier
- [ ] **Articles liés aux événements** (mariages, anniversaires, fêtes)
  - "Comment gérer les commandes de gâteaux de mariage"
  - "Préparer Noël : organisation des commandes"

**Livrables Phase 5** :
- ✅ 3-4 pages pilier créées
- ✅ 2 lead magnets disponibles
- ✅ Stratégie de contenu saisonnier définie

---

### **PHASE 6 : Netlinking et relations publiques (Priorité BASSE - En continu)**

**Objectif** : Acquérir des backlinks de qualité depuis des sites sectoriels

#### 6.1 Inscriptions et annuaires
- [ ] **S'inscrire sur Capterra** (logiciels B2B)
- [ ] **S'inscrire sur GetApp / Appvizer** (alternatives)
- [ ] **Rechercher des annuaires spécialisés** "logiciels pâtisserie"
- [ ] **S'inscrire sur des comparatifs** "meilleurs logiciels pâtissiers"

#### 6.2 Partenariats et guest blogging
- [ ] **Identifier 10 blogueurs/YouTubers cake design**
  - Proposer un partenariat (accès gratuit, article/vidéo)
- [ ] **Proposer des articles invités** sur :
  - Blogs d'écoles de pâtisserie
  - Magazines entrepreneuriat culinaire
  - Communautés cake design
- [ ] **Contacter AlloCakes** pour une collaboration de contenu

#### 6.3 Relations presse
- [ ] **Rédiger un communiqué de presse** (lancement, nouvelles fonctionnalités)
- [ ] **Contacter des médias** tech/foodtech français
- [ ] **Proposer des interviews** podcasts entrepreneuriat

#### 6.4 Surveillance et opportunités
- [ ] **Mettre en place Google Alerts** sur "Pattyly"
- [ ] **Surveiller les mentions** sans lien (contacter pour ajouter le lien)
- [ ] **Analyser les backlinks des concurrents** (Ahrefs/Semrush)
  - Identifier les opportunités (sites qui mentionnent ProCake, etc.)

**Objectif** : 2-3 backlinks de qualité par mois

---

## 📈 Suivi et mesure

### Outils à configurer (Phase 1)
- [ ] **Google Search Console** (déjà en place ?)
  - Vérifier l'indexation
  - Suivre les impressions/clics
  - Détecter les erreurs
- [ ] **Google Analytics 4**
  - Segmenter le trafic "Organic Search"
  - Configurer les objectifs (clic "Essai gratuit")
- [ ] **Ubersuggest** (gratuit) ou **Semrush** (payant)
  - Suivre les positions sur 20-30 mots-clés stratégiques
- [ ] **Screaming Frog SEO Spider**
  - Audit technique mensuel

### KPIs à suivre mensuellement
1. **Trafic organique** (sessions depuis Google)
2. **Mots-clés positionnés** (top 10, top 3)
3. **Taux de conversion** trafic organique → essai gratuit
4. **Pages indexées** (Search Console)
5. **Backlinks acquis** (Ahrefs Webmaster Tools)
6. **Score PageSpeed** (mobile)
7. **Taux de rebond** trafic organique

### Rapports mensuels
Créer un tableau de bord (Google Looker Studio) avec :
- Évolution du trafic organique
- Top 10 pages les plus visitées
- Top 10 mots-clés (impressions, clics, position)
- Taux de conversion SEO
- Backlinks nouvellement acquis

---

## 🎯 Priorisation des mots-clés (par phase)

### Phase 1-2 : Mots-clés à cibler en priorité
1. **"logiciel gestion pâtisserie"** (200/mois, difficulté 35) - Page pilier
2. **"logiciel facturation pâtissier"** (90/mois, difficulté 30) - Landing page
3. **"boutique en ligne pâtissier"** (90/mois, difficulté 33) - Landing page
4. **"formulaire commande gâteau"** (100/mois, difficulté 20) - Landing page
5. **"devis cake designer"** (70/mois, difficulté 28) - Landing page

### Phase 3-4 : Longue traîne
- "comment faire un devis de gâteau" (90/mois)
- "calcul prix de revient gâteau" (150/mois)
- "prise de commande en ligne pâtisserie" (80/mois)
- "créer site pâtisserie en ligne" (170/mois)
- "vendre ses gâteaux en ligne" (200/mois)

### Phase 5-6 : Mots-clés informationnels
- "devenir cake designer" (300/mois)
- "cake designer auto entrepreneur" (150/mois)
- "prix cake designer" (120/mois)
- "gérer pâtisserie à domicile" (70/mois)

---

## 📝 Checklist de lancement d'un article de blog

Avant de publier un article, vérifier :
- [ ] H1 avec mot-clé principal
- [ ] Meta description unique (155 caractères)
- [ ] 1000-1500 mots de contenu
- [ ] 3-5 H2 structurés
- [ ] 2-4 images avec alt text optimisés
- [ ] 3-5 liens internes
- [ ] 2-3 liens externes vers sources
- [ ] CTA en fin d'article
- [ ] Schema Article ajouté
- [ ] Vérifié sur PageSpeed (score > 80)
- [ ] Relu et corrigé (orthographe, grammaire)

---

## 🚀 Quick wins (à faire immédiatement)

1. **Ajouter H1 sur la homepage** (30 min)
2. **Optimiser les meta descriptions** (1h)
3. **Créer le sitemap.xml** (2h)
4. **Ajouter FAQPage schema** (1h)
5. **Bloquer test.pattyly.com** (30 min)
6. **Enrichir la FAQ existante** (2h)

**Total** : ~7 heures de travail pour des gains rapides

---

## 📚 Ressources et références

- [Google Search Central](https://developers.google.com/search)
- [Schema.org Documentation](https://schema.org/)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Google Search Console](https://search.google.com/search-console)

---

## 📅 Timeline résumée

| Phase | Durée | Priorité | Livrables |
|-------|-------|----------|-----------|
| **Phase 1** : Optimisations techniques | 2 semaines | 🔴 HAUTE | H1, meta tags, sitemap, schema.org |
| **Phase 2** : Enrichissement contenu | 2 semaines | 🔴 HAUTE | Pages existantes optimisées, FAQ enrichie |
| **Phase 3** : Landing pages | 4 semaines | 🟡 MOYENNE | 4 landing pages thématiques |
| **Phase 4** : Blog | 8 semaines | 🟡 MOYENNE | Infrastructure + 12 articles |
| **Phase 5** : Pages pilier | 8 semaines | 🟢 BASSE | 3-4 pages pilier, lead magnets |
| **Phase 6** : Netlinking | Continu | 🟢 BASSE | 2-3 backlinks/mois |

**Total estimé** : 6 mois pour les phases prioritaires, 12 mois pour une stratégie complète

---

## 💡 Notes importantes

- **Qualité > Quantité** : Mieux vaut 1 article excellent que 3 articles moyens
- **Patience** : Le SEO prend du temps (3-6 mois pour voir des résultats)
- **Cohérence** : Publier régulièrement (2 articles/mois minimum)
- **Mesure** : Suivre les KPIs mensuellement et ajuster la stratégie
- **Adaptation** : Si un sujet fonctionne bien, créer plus de contenu autour

---

**Dernière mise à jour** : Janvier 2025

