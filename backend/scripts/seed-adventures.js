// Creates (or refreshes) the adventure catalogue the app lists on its adventure screen.
//
//   cd backend && npm run seed:adventures
//
// Safe to run repeatedly: entries are matched by `slug`, so nothing is duplicated and
// other adventure documents are left alone. It writes to the database named in MONGO_URI.
require("dotenv").config();
const mongoose = require("mongoose");
const Adventure = require("../src/models/Adventure");

const CATALOGUE = [
  {
    slug: "eq1",
    title: "EarthQuest Adventure 1",
    subtitle: "Hudson River Climate Adapt",
    unlocked: true,
    order: 1,
  },
  { slug: "eq2", title: "EarthQuest Adventure 2", subtitle: "Coming Soon", unlocked: false, order: 2 },
  { slug: "eq3", title: "EarthQuest Adventure 3", subtitle: "Coming Soon", unlocked: false, order: 3 },
];

(async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set (backend/.env)");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to database "${mongoose.connection.name}"`);

  for (const entry of CATALOGUE) {
    const existing = await Adventure.findOne({ slug: entry.slug });

    if (existing) {
      Object.assign(existing, entry, { isPublished: true });
      await existing.save();
      console.log(`  updated  ${entry.slug}  ${entry.title}`);
    } else {
      await Adventure.create({ ...entry, isPublished: true });
      console.log(`  created  ${entry.slug}  ${entry.title}`);
    }
  }

  await mongoose.disconnect();
  console.log("Done.");
})().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
