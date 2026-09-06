# MongoDB Atlas Dump & Local Docker Seed Utility

A fast, cross-platform utility (Windows, macOS, Linux) to dump an existing MongoDB Atlas cluster and easily spin up, seed, tear down, and reset a local MongoDB instance in Docker for local testing of your application.

No local MongoDB database tools (`mongodump`, `mongorestore`, `mongosh`) are required on your host machine—everything is containerized with Docker and driven via standard `npm` commands.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with Compose)
- [Node.js](https://nodejs.org/) (v18+)

---

## Quick Start

### 1. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
# Windows / macOS / Linux
cp .env.example .env
```

Open `.env` and fill in your MongoDB Atlas connection string:

```env
ATLAS_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority"
```

*(Optional settings such as `ATLAS_DB_NAME`, `LOCAL_MONGO_PORT`, `LOCAL_MONGO_USERNAME`, etc., can also be configured in `.env`)*

### 2. Take a Dump of Atlas

Run the dump command:

```bash
npm run dump
```

This runs `mongodump` inside an isolated Docker container and saves the `.bson` and `.metadata.json` files directly into `./dump` on your host.

> **Note:** Dump files stored in `./dump` are automatically git-ignored so you don't commit private database data.

### 3. Start Local MongoDB

```bash
npm run up
```

Starts the local MongoDB container in the background listening on `localhost:27017`.

### 4. Seed Local MongoDB

```bash
npm run seed
```

Restores your dump into the running local Docker MongoDB instance. If the container isn't already running, `npm run seed` will automatically start it and wait until it is ready before restoring.

---

## Common Workflows

### Resetting Between Tests

Whenever you want to completely wipe the local database volume and re-seed fresh from the dump:

```bash
npm run reset
```

This executes `docker compose down -v`, recreates the container, and restores your dump in a single command.

### Interactive Mongo Shell (`mongosh`)

To inspect or query your local MongoDB database interactively:

```bash
npm run mongosh
```

### Stopping the Local Instance

- **Stop containers (preserve data):**
  ```bash
  npm run down
  ```
- **Stop containers and delete data volume:**
  ```bash
  npm run down:wipe
  ```

### Optional Web UI (Mongo Express)

If you'd like an administrative web browser interface:

```bash
# Start Mongo Express
npm run gui

# Stop Mongo Express
npm run gui:down
```

Open your browser to: [http://localhost:8081](http://localhost:8081)

---

## Connecting Your App

In your application's configuration, point your MongoDB connection string to:

- **Without Authentication (Default):**
  ```
  mongodb://localhost:27017/your_database_name
  ```
- **With Authentication (if `LOCAL_MONGO_USERNAME` was set in `.env`):**
  ```
  mongodb://<username>:<password>@localhost:27017/your_database_name?authSource=admin
  ```

---

## Available NPM Scripts Reference

| Command | Description |
|---|---|
| `npm run dump` | Connects to Atlas and dumps databases into `./dump` |
| `npm run up` | Starts the local MongoDB container in the background |
| `npm run down` | Stops the local MongoDB container (preserves volume) |
| `npm run down:wipe` | Stops the container and deletes the volume |
| `npm run seed` | Seeds local MongoDB from `./dump` (auto-starts container if needed) |
| `npm run reset` | Wipes volume, recreates container, and re-seeds fresh |
| `npm run mongosh` | Connects an interactive `mongosh` session to the container |
| `npm run gui` | Starts Mongo Express web UI on port 8081 |
| `npm run gui:down` | Stops the Mongo Express web UI |
| `npm run logs` | Streams MongoDB container logs |
| `npm run status` | Shows status of running Docker services |

---

## Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `ATLAS_URI` | *(Required for dump)* | Atlas connection string |
| `ATLAS_DB_NAME` | *(Empty / all)* | Specific Atlas database to dump |
| `LOCAL_DB_NAME` | *(Empty / same as source)* | Rename target database locally upon seed |
| `LOCAL_MONGO_PORT` | `27017` | Port exposed on host |
| `LOCAL_MONGO_CONTAINER_NAME` | `mongodb-local` | Name of Docker container |
| `LOCAL_MONGO_USERNAME` | *(Empty / no auth)* | Local root username |
| `LOCAL_MONGO_PASSWORD` | *(Empty / no auth)* | Local root password |
| `MONGO_IMAGE` | `mongo:7.0` | MongoDB Docker image tag |
| `MONGO_EXPRESS_PORT` | `8081` | Port for Mongo Express web GUI |
