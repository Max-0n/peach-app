import { useMemo, useState } from 'react'
import { useTranslation } from '../../app/i18n/locale-context'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { DayLogSheet } from '../../features/quick-add/DayLogSheet'
import { PeriodRangeSheet } from '../../features/quick-add/PeriodRangeSheet'
import {
  addDays,
  forecastPeriodDays,
  todayLocalDate,
  type Cycle,
  type LocalDate,
  type PregnancyLikelihood,
} from '../../domain'
import { useData } from '../../features/data/data-context'
import type { AppRecords } from '../../features/data/types'
import { insightsForDate, likelihoodForDate } from '../../features/cycle/selectors'
import {
  addCalendarMonths,
  formatLocalDateDisplay,
  monthCells,
  monthTitle,
  weekdayLabels,
} from '../../lib/dates'
import {
  parseLocalDate,
  startOfMonth as monthStart,
} from '../../domain/cycle/localDate'

function dayNumber(date: LocalDate): number {
  return parseLocalDate(date).day
}

function DayContents({
  date,
  period,
  records,
}: {
  date: LocalDate
  period: Cycle | undefined
  records: AppRecords
}) {
  const { t, locale } = useTranslation()
  const flow = records.flow.filter((entry) => entry.date === date)
  const symptoms = records.symptoms.filter((entry) => entry.date === date)
  const mood = records.mood.filter((entry) => entry.date === date)
  const weight = records.weight.filter((entry) => entry.date === date)
  const notes = records.notes.filter((entry) => entry.date === date)
  const activity = records.sexualActivity.filter((entry) => entry.date === date)
  const empty =
    period === undefined &&
    flow.length +
      symptoms.length +
      mood.length +
      weight.length +
      notes.length +
      activity.length ===
      0

  if (empty) {
    return <p className="mt-2 text-sm text-muted">{t('calendar.emptyDay')}</p>
  }

  return (
    <ul className="mt-2 space-y-1 text-sm">
      {period === undefined ? null : (
        <li>
          {t('calendar.legend.period')}:{' '}
          {period.endDate === undefined
            ? formatLocalDateDisplay(period.startDate, locale)
            : `${formatLocalDateDisplay(period.startDate, locale)} — ${formatLocalDateDisplay(period.endDate, locale)}`}
        </li>
      )}
      {flow.map((entry) => (
        <li key={entry.id}>{t(`flow.${entry.flow}`)}</li>
      ))}
      {symptoms.map((entry) => (
        <li key={entry.id}>
          {t(`symptom.${entry.symptom}`)} ({entry.severity})
        </li>
      ))}
      {mood.map((entry) => (
        <li key={entry.id}>{t(`mood.${entry.mood}`)}</li>
      ))}
      {weight.map((entry) => (
        <li key={entry.id}>
          {entry.weightKg} {t('unit.kg')}
        </li>
      ))}
      {notes.map((entry) => (
        <li key={entry.id}>{entry.text}</li>
      ))}
      {activity.map((entry) => (
        <li key={entry.id}>
          {t(`sexualActivity.${entry.activity}`)}
          {entry.protection === undefined
            ? ''
            : ` · ${t(`protection.${entry.protection}`)}`}
        </li>
      ))}
    </ul>
  )
}

const likelihoodDot: Record<PregnancyLikelihood, string> = {
  low: 'bg-muted',
  moderate: 'bg-sage',
  high: 'bg-plum',
  unknown: 'bg-transparent',
}

