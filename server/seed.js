import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Job from './models/Job.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/worklink';

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected for seeding...');

    // Delete existing dummy data if we want to reset it (optional, let's just add for now, or clear everything?)
    // Let's just create new users with specific emails to show up in Admin.
    
    // Check if admin exists, if not create it using credentials from .env
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@worklink.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      await User.create({
        firstName: 'System',
        lastName: 'Admin',
        email: adminEmail,
        phone: '9999999999',
        password: adminPassword,
        role: 'admin',
        isVerified: true,
        profileComplete: true,
        documentsUploaded: true,
        trustScore: 100,
      });
      console.log('Admin user created.');
    }

    // Dummy users with pending verifications
    const dummyUsers = [
      {
        firstName: 'Rahul',
        lastName: 'Sharma',
        email: 'rahul.s@example.com',
        phone: '9876543210',
        password: 'Password@123',
        role: 'seeker',
        documentsUploaded: true,
        isVerified: false,
        profileComplete: true,
        documents: [
          { docType: 'aadhaar', fileName: 'aadhaar_rahul.pdf', filePath: '/dummy/path/aadhaar.pdf', status: 'pending' },
          { docType: 'pan', fileName: 'pan_rahul.jpg', filePath: '/dummy/path/pan.jpg', status: 'pending' }
        ]
      },
      {
        firstName: 'Priya',
        lastName: 'Patel',
        email: 'priya.p@example.com',
        phone: '9876543211',
        password: 'Password@123',
        role: 'employer',
        documentsUploaded: true,
        isVerified: false,
        profileComplete: true,
        documents: [
          { docType: 'aadhaar', fileName: 'aadhaar_priya.pdf', filePath: '/dummy/path/aadhaar2.pdf', status: 'pending' }
        ]
      },
      {
        firstName: 'Amit',
        lastName: 'Kumar',
        email: 'amit.k@example.com',
        phone: '9876543212',
        password: 'Password@123',
        role: 'seeker',
        documentsUploaded: true,
        isVerified: false,
        profileComplete: true,
        documents: [
          { docType: 'photo', fileName: 'selfie_amit.png', filePath: '/dummy/path/selfie.png', status: 'pending' },
          { docType: 'aadhaar', fileName: 'aadhaar_amit.pdf', filePath: '/dummy/path/aadhaar3.pdf', status: 'pending' }
        ]
      }
    ];

    for (const u of dummyUsers) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create(u);
        console.log(`Created dummy user: ${u.email}`);
      } else {
        // If exists, make sure it's in pending state
        await User.findOneAndUpdate({ email: u.email }, { documentsUploaded: true, isVerified: false, documents: u.documents });
        console.log(`Updated dummy user: ${u.email}`);
      }
    }

    // Seed sample jobs for Priya Patel (Employer) if no jobs exist
    const priya = await User.findOne({ email: 'priya.p@example.com' });
    if (priya) {
      const existingJobsCount = await Job.countDocuments();
      if (existingJobsCount === 0) {
        await Job.create([
          {
            employer: priya._id,
            title: 'Frontend React Developer for E-Commerce Platform',
            type: 'Freelance',
            location: 'Bengaluru (Hybrid)',
            pay: '₹1,200/hr',
            description: 'Looking for an experienced React developer to build interactive product pages, checkout flows, and integrate REST APIs. Minimum 1+ year experience with React, Tailwind or CSS flexbox/grid.',
            tags: ['React', 'JavaScript', 'CSS', 'REST API'],
            status: 'active'
          },
          {
            employer: priya._id,
            title: 'Social Media Content & Graphic Designer',
            type: 'Part-time',
            location: 'Remote',
            pay: '₹15,000 / month',
            description: 'Create high-converting visual assets, Instagram reels covers, and LinkedIn banner templates for growing tech startups. Proficiency in Figma or Canva required.',
            tags: ['Design', 'Figma', 'Marketing', 'Social Media'],
            status: 'active'
          },
          {
            employer: priya._id,
            title: 'Python Data Extraction & Scraping Specialist',
            type: 'Short-term',
            location: 'Remote',
            pay: '₹8,000 fixed',
            description: 'Build clean, robust Python web scrapers using BeautifulSoup / Playwright to collect structured e-commerce prices. Must export cleaned JSON/CSV datasets.',
            tags: ['Python', 'Web Scraping', 'Data Entry'],
            status: 'active'
          }
        ]);
        console.log('Sample job listings created.');
      }
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();
