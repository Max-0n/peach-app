import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '../../app/i18n/locale-context'
import { dictionary, type TranslationKey } from '../../app/i18n/dictionary'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import {
  symptomNames,
  type LocalDate,
  type SymptomName,
} from '../../domain'
import { useData } from '../data/data-context'
import { insightsForDate, likelihoodForDate } from '../cycle/selectors'
import { useTelegram } from '../telegram/telegram-context'
import { formatLocalDateDisplay } from '../../lib/dates'
import { dayLogSchema, moodFromScore, type DayLogInput } from './schema'

interface DayLogSheetProps {
  date: LocalDate
  onClose: () => void
}

const flowOptions = ['spotting', 'light', 'medium', 'heavy'] as const
const protectionOptions = [
  'none',
  'condom',
  'contraception',
  'condomAndContraception',
  'unknown',
] as const

function asKey(key: string): TranslationKey | null {
  return Object.hasOwn(dictionary.en, key) ? (key as TranslationKey) : null
}

function Scale({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (value: number) => void
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <Chip
            key={score}
            onClick={() => {
              onChange(score)
            }}
            selected={value === score}
          >
            {score}
          </Chip>
        ))}
      </div>
    </fieldset>
  )
}

export function DayLogSheet({ date, onClose }: DayLogSheetProps) {
  const { t, locale } = useTranslation()
  const telegram = useTelegram()
  const data = useData()
  const insights = insightsForDate(data.records, data.settings, date)
  const likelihood = likelihoodForDate(
    data.records,
    data.profile,
    insights,
    date,
  )
  const phaseKey = asKey(`phase.${insights.phase}`)
  const likelihoodKey = asKey(`pregnancyLikelihood.${likelihood.category}`)
  const existingFlow = data.records.flow.find((entry) => entry.date === date)
  const existingMood = data.records.mood.find((entry) => entry.date === date)
  const existingWeight = data.records.weight.find((entry) => entry.date === date)
  const existingNote = data.records.notes.find((entry) => entry.date === date)
  const existingActivity = data.records.sexualActivity.find(
    (entry) => entry.date === date,
  )
  const [flow, setFlow] = useState<(typeof flowOptions)[number] | null>(
    existingFlow?.flow ?? null,
  )
  const [selectedSymptoms, setSelectedSymptoms] = useState<
    Partial<Record<SymptomName, number>>
  >(() =>
    Object.fromEntries(
      data.records.symptoms
        .filter((entry) => entry.date === date)
        .map((entry) => [entry.symptom, entry.severity]),
    ),
  )
  const [moodScore, setMoodScore] = useState<number | null>(
    existingMood?.moodScore ?? null,
  )
  const [energy, setEnergy] = useState<number | null>(existingMood?.energy ?? null)
  const [sleep, setSleep] = useState<number | null>(existingMood?.sleep ?? null)
  const [stress, setStress] = useState<number | null>(existingMood?.stress ?? null)
  const [weight, setWeight] = useState(
    existingWeight === undefined ? '' : String(existingWeight.weightKg),
  )
  const [note, setNote] = useState(existingNote?.text ?? '')
  const [activity, setActivity] = useState<'intercourse' | 'other' | null>(
    existingActivity?.activity ?? null,
  )
  const [protection, setProtection] = useState<
    (typeof protectionOptions)[number] | null
  >(existingActivity?.protection ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = useCallback(async () => {
    const trimmedNote = note.trim()
    const weightNumber = weight === '' ? Number.NaN : Number(weight)
    const payload: DayLogInput = { date }
    if (flow !== null) {
      payload.flow = flow
    }
    const symptoms = (
      Object.entries(selectedSymptoms) as [SymptomName, number][]
    ).map(([name, severity]) => ({ symptom: name, severity }))
    if (symptoms.length > 0) {
      payload.symptoms = symptoms
    }
    if (moodScore !== null) {
      payload.mood = {
        moodScore,
        ...(energy === null ? {} : { energy }),
        ...(sleep === null ? {} : { sleep }),
        ...(stress === null ? {} : { stress }),
      }
    }
    if (Number.isFinite(weightNumber) && weightNumber > 0) {
      payload.weightKg = weightNumber
    }
    if (trimmedNote.length > 0) {
      payload.note = trimmedNote
    }
    if (activity !== null) {
      payload.sexualActivity = {
        activity,
        ...(protection === null ? {} : { protection }),
      }
    }

    const parsed = dayLogSchema.safeParse(payload)
    if (!parsed.success) {
      setError(t('quickAdd.error.empty'))
      telegram.haptic('warning')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const value = parsed.data
      if (value.flow === undefined) {
        const current = data.records.flow.find((entry) => entry.date === date)
        if (current !== undefined) {
          await data.deleteRecord('flow', current.id)
        }
      } else {
        await data.saveFlow({
          id: `flow:${date}`,
          date,
          flow: value.flow,
        })
      }

      const kept = new Set(
        (value.symptoms ?? []).map((entry) => entry.symptom),
      )
      for (const entry of value.symptoms ?? []) {
        await data.saveSymptom({
          id: `symptom:${date}:${entry.symptom}`,
          date,
          symptom: entry.symptom,
          severity: entry.severity,
        })
      }
      for (const entry of data.records.symptoms.filter(
        (item) => item.date === date && !kept.has(item.symptom),
      )) {
        await data.deleteRecord('symptom', entry.id)
      }

      if (value.mood === undefined) {
        const current = data.records.mood.find((entry) => entry.date === date)
        if (current !== undefined) {
          await data.deleteRecord('mood', current.id)
        }
      } else {
        const mood = moodFromScore[value.mood.moodScore - 1] ?? 'calm'
        await data.saveMood({
          id: `mood:${date}`,
          date,
          mood,
          moodScore: value.mood.moodScore,
          ...(value.mood.energy === undefined
            ? {}
            : { energy: value.mood.energy }),
          ...(value.mood.sleep === undefined ? {} : { sleep: value.mood.sleep }),
          ...(value.mood.stress === undefined
            ? {}
            : { stress: value.mood.stress }),
        })
      }

      if (value.weightKg === undefined) {
        const current = data.records.weight.find((entry) => entry.date === date)
        if (current !== undefined) {
          await data.deleteRecord('weight', current.id)
        }
      } else {
        await data.saveWeight({
          id: `weight:${date}`,
          date,
          weightKg: value.weightKg,
        })
      }

      if (value.note === undefined) {
        const current = data.records.notes.find((entry) => entry.date === date)
        if (current !== undefined) {
          await data.deleteRecord('note', current.id)
        }
      } else {
        await data.saveNote({
          id: `note:${date}`,
          date,
          text: value.note,
        })
      }

      if (value.sexualActivity === undefined) {
        const current = data.records.sexualActivity.find(
          (entry) => entry.date === date,
        )
        if (current !== undefined) {
          await data.deleteRecord('sexualActivity', current.id)
        }
      } else {
        await data.saveSexualActivity({
          id: `sex:${date}`,
          date,
          activity: value.sexualActivity.activity,
          ...(value.sexualActivity.protection === undefined
            ? {}
            : { protection: value.sexualActivity.protection }),
        })
      }

      telegram.haptic('success')
      onClose()
    } catch {
      telegram.haptic('error')
      setError(t('quickAdd.error.empty'))
    } finally {
      setSaving(false)
    }
  }, [
    activity,
    data,
    date,
    energy,
    flow,
    moodScore,
    note,
    onClose,
    protection,
    selectedSymptoms,
    sleep,
    stress,
    t,
    telegram,
    weight,
  ])

  useEffect(() => {
    telegram.backButton.show(onClose)
    telegram.mainButton.show(t('action.save'), () => {
      void submit()
    })
    return () => {
      telegram.backButton.hide()
      telegram.mainButton.hide()
    }
  }, [onClose, submit, t, telegram])

  return (
    <BottomSheet
      footer={
        <Button
          className="w-full"
          disabled={saving}
          onClick={() => void submit()}
        >
          {t('action.save')}
        </Button>
      }
      fullScreen
      onClose={onClose}
      title={t('dayLog.title')}
    >
      <div className="space-y-8">
        <div>
          <p className="text-sm text-muted">
            {formatLocalDateDisplay(date, locale)}
          </p>
          <p className="mt-1">
            {t('home.cycleDay')}: {insights.cycleDay ?? '—'}
            {' · '}
            {phaseKey === null ? t('phase.unknown') : t(phaseKey)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {t('pregnancyLikelihood.title')}:{' '}
            {likelihoodKey === null
              ? t('pregnancyLikelihood.unknown')
              : t(likelihoodKey)}
          </p>
        </div>

        <section className="space-y-3">
          <h3 className="font-editorial text-xl">{t('dayLog.flow')}</h3>
          <div className="flex flex-wrap gap-2">
            {flowOptions.map((option) => (
              <Chip
                key={option}
                onClick={() => {
                  setFlow((current) => (current === option ? null : option))
                }}
                selected={flow === option}
              >
                {t(`flow.${option}`)}
              </Chip>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-editorial text-xl">{t('quickAdd.symptoms')}</h3>
          <div className="flex flex-wrap gap-2">
            {symptomNames.map((name) => {
              const selected = selectedSymptoms[name] !== undefined
              return (
                <Chip
                  key={name}
                  onClick={() => {
                    setSelectedSymptoms((current) => {
                      if (current[name] === undefined) {
                        return { ...current, [name]: 2 }
                      }
                      return Object.fromEntries(
                        Object.entries(current).filter(([key]) => key !== name),
                      )
                    })
                  }}
                  selected={selected}
                >
                  {t(`symptom.${name}`)}
                </Chip>
              )
            })}
          </div>
          {(Object.entries(selectedSymptoms) as [SymptomName, number][]).map(
            ([name, severity]) => (
              <Scale
                key={name}
                label={t('severity.label', { value: String(severity) })}
                onChange={(value) => {
                  setSelectedSymptoms((current) => ({
                    ...current,
                    [name]: Math.min(4, value),
                  }))
                }}
                value={severity}
              />
            ),
          )}
        </section>

        <section className="space-y-4">
          <h3 className="font-editorial text-xl">{t('quickAdd.mood')}</h3>
          <Scale
            label={t('quickAdd.moodScore')}
            onChange={setMoodScore}
            value={moodScore}
          />
          <Scale
            label={t('quickAdd.energy')}
            onChange={setEnergy}
            value={energy}
          />
          <Scale label={t('quickAdd.sleep')} onChange={setSleep} value={sleep} />
          <Scale
            label={t('quickAdd.stress')}
            onChange={setStress}
            value={stress}
          />
        </section>

        <label className="flex flex-col gap-2 text-sm font-medium">
          {t('quickAdd.weight')}
          <input
            className="min-h-11 rounded-2xl border border-line bg-surface px-4"
            inputMode="decimal"
            min="1"
            onChange={(event) => {
              setWeight(event.target.value)
            }}
            step="0.1"
            type="number"
            value={weight}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium">
          {t('quickAdd.note')}
          <textarea
            className="min-h-24 rounded-2xl border border-line bg-surface px-4 py-3"
            onChange={(event) => {
              setNote(event.target.value)
            }}
            value={note}
          />
        </label>

        <section className="space-y-3">
          <h3 className="font-editorial text-xl">
            {t('quickAdd.sexualActivity')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {(['intercourse', 'other'] as const).map((option) => (
              <Chip
                key={option}
                onClick={() => {
                  setActivity((current) => (current === option ? null : option))
                }}
                selected={activity === option}
              >
                {t(`sexualActivity.${option}`)}
              </Chip>
            ))}
          </div>
          {activity === null ? null : (
            <div className="flex flex-wrap gap-2">
              {protectionOptions.map((option) => (
                <Chip
                  key={option}
                  onClick={() => {
                    setProtection((current) =>
                      current === option ? null : option,
                    )
                  }}
                  selected={protection === option}
                >
                  {t(`protection.${option}`)}
                </Chip>
              ))}
            </div>
          )}
        </section>

        {error === null ? null : (
          <p className="text-sm text-plum" role="alert">
            {error}
          </p>
        )}
      </div>
    </BottomSheet>
  )
}