export function CalendarPage() {
  const { t, locale } = useTranslation()
  const data = useData()
  const { records, settings, profile } = data
  const [periodOpen, setPeriodOpen] = useState(false)
  const [dayAction, setDayAction] = useState<'notes' | 'edit' | null>(null)
  const today = todayLocalDate()
  const weekStartsOn: 0 | 1 = locale === 'ru' ? 1 : 0
  const [month, setMonth] = useState(() => monthStart(today))
  const [selected, setSelected] = useState<LocalDate | null>(null)
  const labels = weekdayLabels(locale, weekStartsOn)
  const cells = useMemo(
    () => monthCells(month, weekStartsOn),
    [month, weekStartsOn],
  )
  const duration = forecastPeriodDays(settings?.averagePeriodDuration ?? 5)

  function layers(date: LocalDate) {
    const insights = insightsForDate(records, settings, date)
    const loggedPeriod = records.cycles.some((cycle) => {
      const end = cycle.endDate ?? addDays(cycle.startDate, duration - 1)
      return date >= cycle.startDate && date <= end
    })
    const predicted =
      !loggedPeriod &&
      insights.nextExpectedPeriod !== null &&
      date >= insights.nextExpectedPeriod &&
      date <= addDays(insights.nextExpectedPeriod, duration - 1)
    const fertile =
      insights.fertileWindow !== null &&
      date >= insights.fertileWindow.start &&
      date <= insights.fertileWindow.end
    const ovulation = insights.estimatedOvulation === date
    const symptom = records.symptoms.some((entry) => entry.date === date)
    const likelihood = likelihoodForDate(records, profile, insights, date)
    return {
      loggedPeriod,
      predicted,
      fertile,
      ovulation,
      symptom,
      cycleDay: insights.cycleDay,
      likelihood: likelihood.category,
    }
  }

  const editedCycle =
    selected === null
      ? undefined
      : records.cycles.find((cycle) => {
          const end = cycle.endDate ?? addDays(cycle.startDate, duration - 1)
          return selected >= cycle.startDate && selected <= end
        })

  return (
    <section className="animate-reveal">
      <PageHeader title={t('page.calendar')} />
      <Button
        className="mb-6"
        onClick={() => {
          setPeriodOpen(true)
        }}
      >
        {t('home.empty.cta')}
      </Button>
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          aria-label={t('calendar.previous')}
          className="grid size-11 place-items-center rounded-full hover:bg-surface"
          onClick={() => {
            setMonth((current) => addCalendarMonths(current, -1))
          }}
          type="button"
        >
          ‹
        </button>
        <h2 className="font-editorial text-2xl">{monthTitle(month, locale)}</h2>
        <button
          aria-label={t('calendar.next')}
          className="grid size-11 place-items-center rounded-full hover:bg-surface"
          onClick={() => {
            setMonth((current) => addCalendarMonths(current, 1))
          }}
          type="button"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
        {labels.map((label) => (
          <div key={label} className="py-2">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (date === null) {
            return <div key={`empty-${String(index)}`} />
          }
          const marks = layers(date)
          return (
            <button
              aria-label={[
                formatLocalDateDisplay(date, locale),
                marks.cycleDay === null
                  ? ''
                  : `${t('home.cycleDay')} ${String(marks.cycleDay)}`,
                marks.likelihood === 'unknown'
                  ? ''
                  : t(`pregnancyLikelihood.${marks.likelihood}`),
              ]
                .filter((part) => part !== '')
                .join(', ')}
              className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border text-sm ${
                date === selected ? 'ring-2 ring-plum ' : ''
              }${
                marks.loggedPeriod
                  ? 'border-plum bg-plum/20'
                  : marks.predicted
                    ? 'border-plum/50 bg-transparent'
                    : marks.ovulation
                      ? 'border-sage bg-sage-soft'
                      : marks.fertile
                        ? 'border-transparent bg-sage-soft/70'
                        : 'border-transparent bg-surface'
              }`}
              data-date={date}
              key={date}
              onClick={() => {
                setSelected(date)
                setDayAction(null)
              }}
              type="button"
              {...(date === today ? { 'aria-current': 'date' as const } : {})}
            >
              <span>{dayNumber(date)}</span>
              <span className="text-[10px] leading-none text-plum">
                {marks.cycleDay ?? ''}
              </span>
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${likelihoodDot[marks.likelihood]}`}
              />
            </button>
          )
        })}
      </div>

      {selected === null ? null : (
        <section
          aria-label={t('calendar.dayDetails')}
          className="mt-4 rounded-3xl border border-line bg-surface px-5 py-4"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-editorial text-xl">
              {formatLocalDateDisplay(selected, locale)}
            </h2>
            <button
              aria-label={t('action.close')}
              className="grid size-11 place-items-center rounded-full text-muted hover:bg-background"
              onClick={() => {
                setSelected(null)
              }}
              type="button"
            >
              ×
            </button>
          </div>
          <DayContents date={selected} period={editedCycle} records={records} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setDayAction('notes')
              }}
              variant="secondary"
            >
              {t('calendar.notes')}
            </Button>
            {editedCycle === undefined ? null : (
              <Button
                onClick={() => {
                  setDayAction('edit')
                }}
                variant="secondary"
              >
                {t('calendar.editPeriod')}
              </Button>
            )}
          </div>
        </section>
      )}

      <ul className="mt-6 space-y-1 text-sm text-muted">
        <li>{t('calendar.legend.period')}</li>
        <li>{t('calendar.legend.predicted')}</li>
        <li>{t('calendar.legend.fertile')}</li>
        <li>{t('calendar.legend.ovulation')}</li>
        <li>{t('calendar.legend.symptom')}</li>
        <li>{t('calendar.legend.cycleDay')}</li>
        <li>{t('pregnancyLikelihood.low')}</li>
        <li>{t('pregnancyLikelihood.moderate')}</li>
        <li>{t('pregnancyLikelihood.high')}</li>
      </ul>
      <p className="mt-4 text-sm leading-6 text-muted">
        {t('pregnancyLikelihood.disclaimer')}
      </p>

      {selected !== null && dayAction === 'notes' ? (
        <DayLogSheet
          date={selected}
          onClose={() => {
            setDayAction(null)
          }}
        />
      ) : null}
      {selected !== null && dayAction === 'edit' ? (
        <PeriodRangeSheet
          editingId={editedCycle?.id ?? null}
          initialEnd={editedCycle?.endDate ?? null}
          initialStart={editedCycle?.startDate ?? selected}
          onClose={() => {
            setDayAction(null)
          }}
        />
      ) : null}
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
