# Terminal Gateway Server

This server acts as a secure WebSocket gateway, providing interactive terminal access to remote UCPE (Universal Customer Premises Equipment) devices.

It listens for WebSocket connections, identifies the target UCPE from the connection URL, looks up the device's unique connection port in the database, and then establishes a secure SSH session to the device via an FRP (Fast Reverse Proxy) server.

## Requirements

- Node.js (v18 or later recommended)
- Access to the project's PostgreSQL database.
- A configured FRP server (`frps`) on a public-facing machine (e.g., `lab0`).

---

## 1. Installation

This server is a standalone Node.js application and maintains its own dependencies.

From within the `terminal-server/` directory, run:

```bash
npm install
```

---

## 2. Configuration

This server requires a `.env` file to store sensitive connection details.

1.  **Create the file**: In the `terminal-server/` directory, create a file named `.env`.
2.  **Add variables**: Copy the template below into your new `.env` file and replace the placeholder values with your actual configuration.

### `.env` Template

```env
# File: terminal-server/.env

# 1. Database Connection String
# This must be the same connection string used by the main Next.js application.
DATABASE_URL="postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_DB_HOST:5432/YOUR_DB_NAME?schema=public"

# 2. FRP Server Host
# The public IP address or fully-qualified domain name of your lab0 server where frps is running.
LAB0_FRP_HOST="public_server_with_FRPs"

# 3. UCPE SSH User
# The username required to log into the remote UCPE devices via SSH.
UCPE_SSH_USER="user"

# 4. SSH Private Key Path
# The path to the private SSH key used to authenticate with the UCPE devices.
# This path can be absolute or relative to the `terminal-server` directory.
# It is recommended to store the key in a `keys/` subdirectory.
SSH_PRIVATE_KEY_PATH="./keys/ucpe_id_rsa"
```


## 3. Prisma Client Generation

This server shares its database schema with the main `ucpe-webapp` but requires its own generated Prisma Client.

After any changes to the `prisma/schema.prisma` file, you must re-generate the client from within this directory:

```bash
# Run this command from the terminal-server/ directory
npx prisma generate
```

---

## 4. Running the Server

### Development

To run the server in development mode with hot-reloading:

```bash
npm run dev
```

The server will be available at `ws://localhost:3002`.

