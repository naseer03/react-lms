require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const logger = require('./logger');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('Connected to MongoDB for seeding...');

  // Clear existing
  await Promise.all([
    User.deleteMany({}),
    Course.deleteMany({}),
    Module.deleteMany({}),
    Lesson.deleteMany({}),
  ]);

  // Admin
  const admin = await User.create({
    name: 'Super Admin',
    email: 'admin@lms.com',
    mobile: '9999999999',
    password: 'Admin@1234',
    role: 'admin',
    status: 'active',
  });
  logger.info('Admin: admin@lms.com / Admin@1234');

  // Courses — use create() so pre('save') slug hook fires
  const course1 = await Course.create({
    title: 'Full Stack Web Development',
    description: 'Learn MERN stack from scratch to production deployment.',
    instructor: 'John Doe',
    level: 'intermediate',
    status: 'published',
    category: 'Web Development',
    tags: ['react', 'node', 'mongodb'],
    createdBy: admin._id,
  });
  const course2 = await Course.create({
    title: 'Python for Data Science',
    description: 'Master Python, Pandas, NumPy, and ML fundamentals.',
    instructor: 'Jane Smith',
    level: 'beginner',
    status: 'published',
    category: 'Data Science',
    tags: ['python', 'data-science'],
    createdBy: admin._id,
  });
  const course3 = await Course.create({
    title: 'DevOps & Cloud Engineering',
    description: 'Docker, Kubernetes, CI/CD, AWS fundamentals.',
    instructor: 'Mike Johnson',
    level: 'advanced',
    status: 'draft',
    category: 'DevOps',
    tags: ['docker', 'kubernetes', 'aws'],
    createdBy: admin._id,
  });
  logger.info('3 courses created');

  // Modules + Lessons for course1
  const mod1 = await Module.create({ course: course1._id, title: 'Introduction to MERN', order: 0, isPublished: true });
  const mod2 = await Module.create({ course: course1._id, title: 'React Fundamentals', order: 1, isPublished: true });

  await Lesson.insertMany([
    { module: mod1._id, course: course1._id, title: 'Course Overview', type: 'text', order: 0, isPublished: true, content: 'Welcome to the Full Stack Web Development course!' },
    { module: mod1._id, course: course1._id, title: 'Environment Setup', type: 'text', order: 1, isPublished: true, content: 'Install Node.js, MongoDB, and VS Code.' },
    { module: mod2._id, course: course1._id, title: 'React Components', type: 'video', order: 0, isPublished: true },
    { module: mod2._id, course: course1._id, title: 'State & Props', type: 'video', order: 1, isPublished: true },
    { module: mod2._id, course: course1._id, title: 'React Hooks Guide', type: 'pdf', order: 2, isPublished: true },
  ]);
  logger.info('Modules and lessons created for course1');

  // Students
  const studentData = [
    { name: 'Alice Kumar', email: 'alice@student.com', mobile: '9876543210' },
    { name: 'Bob Singh', email: 'bob@student.com', mobile: '9876543211' },
    { name: 'Carol Sharma', email: 'carol@student.com', mobile: '9876543212' },
  ];

  for (const s of studentData) {
    await User.create({
      ...s,
      password: 'Student@1234',
      role: 'student',
      status: 'active',
      mustChangePassword: true,
      enrolledCourses: [{ course: course1._id }, { course: course2._id }],
      createdBy: admin._id,
    });
    logger.info(`Student: ${s.email} / Student@1234`);
  }

  await Course.updateMany({ _id: { $in: [course1._id, course2._id] } }, { $inc: { enrolledCount: 3 } });

  logger.info('✅ Seed complete!');
  await mongoose.disconnect();
};

seed().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});
