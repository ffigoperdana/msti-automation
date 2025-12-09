#!/bin/bash

# Seed admin user untuk MSTI Automation
# Script ini akan membuat user admin default: cisco/cisco123

cd "$(dirname "$0")"

echo "🔄 Seeding admin user..."

node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

(async () => {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'cisco' }
    });

    if (existingUser) {
      console.log('ℹ️  User cisco already exists. Updating role to admin...');
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: 'admin' }
      });
      console.log('✅ User cisco updated to admin role');
    } else {
      console.log('ℹ️  Creating new admin user...');
      const passwordHash = await bcrypt.hash('cisco123', 10);
      
      await prisma.user.create({
        data: {
          email: 'cisco',
          password_hash: passwordHash,
          role: 'admin'
        }
      });
      console.log('✅ Admin user created successfully!');
      console.log('   Email: cisco');
      console.log('   Password: cisco123');
      console.log('   Role: admin');
    }

    await prisma.\$disconnect();
    console.log('');
    console.log('🎉 Seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    await prisma.\$disconnect();
    process.exit(1);
  }
})();
"
