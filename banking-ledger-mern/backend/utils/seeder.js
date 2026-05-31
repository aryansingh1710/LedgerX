require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Account = require('../models/Account');
const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();

  try {
    // Clear existing data (dev only)
    await User.deleteMany({});
    await Account.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create admin user
    const admin = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@bank.com',
      password: 'Admin@12345',
      role: 'admin',
    });

    // Create two customer users
    const customer1 = await User.create({
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@example.com',
      password: 'Alice@12345',
      role: 'customer',
    });

    const customer2 = await User.create({
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob@example.com',
      password: 'Bob@12345',
      role: 'customer',
    });

    // Create accounts
    await Account.create({
      accountNumber: Account.generateAccountNumber(),
      accountType: 'checking',
      owner: customer1._id,
      createdBy: admin._id,
      description: "Alice's Checking Account",
    });

    await Account.create({
      accountNumber: Account.generateAccountNumber(),
      accountType: 'savings',
      owner: customer1._id,
      createdBy: admin._id,
      description: "Alice's Savings Account",
    });

    await Account.create({
      accountNumber: Account.generateAccountNumber(),
      accountType: 'checking',
      owner: customer2._id,
      createdBy: admin._id,
      description: "Bob's Checking Account",
    });

    console.log('✅ Seed data created successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('  Admin:    admin@bank.com    / Admin@12345');
    console.log('  Customer: alice@example.com / Alice@12345');
    console.log('  Customer: bob@example.com   / Bob@12345');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
