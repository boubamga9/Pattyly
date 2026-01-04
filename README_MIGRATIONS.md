# 🛡️ Protections contre la Perte de Données

## ⚡ Utilisation Rapide

### Avant de créer une migration

```bash
# 1. Valider la migration après l'avoir créée
npm run validate:migration supabase/migrations/20240101000000_ma_migration.sql

# 2. Avant d'appliquer en production, créer un backup
npm run backup:before-migration production
```

### Validation automatique

Les migrations sont automatiquement validées :
- ✅ À chaque commit (hook Git)
- ✅ À chaque Pull Request (GitHub Actions)
- ✅ Avant chaque push sur main

## 📋 Checklist Obligatoire

Avant d'appliquer une migration en production :

- [ ] Migration validée : `npm run validate:migrations`
- [ ] Backup créé : `npm run backup:before-migration production`
- [ ] Testée en local
- [ ] Testée en staging

## 🚨 Commandes Interdites

Ces commandes sont **BLOQUÉES** automatiquement :

- ❌ `DROP SCHEMA ... CASCADE`
- ❌ `DROP DATABASE`
- ❌ `TRUNCATE TABLE ... CASCADE`
- ❌ `DELETE FROM table` (sans WHERE)

## 📚 Documentation Complète

Voir [docs/MIGRATION_SAFETY.md](./docs/MIGRATION_SAFETY.md) pour plus de détails.

