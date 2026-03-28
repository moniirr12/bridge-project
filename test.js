// verify-setup.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./bridges.db');

console.log('🔍 Checking database setup...\n');

// Check organizations table
db.all('SELECT * FROM organizations', [], (err, rows) => {
    if (err) {
        console.error('❌ Organizations table error:', err.message);
    } else {
        console.log('✅ Organizations table exists');
        console.table(rows);
    }
});

// Check users table
db.all('SELECT id, username, organization_id, role, full_name FROM users', [], (err, rows) => {
    if (err) {
        console.error('❌ Users table error:', err.message);
    } else {
        console.log('✅ Users table exists');
        console.table(rows);
    }
});

// Check if bridges has organization_id
db.get("PRAGMA table_info(bridges)", [], (err, row) => {
    db.all("PRAGMA table_info(bridges)", [], (err, columns) => {
        const hasOrgId = columns.some(col => col.name === 'organization_id');
        if (hasOrgId) {
            console.log('✅ Bridges table has organization_id column');
        } else {
            console.log('⚠️  Bridges table missing organization_id column');
        }
    });
});

db.close();