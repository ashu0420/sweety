import { query } from '../config/db.js';
import { getTodayDateString, getReportDateRanges } from '../utils/validators.js';

async function fetchStatsForRange(userId, startDate, endDate) {
    const result = await query(
        `SELECT
       COUNT(*)::int AS count,
       MAX(value) AS highest,
       MIN(value) AS lowest,
       ROUND(AVG(value), 1)::float AS average
     FROM readings
     WHERE user_id = $1
       AND reading_date >= $2
       AND reading_date <= $3`,
        [userId, startDate, endDate]
    );

    return {
        startDate,
        endDate,
        ...result.rows[0],
    };
}

// GET /api/reports?date=YYYY-MM-DD
export const getReports = async (req, res) => {
    try {
        const userId = req.user.id;
        const selectedDate = req.query.date || getTodayDateString();

        if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
            return res.status(400).json({ error: 'Please provide a valid date (YYYY-MM-DD).' });
        }

        const ranges = getReportDateRanges(selectedDate);

        // Run all 3 report aggregations + the daily readings list in parallel
        const [dailyStats, mtdStats, prevMonthStats, dailyReadingsResult] = await Promise.all([
            fetchStatsForRange(userId, ranges.daily.startDate, ranges.daily.endDate),
            fetchStatsForRange(userId, ranges.monthToDate.startDate, ranges.monthToDate.endDate),
            fetchStatsForRange(userId, ranges.previousMonth.startDate, ranges.previousMonth.endDate),
            query(
                `SELECT id, reading_date, slot, value
         FROM readings
         WHERE user_id = $1 AND reading_date = $2
         ORDER BY CASE slot
           WHEN 'Morning (fasting)' THEN 1
           WHEN 'After breakfast' THEN 2
           WHEN 'After lunch' THEN 3
           WHEN 'After dinner' THEN 4
           ELSE 5
         END`,
                [userId, selectedDate]
            ),
        ]);

        return res.status(200).json({
            selectedDate,
            daily: {
                ...dailyStats,
                readings: dailyReadingsResult.rows,
            },
            monthToDate: mtdStats,
            previousMonth: prevMonthStats,
        });
    } catch (error) {
        console.error('Get reports error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};