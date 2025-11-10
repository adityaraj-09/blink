#!/bin/bash

echo "🔒 HTTPS Certificate Setup Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "❌ mkcert is not installed"
    echo ""
    echo "📦 Installing mkcert..."
    echo ""

    # Detect OS and install
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo "Detected macOS"
        if command -v brew &> /dev/null; then
            echo "Installing via Homebrew..."
            brew install mkcert
            brew install nss # for Firefox
        else
            echo "❌ Homebrew not found. Please install Homebrew first:"
            echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "Detected Linux"
        echo "Please install mkcert manually:"
        echo "  Ubuntu/Debian: sudo apt install mkcert"
        echo "  Or see: https://github.com/FiloSottile/mkcert#installation"
        exit 1
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        # Windows
        echo "Detected Windows"
        echo "Please install mkcert manually:"
        echo "  With Chocolatey: choco install mkcert"
        echo "  Or download from: https://github.com/FiloSottile/mkcert/releases"
        exit 1
    else
        echo "❌ Unknown OS. Please install mkcert manually:"
        echo "   https://github.com/FiloSottile/mkcert#installation"
        exit 1
    fi
fi

echo ""
echo "✅ mkcert is installed"
echo ""

# Install local CA
echo "📋 Installing local Certificate Authority..."
mkcert -install

echo ""
echo "✅ Local CA installed"
echo ""

# Generate certificates
echo "🔑 Generating certificates for localhost..."
echo ""

# Create certs directory
mkdir -p certs
cd certs || exit

# Generate certificate
mkcert -key-file localhost-key.pem -cert-file localhost-cert.pem localhost 127.0.0.1 ::1

echo ""
echo "✅ Certificates generated!"
echo ""
echo "📁 Generated files:"
echo "   • certs/localhost-cert.pem (certificate)"
echo "   • certs/localhost-key.pem (private key)"
echo ""

cd ..

# Update .gitignore
echo "📝 Updating .gitignore..."
if ! grep -q "certs/" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# HTTPS certificates" >> .gitignore
    echo "certs/" >> .gitignore
    echo "*.pem" >> .gitignore
fi

echo "✅ .gitignore updated"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. The vite.config.js will be automatically updated"
echo "2. Restart your dev server: npm run dev"
echo "3. Open: https://localhost:5173"
echo "4. No browser warnings! 🎉"
echo ""
echo "📚 See HTTPS_LOCALHOST_SETUP.md for more info"
echo ""
