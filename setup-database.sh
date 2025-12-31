#!/bin/bash
# Quick database setup script

echo "Setting up PostgreSQL database for street-client..."

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL is not installed or not in PATH"
    echo "Install it with: brew install postgresql@15  (macOS)"
    exit 1
fi

# Prompt for database details
read -p "PostgreSQL username (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "PostgreSQL password: " DB_PASSWORD
echo ""

read -p "PostgreSQL host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "PostgreSQL port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

DB_NAME="street_client"

# Create database
echo "Creating database..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database might already exist, continuing..."

# Generate connection string
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

echo ""
echo "✅ Database created!"
echo ""
echo "Add this to your .env file:"
echo "DATABASE_URL=\"$DATABASE_URL\""
