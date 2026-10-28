import { Hono } from 'hono'
import {
  addDays,
  birthdayBetween,
  birthdayKeys,
  daysInMonth,
  parseAnalyticsPeriod,
  weekOf,
} from '../../shared/analytics'
import { witaToday } from '../../shared/dates'
import {
  CATEGORICAL_GROUPS,
  FINANCE_TYPES,
  WORSHIP_CATEGORIES,
  type AnalyticsAttendanceStat,
  type AnalyticsAttendanceWeek,
  type AnalyticsBirthday,
  type AnalyticsDashboard,
  type AnalyticsFund,
  type AnalyticsRayon,
  type AnalyticsSundayAttendance,
  type CategoricalGroup,
  type FinanceType,
  type Gender,
  type UserRole,
  type WorshipCategory,
} from '../../shared/types'
import { invalid } from '../lib/request'
import { requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

// Dashboard Eksekutif & Analitik (PRD Fase 3): satu permintaan yang mengagregasi
// demografi jemaat, ulang tahun, arus kas, dan kehadiran ibadah langsung dari D1.
// Semua pengurus dapat membaca angka agregat. Daftar ulang tahun (nama dan tanggal
// lahir) hanya untuk peran yang boleh membaca data jemaat; Bendahara menerima null.
//
// GET /dashboard query opsional: year (tahun anggaran), month_from, month_to (1–12).
// Filter ini berlaku untuk keuangan dan kehadiran; demografi, ulang tahun, dan
// ringkasan selalu keadaan hari ini (WITA). Lihat src/shared/analytics.ts.
//
// Hitungan jemaat memakai anggota berstatus ACTIVE; KK dihitung bila masih punya
// anggota aktif. Minggu dihitung Minggu s.d. Sabtu.
const analytics = new Hono<AppEnv>()

analytics.use(requireRole('ADMIN', 'TREASURER', 'PASTOR', 'ELDER'))

const BIRTHDAY_READERS: UserRole[] = ['ADMIN', 'PASTOR', 'ELDER']

type CompositionRow = {
  members: number
  men: number
  women: number
  baptized: number
  confirmed: number
  married: number
  unassigned: number
} & Record<CategoricalGroup, number>

type BirthdayRow = Omit<AnalyticsBirthday, 'birthday' | 'age'>

const BIRTHDAY_SELECT = `
  SELECT m.id AS member_id, m.family_id, m.full_name, m.gender, m.birth_date,
         f.rayon_id, r.name AS rayon_name
  FROM members m
  JOIN families f ON f.id = m.family_id
  JOIN rayons r ON r.id = f.rayon_id
  WHERE m.status = 'ACTIVE' AND m.birth_date IS NOT NULL`

analytics.get('/dashboard', async (c) => {
  const today = witaToday()
  const { period, details } = parseAnalyticsPeriod(c.req.query(), today)
  if (!period) return invalid(c, 'Filter dashboard tidak valid.', details)

  const db = c.env.DB
  const withBirthdays = BIRTHDAY_READERS.includes(c.get('user').role)
  const week = weekOf(today)
  const month = today.slice(0, 7)
  const lastOfMonth = daysInMonth(Number(today.slice(0, 4)), Number(today.slice(5, 7)))
  const monthEnd = `${month}-${String(lastOfMonth).padStart(2, '0')}`
  const categoricalSums = CATEGORICAL_GROUPS.map(
    (group) => `COALESCE(SUM(categorical_group = '${group}'), 0) AS ${group}`,
  ).join(', ')

  const [
    rayonRows,
    composition,
    cash,
    sundays,
    weekBirthdays,
    monthBirthdays,
    cashMonths,
    funds,
    targets,
    realized,
    attendanceRows,
  ] = await db.batch([
    db.prepare(
      `SELECT r.id AS rayon_id, r.name AS rayon_name,
              COUNT(DISTINCT m.family_id) AS families, COUNT(m.id) AS members,
              COALESCE(SUM(m.gender = 'MALE'), 0) AS men,
              COALESCE(SUM(m.gender = 'FEMALE'), 0) AS women
       FROM rayons r
       LEFT JOIN families f ON f.rayon_id = r.id
       LEFT JOIN members m ON m.family_id = f.id AND m.status = 'ACTIVE'
       GROUP BY r.id
       ORDER BY r.id`,
    ),
    db.prepare(
      `SELECT COUNT(*) AS members,
              COALESCE(SUM(gender = 'MALE'), 0) AS men,
              COALESCE(SUM(gender = 'FEMALE'), 0) AS women,
              ${categoricalSums},
              COALESCE(SUM(categorical_group IS NULL), 0) AS unassigned,
              COALESCE(SUM(baptism_status = 1), 0) AS baptized,
              COALESCE(SUM(sidi_status = 1), 0) AS confirmed,
              COALESCE(SUM(marriage_status = 'MARRIED'), 0) AS married
       FROM members WHERE status = 'ACTIVE'`,
    ),
    db.prepare('SELECT COALESCE(SUM(current_balance), 0) AS balance FROM finance_funds'),
    db
      .prepare(
        `SELECT worship_date, COUNT(*) AS services,
                COALESCE(SUM(attendance_men), 0) AS men,
                COALESCE(SUM(attendance_women), 0) AS women,
                COALESCE(SUM(attendance_youth_children), 0) AS youth_children,
                SUM(attendance_total) AS total
         FROM worship_schedules
         WHERE category = 'SUNDAY_SERVICE' AND attendance_total IS NOT NULL
           AND worship_date <= ?1
         GROUP BY worship_date
         ORDER BY worship_date DESC
         LIMIT 2`,
      )
      .bind(today),
    // Disaring kasar per MM-DD; tanggal ulang tahun dan usia dihitung di bawah.
    db
      .prepare(
        `${BIRTHDAY_SELECT}
           AND strftime('%m-%d', m.birth_date) IN (SELECT value FROM json_each(?1))`,
      )
      .bind(JSON.stringify(withBirthdays ? birthdayKeys(week.from, week.to) : [])),
    db
      .prepare(`${BIRTHDAY_SELECT} AND strftime('%m', m.birth_date) = ?1 AND ?2`)
      .bind(month.slice(5), withBirthdays ? 1 : 0),
    db
      .prepare(
        `SELECT strftime('%Y-%m', transaction_date) AS month,
                COALESCE(SUM(CASE type WHEN 'INCOME' THEN amount END), 0) AS income,
                COALESCE(SUM(CASE type WHEN 'EXPENSE' THEN amount END), 0) AS expense
         FROM finance_transactions
         WHERE transaction_date BETWEEN ?1 AND ?2
         GROUP BY month`,
      )
      .bind(period.from, period.to),
    // Saldo akhir periode dari transaksi, sehingga tahun lampau tetap benar.
    db
      .prepare(
        `SELECT f.id AS fund_id, f.code, f.name, f.is_active,
                COALESCE(SUM(CASE WHEN t.transaction_date <= ?2 THEN
                  CASE t.type WHEN 'INCOME' THEN t.amount ELSE -t.amount END END), 0) AS balance,
                COALESCE(SUM(CASE WHEN t.transaction_date BETWEEN ?1 AND ?2
                  AND t.type = 'INCOME' THEN t.amount END), 0) AS income,
                COALESCE(SUM(CASE WHEN t.transaction_date BETWEEN ?1 AND ?2
                  AND t.type = 'EXPENSE' THEN t.amount END), 0) AS expense
         FROM finance_funds f
         LEFT JOIN finance_transactions t ON t.fund_id = f.id
         GROUP BY f.id
         ORDER BY f.is_active DESC, f.code`,
      )
      .bind(period.from, period.to),
    db
      .prepare(
        `SELECT type, SUM(target_amount) AS amount FROM finance_budgets
         WHERE fiscal_year = ?1 GROUP BY type`,
      )
      .bind(period.year),
    db
      .prepare(
        `SELECT b.type, SUM(t.amount) AS amount
         FROM finance_transactions t
         JOIN finance_budgets b ON b.id = t.budget_id
         WHERE b.fiscal_year = ?1 AND t.transaction_date BETWEEN ?2 AND ?3
         GROUP BY b.type`,
      )
      .bind(period.year, period.from, period.to),
    // Minggu dimulai hari Minggu: tanggal Minggu pada atau sebelum tanggal ibadah.
    db
      .prepare(
        `SELECT date(worship_date, '-6 days', 'weekday 0') AS week_start, category,
                COUNT(*) AS services, SUM(attendance_total) AS total
         FROM worship_schedules
         WHERE attendance_total IS NOT NULL AND worship_date BETWEEN ?1 AND ?2
         GROUP BY week_start, category`,
      )
      .bind(period.from, period.to),
  ])

  const byRayon = rayonRows.results as AnalyticsRayon[]
  const people = composition.results[0] as CompositionRow
  const sundayList = sundays.results as AnalyticsSundayAttendance[]

  // Arus kas per bulan, termasuk bulan tanpa transaksi.
  const cashByMonth = new Map(
    (cashMonths.results as { month: string; income: number; expense: number }[]).map((row) => [
      row.month,
      row,
    ]),
  )
  const months = []
  for (let m = period.month_from; m <= period.month_to; m++) {
    const key = `${period.year}-${String(m).padStart(2, '0')}`
    const row = cashByMonth.get(key)
    months.push({ month: key, income: row?.income ?? 0, expense: row?.expense ?? 0 })
  }

  // Pos Kas nonaktif hanya tampil bila masih bersaldo atau ada transaksi di periode.
  const fundList = (funds.results as (Omit<AnalyticsFund, 'is_active'> & { is_active: number })[])
    .filter((fund) => fund.is_active || fund.balance !== 0 || fund.income || fund.expense)
    .map((fund) => ({ ...fund, is_active: fund.is_active === 1 }))

  const amountByType = (rows: unknown[]) =>
    new Map((rows as { type: FinanceType; amount: number }[]).map((row) => [row.type, row.amount]))
  const targetByType = amountByType(targets.results)
  const realizedByType = amountByType(realized.results)

  // Kehadiran per minggu dan per jenis ibadah.
  const empty = (): AnalyticsAttendanceStat => ({ services: 0, total: 0, average: null })
  const emptyCategories = () =>
    Object.fromEntries(WORSHIP_CATEGORIES.map((category) => [category, empty()])) as Record<
      WorshipCategory,
      AnalyticsAttendanceStat
    >
  const weeks = new Map<string, AnalyticsAttendanceWeek>()
  const lastDay = period.to < today ? period.to : today
  for (let start = weekOf(period.from).from; start <= lastDay; start = addDays(start, 7)) {
    weeks.set(start, {
      week_start: start,
      week_end: addDays(start, 6),
      all: empty(),
      by_category: emptyCategories(),
    })
  }
  const overall = empty()
  const overallByCategory = emptyCategories()
  for (const row of attendanceRows.results as {
    week_start: string
    category: WorshipCategory
    services: number
    total: number
  }[]) {
    const target = weeks.get(row.week_start)
    for (const stat of [
      target?.all,
      target?.by_category[row.category],
      overall,
      overallByCategory[row.category],
    ]) {
      if (!stat) continue
      stat.services += row.services
      stat.total += row.total
    }
  }
  const stats = [overall, ...Object.values(overallByCategory)]
  for (const item of weeks.values()) stats.push(item.all, ...Object.values(item.by_category))
  for (const stat of stats) {
    stat.average = stat.services > 0 ? Math.round(stat.total / stat.services) : null
  }

  const income = months.reduce((sum, row) => sum + row.income, 0)
  const expense = months.reduce((sum, row) => sum + row.expense, 0)

  return c.json<AnalyticsDashboard>({
    today,
    period,
    summary: {
      members: people.members,
      families: byRayon.reduce((sum, rayon) => sum + rayon.families, 0),
      cash_balance: (cash.results[0] as { balance: number }).balance,
      last_sunday: sundayList[0] ?? null,
      previous_sunday: sundayList[1] ?? null,
    },
    demographics: {
      by_rayon: byRayon,
      by_gender: { MALE: people.men, FEMALE: people.women },
      by_categorical: {
        ...(Object.fromEntries(CATEGORICAL_GROUPS.map((group) => [group, people[group]])) as Record<
          CategoricalGroup,
          number
        >),
        unassigned: people.unassigned,
      },
      sacraments: {
        members: people.members,
        baptized: people.baptized,
        confirmed: people.confirmed,
        married: people.married,
        baptized_percent: percent(people.baptized, people.members) ?? 0,
        confirmed_percent: percent(people.confirmed, people.members) ?? 0,
      },
    },
    birthdays: withBirthdays
      ? {
          week: {
            ...week,
            members: birthdays(weekBirthdays.results as BirthdayRow[], week.from, week.to),
          },
          month: {
            month,
            members: birthdays(monthBirthdays.results as BirthdayRow[], `${month}-01`, monthEnd),
          },
        }
      : null,
    finance: {
      months,
      income,
      expense,
      closing_balance: fundList.reduce((sum, fund) => sum + fund.balance, 0),
      funds: fundList,
      budget: FINANCE_TYPES.map((type) => {
        const target = targetByType.get(type) ?? 0
        const done = realizedByType.get(type) ?? 0
        return { type, target, realized: done, percent: percent(done, target) }
      }),
    },
    attendance: {
      weeks: [...weeks.values()],
      all: overall,
      by_category: overallByCategory,
    },
  })
})

// Ulang tahun pada rentang tanggal, urut tanggal lalu nama.
function birthdays(rows: BirthdayRow[], from: string, to: string): AnalyticsBirthday[] {
  const list: AnalyticsBirthday[] = []
  for (const row of rows) {
    const hit = birthdayBetween(row.birth_date, from, to)
    if (hit) list.push({ ...row, gender: row.gender as Gender, ...hit })
  }
  return list.sort(
    (a, b) => a.birthday.localeCompare(b.birthday) || a.full_name.localeCompare(b.full_name, 'id'),
  )
}

// Persen satu desimal, null bila pembagi 0.
function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null
}

export default analytics
