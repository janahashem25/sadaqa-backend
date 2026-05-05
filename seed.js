const mongoose = require("mongoose");
require("dotenv").config();

const Category = require("./models/Category");
const Case = require("./models/Case");
const User = require("./models/User");

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    await Category.deleteMany({});
    await Case.deleteMany({});
    await User.deleteMany({ email: "admin@sadaqa.com" });

    console.log("Cleared existing data");

    const adminUser = await User.create({
      full_name: "Admin User",
      email: "admin@sadaqa.com",
      password_hash: "123456",
      phone: "00000000",
      role: "admin",
      city: "Beirut",
      bio: "Default seeded admin user",
      is_active: true,
    });

    console.log("Created admin user");

    const categories = await Category.create([
      {
        name: "Education",
        slug: "education",
        nameAr: "Education",
        description: "Help children get quality education and build schools",
        descriptionAr: "Help children get quality education and build schools",
        icon: "📚",
        image: "https://via.placeholder.com/400x300?text=Education",
        isFeatured: true,
        order: 1,
        isActive: true,
      },
      {
        name: "Healthcare",
        slug: "healthcare",
        nameAr: "Healthcare",
        description: "Provide medical assistance and healthcare services",
        descriptionAr: "Provide medical assistance and healthcare services",
        icon: "🏥",
        image: "https://via.placeholder.com/400x300?text=Healthcare",
        isFeatured: true,
        order: 2,
        isActive: true,
      },
      {
        name: "Emergency Relief",
        slug: "emergency-relief",
        nameAr: "Emergency Relief",
        description: "Help during natural disasters and crises",
        descriptionAr: "Help during natural disasters and crises",
        icon: "🚨",
        image: "https://via.placeholder.com/400x300?text=Emergency",
        isFeatured: true,
        order: 3,
        isActive: true,
      },
      {
        name: "Orphan Support",
        slug: "orphan-support",
        nameAr: "Orphan Support",
        description: "Support orphans with education and living expenses",
        descriptionAr: "Support orphans with education and living expenses",
        icon: "👧",
        image: "https://via.placeholder.com/400x300?text=Orphans",
        isFeatured: false,
        order: 4,
        isActive: true,
      },
    ]);

    console.log(`Created ${categories.length} categories`);

    await Case.create([
  {
    user_id: adminUser._id,
    category: categories[0]._id,
    title: "Build a School in Rural Area",
    titleAr: "Build a School in Rural Area",
    description: "Help us build a school for 500 children in a remote village",
    descriptionAr: "Help us build a school for 500 children in a remote village",
    goalAmount: 50000,
    currentAmount: 25000,
    image: "https://via.placeholder.com/600x400?text=School",
    gallery: [],
    location: { city: "Remote Village", country: "Country" },
    urgency: "high",
    status: "active",
    isFeatured: true,
    endDate: new Date("2026-12-31"),
  },
  {
    user_id: adminUser._id,
    category: categories[1]._id,
    title: "Medical Equipment for Hospital",
    titleAr: "Medical Equipment for Hospital",
    description: "Provide essential medical equipment to local hospital",
    descriptionAr: "Provide essential medical equipment to local hospital",
    goalAmount: 30000,
    currentAmount: 15000,
    image: "https://via.placeholder.com/600x400?text=Medical",
    gallery: [],
    location: { city: "Central Hospital", country: "Country" },
    urgency: "critical",
    status: "active",
    isFeatured: true,
    endDate: new Date("2026-10-31"),
  },
  {
    user_id: adminUser._id,
    category: categories[2]._id,
    title: "Emergency Flood Relief",
    titleAr: "Emergency Flood Relief",
    description: "Provide emergency shelter, food, and medicine to flood victims",
    descriptionAr: "Provide emergency shelter, food, and medicine to flood victims",
    goalAmount: 100000,
    currentAmount: 75000,
    image: "https://via.placeholder.com/600x400?text=Flood",
    gallery: [],
    location: { city: "Flood Zone", country: "Country" },
    urgency: "critical",
    status: "active",
    isFeatured: true,
    endDate: new Date("2026-08-31"),
  },
  {
    user_id: adminUser._id,
    category: categories[3]._id,
    title: "Monthly Support for Orphans",
    titleAr: "Monthly Support for Orphans",
    description: "Provide monthly stipend for education and living expenses",
    descriptionAr: "Provide monthly stipend for education and living expenses",
    goalAmount: 60000,
    currentAmount: 10000,
    image: "https://via.placeholder.com/600x400?text=Orphans",
    gallery: [],
    location: { city: "Various Cities", country: "Country" },
    urgency: "medium",
    status: "active",
    isFeatured: false,
    endDate: new Date("2027-01-31"),
  },
]);

    console.log("Created cases");
    console.log("Database seeded successfully!");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();