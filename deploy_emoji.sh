#!/bin/bash
# One-shot deploy of the premium-emoji feature + tile redesign to the VPS.
set -e
cd /opt/ivengo
echo "[1/4] build api/worker/admin"
docker compose build api worker admin
echo "[2/4] start api with new schema"
docker compose up -d api
sleep 4
echo "[3/4] prisma db push (adds CustomEmoji table + premiumEmoji column)"
docker compose exec -T api npx prisma db push --schema=packages/db/prisma/schema.prisma --accept-data-loss
echo "[4/4] start worker + admin"
docker compose up -d worker admin
docker compose ps
