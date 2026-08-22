/**
 * Domain configuration for RGUKT Exam Portal.
 * Organized by category. Used at signup, exam creation, and profile editing.
 */

const DOMAIN_CATEGORIES = [
  {
    category: 'Software',
    description: 'Software engineering and computer science domains',
    domains: [
      'Web Development',
      'App Development (Mobile)',
      'AI / ML',
      'Data Science & Analytics',
      'Cybersecurity',
      'Cloud Computing & DevOps',
      'Blockchain',
      'Game Development',
      'Database Engineering',
      'Competitive Programming',
    ],
  },
  {
    category: 'ECE',
    description: 'Electronics & Communication Engineering domains',
    domains: [
      'VLSI & Chip Design',
      'Embedded Systems',
      'Signal Processing',
      'RF & Wireless Communications',
      'IoT & Sensor Networks',
      'Robotics & Control Systems',
    ],
  },
  {
    category: 'EEE',
    description: 'Electrical & Electronics Engineering domains',
    domains: [
      'Power Systems & Smart Grid',
      'Electric Vehicles & Drives',
      'Control Engineering',
      'Renewable Energy Systems',
      'High Voltage Engineering',
    ],
  },
  {
    category: 'Mechanical',
    description: 'Mechanical Engineering domains',
    domains: [
      'Thermal & Fluid Systems',
      'Manufacturing & Production',
      'Automobile Engineering',
      'CAD/CAM & Product Design',
      'Aerospace Structures',
    ],
  },
  {
    category: 'Civil',
    description: 'Civil Engineering domains',
    domains: [
      'Structural Engineering',
      'Transportation Engineering',
      'Environmental Engineering',
      'Geotechnical Engineering',
      'Water Resources',
    ],
  },
  {
    category: 'MME',
    description: 'Metallurgical & Materials Engineering domains',
    domains: [
      'Materials Characterization',
      'Metallurgy & Alloys',
      'Polymer & Composite Science',
      'Corrosion Engineering',
    ],
  },
  {
    category: 'Cross-Branch',
    description: 'Open to all branches',
    domains: [
      'Research & Academics',
      'Entrepreneurship & Innovation',
    ],
  },
];

/**
 * These category names are always accessible to all branches.
 */
const UNIVERSAL_CATEGORIES = ['Software', 'Cross-Branch'];

/**
 * Maps branch names to their allowed domain categories.
 * Every branch gets Software + Cross-Branch automatically.
 * Core branches additionally get their own specific category.
 */
const BRANCH_CATEGORY_MAP = {
  // Software branches — Software + Cross-Branch only
  CSE:   [...UNIVERSAL_CATEGORIES],
  IT:    [...UNIVERSAL_CATEGORIES],
  AIDS:  [...UNIVERSAL_CATEGORIES],
  AIML:  [...UNIVERSAL_CATEGORIES],
  CSD:   [...UNIVERSAL_CATEGORIES],
  // Core branches — own category + Software + Cross-Branch
  ECE:   ['ECE',        ...UNIVERSAL_CATEGORIES],
  EEE:   ['EEE',        ...UNIVERSAL_CATEGORIES],
  MECH:  ['Mechanical', ...UNIVERSAL_CATEGORIES],
  CIVIL: ['Civil',      ...UNIVERSAL_CATEGORIES],
  MME:   ['MME',        ...UNIVERSAL_CATEGORIES],
  // Others get everything
  OTHER: DOMAIN_CATEGORIES.map(c => c.category),
};

/**
 * Returns the flattened list of all domain strings allowed for a given branch.
 */
const getAllowedDomainsForBranch = (branch) => {
  const allowedCats = BRANCH_CATEGORY_MAP[branch] || DOMAIN_CATEGORIES.map(c => c.category);
  return DOMAIN_CATEGORIES
    .filter(c => allowedCats.includes(c.category))
    .flatMap(c => c.domains);
};

/**
 * Returns the domain categories filtered for a given branch.
 */
const getDomainCategoriesForBranch = (branch) => {
  const allowedCats = BRANCH_CATEGORY_MAP[branch] || DOMAIN_CATEGORIES.map(c => c.category);
  return DOMAIN_CATEGORIES.filter(c => allowedCats.includes(c.category));
};

module.exports = {
  DOMAIN_CATEGORIES,
  UNIVERSAL_CATEGORIES,
  BRANCH_CATEGORY_MAP,
  getAllowedDomainsForBranch,
  getDomainCategoriesForBranch,
};
