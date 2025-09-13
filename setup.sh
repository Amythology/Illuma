#!/bin/bash

# Base directory
mkdir -p fund-transparency-system

# Backend directories
mkdir -p fund-transparency-system/backend/models
mkdir -p fund-transparency-system/backend/routes
mkdir -p fund-transparency-system/backend/middleware
mkdir -p fund-transparency-system/backend/config

# Frontend directories
mkdir -p fund-transparency-system/frontend/css
mkdir -p fund-transparency-system/frontend/js

# Backend files
touch fund-transparency-system/backend/models/User.js
touch fund-transparency-system/backend/models/Transaction.js
touch fund-transparency-system/backend/models/Report.js

touch fund-transparency-system/backend/routes/auth.js
touch fund-transparency-system/backend/routes/transactions.js
touch fund-transparency-system/backend/routes/reports.js

touch fund-transparency-system/backend/middleware/auth.js
touch fund-transparency-system/backend/config/db.js
touch fund-transparency-system/backend/server.js

# Frontend files
touch fund-transparency-system/frontend/css/style.css
touch fund-transparency-system/frontend/js/app.js
touch fund-transparency-system/frontend/index.html
touch fund-transparency-system/frontend/auth.html
touch fund-transparency-system/frontend/dashboard.html
touch fund-transparency-system/frontend/public-dashboard.html

# Root-level file
touch fund-transparency-system/package.json

echo "✅ All directories and files created separately!"
