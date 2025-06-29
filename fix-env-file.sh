#!/bin/bash

# Fix .env file format on VPS
# This script cleans up .env file to prevent export errors

echo "🔧 Fixing .env file format on VPS..."

# SSH to VPS and fix .env file
ssh cisco@192.168.238.10 << 'EOF'
    cd /opt/msti-automation
    
    echo "📁 Current directory: $(pwd)"
    
    if [ -f .env ]; then
        echo "📄 Found .env file, checking content..."
        echo "--- Original .env content ---"
        cat .env
        echo "--- End of original content ---"
        
        # Create backup
        cp .env .env.backup
        echo "💾 Backup created: .env.backup"
        
        # Clean the .env file
        echo "🧹 Cleaning .env file..."
        
        # Remove carriage returns, fix export statements, and clean up
        sed -i 's/\r$//' .env  # Remove Windows line endings
        sed -i 's/^export //' .env  # Remove export prefix
        sed -i '/^$/d' .env  # Remove empty lines
        sed -i '/^#/d' .env  # Remove comment lines
        sed -i 's/^[[:space:]]*//' .env  # Remove leading spaces
        sed -i 's/[[:space:]]*$//' .env  # Remove trailing spaces
        
        # Fix DATABASE_URL quotes (remove surrounding quotes)
        sed -i 's/^DATABASE_URL="\(.*\)"$/DATABASE_URL=\1/' .env
        sed -i "s/^DATABASE_URL='\(.*\)'$/DATABASE_URL=\1/" .env
        
        # Fix other quoted values if needed
        sed -i 's/^INFLUX_URL="\(.*\)"$/INFLUX_URL=\1/' .env
        sed -i "s/^INFLUX_URL='\(.*\)'$/INFLUX_URL=\1/" .env
        
        echo "--- Cleaned .env content ---"
        cat .env
        echo "--- End of cleaned content ---"
        
        # Validate each line
        echo "🔍 Validating .env format..."
        while IFS= read -r line; do
            if [[ "$line" =~ ^[a-zA-Z_][a-zA-Z0-9_]*=.* ]]; then
                echo "✅ Valid: $line"
            else
                echo "❌ Invalid: $line"
            fi
        done < .env
        
    else
        echo "❌ .env file not found!"
        echo "📝 Creating sample .env file..."
        cat > .env << 'ENVEOF'
DOCKER_USERNAME=dafit17docker
DATABASE_URL=postgresql://user:password@host:5432/database
INFLUX_URL=http://influxdb:8086
INFLUX_TOKEN=your_token_here
ENVEOF
        echo "✅ Sample .env file created"
    fi
    
    echo "🎯 .env file fix completed!"
EOF

echo "✅ .env file fixed on VPS"
echo "🚀 Now you can try deployment again: npm run deploy" 