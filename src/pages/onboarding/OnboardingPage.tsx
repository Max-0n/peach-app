import { Languages } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../app/i18n/locale-context'
import { Button } from '../../components/ui/Button'
import { WheelPicker } from '../../components/ui/WheelPicker'
import { todayLocalDate } from '../../domain'
import { createLocalDate } from '../../domain/cycle/types'
import { defaultBirthDate, toDateInputValue } from '../../lib/dates'
import { useData } from '../../features/data/data-context'
import { useTelegram } from '../../features/telegram/telegram-context'

export function OnboardingPage() {
  const { t, locale, setLocale } = useTranslation()
  const telegram = useTelegram()
  const data = useData()
  const navigate = useNavigate()
  const [cycleLength, setCycleLength] = useState(
    data.settings?.averageCycleLength ?? 28,
  )
  const [periodDuration, setPeriodDuration] = useState(
    data.settings?.averagePeriodDuration ?? 5,
  )
  const [birthDate, setBirthDate] = useState(
    data.profile?.birthDate ?? toDateInputValue(defaultBirthDate()),
  )
  const today = todayLocalDate()

  async function complete(): Promise<void> {
    const trimmed = (
      data.profile?.displayName ??
      telegram.user?.firstName ??
      ''
    ).trim()
    await data.saveSettings({
      averageCycleLength: cycleLength,
      averagePeriodDuration: periodDuration,
      locale,
      onboardingCompleted: true,
    })
    await data.saveProfile({
      pregnancyMode: data.profile?.pregnancyMode ?? 'tracking',
      ...(trimmed === '' ? {} : { displayName: trimmed }),
      ...(birthDate === '' ? {} : { birthDate: createLocalDate(birthDate) }),
    })
    void navigate('/', { replace: true })
  }

  return (
    <main className="relative mx-auto min-h-dvh max-w-lg px-6 pt-[calc(1.25rem+var(--app-safe-top))] pb-16">
      <button
        aria-label={t('language.toggle')}
        className="absolute top-[calc(0.75rem+var(--app-safe-top))] right-5 grid size-11 place-items-center rounded-full text-muted hover:bg-surface hover:text-foreground"
        onClick={() => {
          setLocale(locale === 'en' ? 'ru' : 'en')
        }}
        type="button"
      >
        <Languages aria-hidden="true" size={22} />
      </button>

      <section className="space-y-8 pt-10">
        <div className="space-y-3">
          <h1 className="font-editorial text-4xl tracking-tight">
            {t('onboarding.cycle.title')}
          </h1>
          <p className="text-lg leading-8 text-muted">
            {t('onboarding.cycle.body')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-3 text-sm font-medium">
            {t('onboarding.cycle.length')}
            <div className="rounded-3xl bg-surface">
              <WheelPicker
                aria-label={t('onboarding.cycle.length')}
                max={50}
                min={1}
                onChange={setCycleLength}
                value={cycleLength}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 text-sm font-medium">
            {t('onboarding.cycle.period')}
            <div className="rounded-3xl bg-surface">
              <WheelPicker
                aria-label={t('onboarding.cycle.period')}
                max={10}
                min={1}
                onChange={setPeriodDuration}
                value={periodDuration}
              />
            </div>
          </div>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium">
          {t('onboarding.birthDate')}
          <input
            className="min-h-11 rounded-2xl border border-line bg-surface px-4"
            max={today}
            min="1920-01-01"
            onChange={(event) => {
              setBirthDate(event.target.value)
            }}
            type="date"
            value={birthDate}
          />
        </label>
      </section>

      <div className="mt-12">
        <Button onClick={() => void complete()} variant="primary">
          {t('action.start')}
        </Button>
      </div>
    </main>
  )
}
