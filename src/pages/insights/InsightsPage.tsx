import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from '../../app/i18n/locale-context'
import { PageHeader } from '../../components/ui/PageHeader'
import { Chip } from '../../components/ui/Chip'
import { calculateBmi, classifyBmi, todayLocalDate } from '../../domain'
import { addDays } from '../../domain/cycle/localDate'
import { useData } from '../../features/data/data-context'
import { cycleStatsFor, insightsForDate } from '../../features/cycle/selectors'
import { formatLocalDateDisplay } from '../../lib/dates'
import type { TranslationKey } from '../../app/i18n/dictionary'

type RangeKey = '1m' | '3m' | '6m' | '1y' | 'all'

const ranges: RangeKey[] = ['1m', '3m', '6m', '1y', 'all']

function rangeStart(range: RangeKey, today: ReturnType<typeof todayLocalDate>) {
  if (range === 'all') {
    return null
  }
  const days = { '1m': 30, '3m': 90, '6m': 180, '1y': 365 }[range]
  return addDays(today, -days)
}

export function InsightsPage() {
  const { t, locale } = useTranslation()
  const { records, profile, settings } = useData()
  const today = todayLocalDate()
  const stats = cycleStatsFor(records)
  const [range, setRange] = useState<RangeKey>('3m')
  const start = rangeStart(range, today)
  const weights = records.weight.filter(
    (entry) => start === null || entry.date >= start,
  )
  const chartData = weights.map((entry) => ({
    date: formatLocalDateDisplay(entry.date, locale, {
      month: 'short',
      day: 'numeric',
    }),
    weightKg: entry.weightKg,
  }))
  const latestWeight = [...records.weight].sort((left, right) =>
    left.date.localeCompare(right.date),
  )[records.weight.length - 1]
  const bmi =
    latestWeight === undefined || profile?.heightCm === undefined
      ? null
      : calculateBmi({
          heightCm: profile.heightCm,
          weightKg: latestWeight.weightKg,
        })
  const bmiClass = classifyBmi(bmi)
  const heatmapDays = Array.from({ length: 28 }, (_, index) => index + 1)
  const heatmapSymptoms = [
    ...new Set(records.symptoms.map((entry) => entry.symptom)),
  ]
  const confidenceKey =
    `confidence.${stats.confidence}` satisfies TranslationKey
  const empty =
    records.cycles.length === 0 &&
    records.symptoms.length === 0 &&
    records.weight.length === 0

  return (
    <section className="animate-reveal space-y-8">
      <PageHeader title={t('page.insights')} />
      {empty ? (
        <p className="text-lg text-muted">{t('insights.empty')}</p>
      ) : null}

      <section className="rounded-3xl bg-surface p-6">
        <h2 className="font-editorial text-2xl">{t('insights.stats')}</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">
              {t('insights.averageLength')}
            </dt>
            <dd className="text-xl">
              {stats.estimatedLength === null
                ? '—'
                : `${String(stats.estimatedLength)} ${t('unit.days')}`}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t('insights.variability')}</dt>
            <dd className="text-xl">{stats.variability ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t('insights.shortest')}</dt>
            <dd className="text-xl">
              {stats.shortest === null
                ? '—'
                : `${String(stats.shortest)} ${t('unit.days')}`}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t('insights.longest')}</dt>
            <dd className="text-xl">
              {stats.longest === null
                ? '—'
                : `${String(stats.longest)} ${t('unit.days')}`}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t('insights.confidence')}</dt>
            <dd className="text-xl">{t(confidenceKey)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-3xl bg-surface p-6">
        <h2 className="font-editorial text-2xl">{t('insights.heatmap')}</h2>
        {heatmapSymptoms.length === 0 ? (
          <p className="mt-3 text-muted">{t('insights.emptyHeatmap')}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="pr-3 font-medium">{t('quickAdd.symptoms')}</th>
                  {heatmapDays.map((day) => (
                    <th className="px-1 font-medium" key={day}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapSymptoms.map((symptom) => (
                  <tr key={symptom}>
                    <th className="py-1 pr-3 font-medium">
                      {t(`symptom.${symptom}`)}
                    </th>
                    {heatmapDays.map((day) => {
                      const severity = Math.max(
                        0,
                        ...records.symptoms
                          .filter((item) => item.symptom === symptom)
                          .filter(
                            (item) =>
                              insightsForDate(records, settings, item.date)
                                .cycleDay === day,
                          )
                          .map((item) => item.severity),
                      )
                      const opacity = severity === 0 ? 0 : 0.2 + severity * 0.2
                      return (
                        <td key={day}>
                          <span
                            className="block size-5 rounded-sm bg-plum"
                            style={{ opacity }}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-surface p-6">
        <h2 className="font-editorial text-2xl">{t('insights.weight')}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {ranges.map((option) => (
            <Chip
              key={option}
              onClick={() => {
                setRange(option)
              }}
              selected={range === option}
            >
              {t(`insights.range.${option}`)}
            </Chip>
          ))}
        </div>
        {chartData.length === 0 ? (
          <p className="mt-4 text-muted">{t('insights.emptyWeight')}</p>
        ) : (
          <div className="mt-6 h-56">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="4 4" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  dataKey="weightKg"
                  dot={false}
                  stroke="var(--plum)"
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {latestWeight === undefined ? null : (
          <p className="mt-4">
            {latestWeight.weightKg} {t('unit.kg')}
          </p>
        )}
        {bmi === null || bmiClass === null ? null : (
          <p className="mt-4 text-sm leading-6 text-muted">
            {t('insights.bmi')}: {bmi} — {t(`bmi.${bmiClass}`)}.{' '}
            {t('bmi.disclaimer')}
          </p>
        )}
      </section>
    </section>
  )
}
