const cron = require('node-cron');
const User = require('../models/User');

/**
 * Runs on May 1st every year at midnight.
 * Promotes every active B.Tech student up one year.
 * Students who were in 4th year become Alumni.
 *
 * Execution order matters:
 *   1. First promote all 1st/2nd/3rd year students → ensures 4th-years are not
 *      incremented to 5 before the alumni sweep in step 2.
 *   2. Then mark all students now with year > 4 as alumni.
 */
const startYearPromotionCron = () => {
  // '0 0 1 5 *' = 00:00 on May 1st every year
  cron.schedule('0 0 1 5 *', async () => {
    console.log('[CRON] Running annual year promotion — May 1st');
    try {
      // Step 1: Promote active students in years 1, 2, 3 → increment by 1
      const promotedResult = await User.updateMany(
        { role: 'student', status: 'active', year: { $in: [1, 2, 3] } },
        { $inc: { year: 1 } }
      );
      console.log(`[CRON] Promoted ${promotedResult.modifiedCount} students to next year.`);

      // Step 2: Move 4th-year students to Alumni
      const alumniResult = await User.updateMany(
        { role: 'student', status: 'active', year: 4 },
        { $set: { status: 'alumni' } }
      );
      console.log(`[CRON] Graduated ${alumniResult.modifiedCount} students to Alumni.`);
    } catch (err) {
      console.error('[CRON] Year promotion error:', err);
    }
  }, {
    timezone: 'Asia/Kolkata', // Run at midnight IST
  });

  console.log('[CRON] Year promotion cron registered (fires May 1st midnight IST)');
};

module.exports = { startYearPromotionCron };
