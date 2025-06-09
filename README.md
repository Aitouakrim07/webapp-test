# UCPE Webapp

This repository contains code of the centrals servers for the UCPE platform.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Pulling Docker image

To pull a docker image from Github registry first create Personal Access Token in you profile with read:package permission.
Copy the token then in the terminal where you want to pull image :

```bash
docker login ghcr.io
username : your username
password : copy the token.
```

## Configuration

For production you need the following environment variable to be configured :

```bash
# Database URL, customize it
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
# a random string (openssl rand -base64 32)
AUTH_SECRET="xxx"
# real FQDN of the application
AUTH_TRUST_HOST="http://localhost:3000"
```

## Learn More about Next.js

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
