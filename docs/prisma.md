# Guide utilisation Prisma

Prisma est un ORM. Cela permet d'abstraire l'utilisation d'une base de donnée pour notre backend.
Prisma offre plusieurs outils :

- schémas de données
- migrations automatiques des données
- génération d'un client adapté au schéma de donnée

Dans la pratique cela nous permet donc de scinder le code du choix de technologie pour la base de donnée (SQL, noSQL, etc).
Ensuite, la versionalisation du schéma de donnée permet d'améliorer la maintenabilité du projet et de bénéficier d'un mécanisme de migration.
Les migrations permettent de mettre à jour les bases de données automatiquement sans devoir écrire le code SQL par exemple.
Enfin la génération du client permet adapté au schéma permet de produire plus vite et proprement le code du backend.

## Tutoriel

### Première étape

**Démarrer une base de donnée, pour ce projet le choix est d'utiliser PostgreSQL 16.**

Prérequis : Docker installé localement.

```bash
npm run dev-db-run
```

### Deuxième étape

**Définir un schéma de donné**

Dans le fichier `prisma/schema.prisma` définissez votre schéma. Par exemple :

```prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  published Boolean @default(false)
  authorId  Int
  author    User    @relation(fields: [authorId], references: [id])
}
```

**Générer le code SQL pour la migration des donnée ainsi que le client associés au nouveau schéma.**

```bash
npx prisma migrate dev --name nouvelle_migration
```

Cette commande génère 2 choses :

1. le dossier `prisma/migrations` contenant le code SQL pour migrer le nouveau modèle.
2. le dossier `src/app/generated/prisma` contenant le code JavaScript du client associé au nouveau modèle.

Vous pouvez désormais observer votre nouveau schéma en accédant à Prisma Studio :

```bash
npx prisma studio
```

Visitez la page http://localhost:5555.

Vous pouvez ajouter des données programatiquement grâce au fichier `primsa/seed.ts`. Par exemple:

```typescript
const userData: Prisma.UserCreateInput[] = [
  {
    name: "Alice",
    email: "alice@prisma.io",
    posts: {
      create: [
        {
          title: "Join the Prisma Discord",
          content: "https://pris.ly/discord",
          published: true,
        },
        {
          title: "Prisma on YouTube",
          content: "https://pris.ly/youtube",
        },
      ],
    },
  },
  {
    name: "Bob",
    email: "bob@prisma.io",
    posts: {
      create: [
        {
          title: "Follow Prisma on Twitter",
          content: "https://www.twitter.com/prisma",
          published: true,
        },
      ],
    },
  },
];
export async function main() {
  for (const u of userData) {
    await prisma.user.create({ data: u });
  }
}
```

Puis lancez le script avec ` npx prisma db seed`.

### Troisième étape

**Utiliser le client prisma dans le backend**

Pour utiliser le client prisma vous devez être dans un composant React Server. En effet les composants client sont éxécuté dans le navigateur par conséquent la base de donnée n'est pas accessible.
Pour rappel un composant client commence par `"use client";`.

Ensuite il vous suffit d'importer le client :

```typscript
import prisma from '@/lib/prisma'
```

Enfin le client donne accès à votre modèle de donnée :

```typescript
// SELECT * FROM users;
const users = await prisma.user.findMany();
// INSERT INTO post (title, content, authorId) VALUES ($1, $2, 1);
await prisma.post.create({
  data: {
    title,
    content,
    authorId: 1,
  },
});
// etc.
```

## Plus d'informations

Pour plus d'informations :

- https://www.prisma.io/docs/guides/nextjs#25-set-up-prisma-client
- https://www.prisma.io/docs/
