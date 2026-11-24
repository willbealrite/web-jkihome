import pool from '../config/database.js'

export async function getCurrentThemes() {
  // Gunakan waktu database dengan zona waktu WIB.
  const periodResult = await pool.query(`
    SELECT
      EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))::INTEGER
        AS year,
      EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))::INTEGER
        AS month
  `)

  const { year, month } = periodResult.rows[0]

  const annualResult = await pool.query(
    `
      SELECT
        id,
        year,
        title,
        description,
        bible_verse,
        published_at
      FROM public.annual_themes
      WHERE year = $1
        AND status = 'PUBLISHED'
      LIMIT 1
    `,
    [year],
  )

  const monthlyResult = await pool.query(
    `
      SELECT
        monthly.id,
        monthly.annual_theme_id,
        monthly.month,
        monthly.title,
        monthly.description,
        monthly.bible_verse,
        monthly.published_at
      FROM public.monthly_themes AS monthly
      INNER JOIN public.annual_themes AS annual
        ON annual.id = monthly.annual_theme_id
      WHERE annual.year = $1
        AND monthly.month = $2
        AND monthly.status = 'PUBLISHED'
        AND annual.status = 'PUBLISHED'
      LIMIT 1
    `,
    [year, month],
  )

  return {
    year,
    annualTheme: annualResult.rows[0] || null,
    month,
    monthlyTheme: monthlyResult.rows[0] || null,
  }
}
