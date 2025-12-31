#!/bin/bash
# Quick setup script for PostgreSQL with Docker

echo "🚀 Setting up PostgreSQL database with Docker..."

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if container already exists
if docker ps -a | grep -q street-postgres; then
    echo "⚠️  Container 'street-postgres' already exists"
    read -p "Remove and recreate? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker rm -f street-postgres
    else
        echo "Using existing container..."
        docker start street-postgres > /dev/null 2>&1
        echo "✅ Database is ready!"
        echo ""
        echo "DATABASE_URL=\"postgresql://postgres:streetpass@localhost:5432/street_client?schema=public\""
        exit 0
    fi
fi

# Start PostgreSQL container
echo "📦 Starting PostgreSQL container..."
docker run --name street-postgres \
  -e POSTGRES_PASSWORD=streetpass \
  -e POSTGRES_DB=street_client \
  -p 5432:5432 \
  -d postgres:15

sleep 2

# Check if container is running
if docker ps | grep -q street-postgres; then
    echo "✅ Database created and running!"
    echo ""
    echo "📝 Add this to your .env file:"
    echo "DATABASE_URL=\"postgresql://postgres:streetpass@localhost:5432/street_client?schema=public\""
    echo ""
    echo "Then run:"
    echo "  npm run generate"
    echo "  npm run migrate"
else
    echo "❌ Failed to start container"
    exit 1
fi
