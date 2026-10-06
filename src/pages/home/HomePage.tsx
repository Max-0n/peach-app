import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../../app/i18n/locale-context'
import { CycleRing } from '../../components/cycle/CycleRing'
import { Button } from '../../components/ui/Button'
import { PeriodRangeSheet } from '../../features/quick-add/PeriodRangeSheet'
import { dictionary, type TranslationKey } from '../../app/i18n/dictionary'
import { useData } from '../../features/data/data-context'
import {
  daysUntilNextPeriod,
  recommendationsForToday,
  redFlagsForToday,
  todayInsights,
} from '../../features/cycle/selectors'
import { formatLocalDateDisplay } from '../../lib/dates'
import { todayLocalDate } from '../../domain'

function asKey(key: string): TranslationKey | null {
  return Object.hasOwn(dictionary.en, key) ? (key as TranslationKey) : null
}

export function HomePage() {
  const { t, locale } = useTranslation()
  const { records, settings, profile } = useData()
  const [periodOpen, setPeriodOpen] = useState(false)
  const today = todayLocalDate()
  const insights = todayInsights(records, settings, today)
  const countdown = daysUntilNextPeriod(insights, today)
  const recommendations = recommendationsForToday(
    records,
    profile,
    insights,
    today,
  ).slice(0, 3)
  const redFlags = redFlagsForToday(records, profile, today)
  const empty = records.cycles.length === 0
  const latestMood = records.mood.find((entry) => entry.date === today)
  const phaseKey = asKey(`phase.${insights.phase}`)
  const length =
    insights.estimatedCycleLength ?? settings?.averageCycleLength ?? 28

  return (
    <section className="animate-reveal space-y-8">
      <header>
        <h1 className="font-editorial text-3xl tracking-tight text-balance sm:text-4xl">
          {t('home.greeting')}
        </h1>
        <p className="mt-2 text-muted">
          {formatLocalDateDisplay(today, locale)}
        </p>
      </header>

      {empty ? (
        <div className="rounded-3xl bg-surface p-6 shadow-soft">
          <h2 className="font-editorial text-2xl">{t('home.empty.title')}</h2>
          <p className="mt-3 leading-7 text-muted">{t('home.empty.body')}</p>
          <Button
            className="mt-5"
            onClick={() => {
              setPeriodOpen(true)
            }}
          >
            {t('home.empty.cta')}
          </Button>
        </div>
      ) : (
        <div className="rounded-3xl bg-surface p-6 shadow-soft">
          <CycleRing
            caption={t('home.cycleDay')}
            day={insights.cycleDay}
            label={phaseKey === null ? t('phase.unknown') : t(phaseKey)}
            length={length}
          />
          <p className="mt-2 text-center text-lg">
            {phaseKey === null ? t('phase.unknown') : t(phaseKey)}
          </p>
          <p className="mt-2 text-center text-muted">
            {t('home.nextPeriod')}:{' '}
            {countdown === null
              ? t('phase.unknown')
              : countdown < 0
                ? t('home.late')
                : countdown === 0
                  ? t('home.dueToday')
                  : t('home.daysUntil', { days: String(countdown) })}
          </p>
          <Button
            className="mt-5"
            onClick={() => {
              setPeriodOpen(true)
            }}
          >
            {t('home.empty.cta')}
          </Button>
        </div>
      )}

      {redFlags.hasRedFlags ? (
        <aside className="rounded-3xl border border-plum/40 bg-surface p-6">
          <h2 className="font-editorial text-2xl">{t('redFlag.title')}</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {redFlags.reasons.map((reason) => {
              const key = asKey(`redFlag.${reason}`)
              return <li key={reason}>{key === null ? reason : t(key)}</li>
            })}
          </ul>
          <p className="mt-4 text-sm leading-6 text-muted">
            {t('medicalSafety.seekPromptCare')}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {t('medicalSafety.disclaimer')}
          </p>
        </aside>
      ) : null}

      <section className="rounded-3xl bg-surface p-6">
        <h2 className="font-editorial text-2xl">{t('home.wellbeing')}</h2>
        {latestMood === undefined ? (
          <p className="mt-3 text-muted">{t('calendar.emptyDay')}</p>
        ) : (
          <p className="mt-3 text-lg">
            {t(`mood.${latestMood.mood}`)}
            {latestMood.energy === undefined
              ? ''
              : ` · ${t('quickAdd.energy')} ${String(latestMood.energy)}`}
          </p>
        )}
      </section>

      <section className="rounded-3xl bg-surface p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-editorial text-2xl">
            {t('home.recommendations')}
          </h2>
          <Link className="text-sm font-medium text-plum" to="/recommendations">
            {t('nav.recommendations')}
          </Link>
        </div>
        <ul className="mt-4 space-y-3">
          {recommendations.map((item) => {
            const titleKey = asKey(item.titleKey)
            const bodyKey = asKey(item.bodyKey)
            return (
              <li key={item.id}>
                <p className="font-medium">
                  {titleKey === null ? item.id : t(titleKey)}
                </p>
                <p className="text-sm leading-6 text-muted">
                  {bodyKey === null ? item.bodyText : t(bodyKey)}
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      <p className="text-sm leading-6 text-muted">{t('home.disclaimer')}</p>
      {periodOpen ? (
        <PeriodRangeSheet
          onClose={() => {
            setPeriodOpen(false)
          }}
        />
      ) : null}
    </section>
  )
}
