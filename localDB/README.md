# Local database

PostgreSQL for local development, running in Docker. The schema in `db/schema.sql` is loaded automatically on first start.

## 1. Install Docker

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and start it. Wait until it shows **Engine running**.

**Windows: "Virtualization support not detected"?** Open PowerShell as administrator, run the commands below, then restart the PC:

```powershell
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
bcdedit /set hypervisorlaunchtype auto
```

## 2. Start the database

Run all commands from this folder (`LocalDB`):

```bash
cd LocalDB
docker compose up -d --wait
```

The last command lists the tables. You should see 10.

## 3. Query it and see if it returns all the tables.

```bash
docker compose exec db psql -U metro -c "\dt"
```

Connection string for the backend:

```
postgres://metro:metro@localhost:5432/metro
```

## 4. Stop and start

| Action | Command | Data |
|---|---|---|
| Stop | `docker compose stop` | Kept |
| Start again | `docker compose start` | Kept |
| Wipe and start fresh | `docker compose down -v` then `docker compose up -d --wait` | **Deleted** |

Wipe the database after changing `db/schema.sql`, because the schema only runs on an empty database.
