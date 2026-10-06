import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../app/i18n/locale-context'
import type { Locale } from '../../app/i18n/dictionary'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import { PageHeader } from '../../components/ui/PageHeader'
import { WheelPicker } from '../../components/ui/WheelPicker'
import { type PregnancyMode } from '../../domain'
import { createLocalDate } from '../../domain/cycle/types'
import { defaultBirthDate, toDateInputValue } from '../../lib/dates'
import { useData } from '../../features/data/data-context'
import { buildCsv, CSV_FILENAME } from '../../features/export/csv'
import { downloadTextFile } from '../../features/export/download'
import { useWebInstallPrompt } from '../../features/install/useWebInstallPrompt'
import { useTelegram } from '../../features/telegram/telegram-context'
import type { HomeScreenStatus } from '../../features/telegram/types'

const pregnancyModes: PregnancyMode[] = ['tracking', 'trying', 'avoiding']
const themes = ['system', 'light', 'dark'] as const

export function ProfilePage() {
  const { t, locale, setLocale } = useTranslation()
  const navigate = useNavigate()
  const telegram = useTelegram()
  const webInstall = useWebInstallPrompt()
  const data = useData()
  const [displayName, setDisplayName] = useState(
    data.profile?.displayName ?? telegram.user?.firstName ?? '',
  )
  const [birthDate, setBirthDate] = useState(
    data.profile?.birthDate ?? toDateInputValue(defaultBirthDate()),
  )
  const [height, setHeight] = useState(
    data.profile?.heightCm === undefined ? '' : String(data.profile.heightCm),
  )
  const [cycleLength, setCycleLength] = useState(
    data.settings?.averageCycleLength ?? 28,
  )
  const [periodDuration, setPeriodDuration] = useState(
    data.settings?.averagePeriodDuration ?? 5,
  )
  const [lutealLength, setLutealLength] = useState(
    data.settings?.lutealPhaseLength ?? 14,
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [homeStatus, setHomeStatus] = useState<HomeScreenStatus>('unknown')

  useEffect(() => {
    void telegram.checkHomeScreenStatus().then(setHomeStatus)
  }, [telegram])

  async function persistIdentity(): Promise<void> {
    const trimmed = displayName.trim()
    const heightNumber = height === '' ? Number.NaN : Number(height)
    await data.saveProfile({
      pregnancyMode: data.profile?.pregnancyMode ?? 'tracking',
      ...(trimmed === '' ? {} : { displayName: trimmed }),
      ...(birthDate === '' ? {} : { birthDate: createLocalDate(birthDate) }),
      ...(Number.isFinite(heightNumber) && heightNumber > 0
        ? { heightCm: heightNumber }
        : {}),
    })
  }

  return (
    <section className="animate-reveal space-y-8">
      <PageHeader title={t('page.profile')} />
      <p className="text-sm text-muted">
        {t(`profile.sync.${data.syncState}`)}
      </p>

      <section className="space-y-4 rounded-3xl bg-surface p-6">
        <h2 className="font-editorial text-2xl">{t('profile.identity')}</h2>
        <label className="flex flex-col gap-2 text-sm font-medium">
          {t('profile.displayName')}
          <input
            className="min-h-11 rounded-2xl border border-line bg-background px-4"
            onBlur={() => void persistIdentity()}
            onChange={(event) => {
              setDisplayName(event.target.value)
            }}
            value={displayName}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          {t('profile.birthDate')}
          <input
            className="min-h-11 rounded-2xl border border-line bg-background px-4"
            onBlur={() => void persistIdentity()}
            onChange={(event) => {
              setBirthDate(event.target.value)
            }}
            type="date"
            value={birthDate}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          {t('profile.height')}
          <input
            className="min-h-11 rounded-2xl border border-line bg-background px-4"
            onBlur={() => void persistIdentity()}
            onChange={(event) => {
              setHeight(event.target.value)
            }}
            type="number"
            value={height}
          />
        </label>
      </section>

      <section className="space-y-4 rounded-3xl bg-surface p-6">
        <h2 className="font-editorial text-2xl">{t('profile.cycle')}</h2>
        <div className="flex flex-col gap-3 text-sm font-medium">
          {t('onboarding.cycle.length')}
          <div className="rounded-3xl bg-background">
            <WheelPicker
              aria-label={t('onboarding.cycle.length')}
              max={50}
              min={1}
              onChange={(next) => {
                setCycleLength(next)
                void data.saveSettings({ averageCycleLength: next })
              }}
              value={cycleLength}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 text-sm font-medium">
          {t('onboarding.cycle.period')}
          <div className="rounded-3xl bg-background">
            <WheelPicker
              aria-label={t('onboarding.cycle.period')}
              max={10}
              min={1}
              onChange={(next) => {
                setPeriodDuration(next)
                void data.saveSettings({ averagePeriodDuration: next })
              }}
              value={periodDuration}
            />
          </div>
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium">
          {t('onboarding.cycle.luteal')}
          <input
            className="min-h-11 rounded-2xl border border-line bg-background px-4"
            onBlur={() =>
              void data.saveSettings({ lutealPhaseLength: lutealLength })
            }
            onChange={(event) => {
              setLutealLength(Number(event.target.value))
            }}
            type="number"
            value={lutealLength}
          />
        </label>
      </section>

      <section className="space-y-4 rounded-3xl bg-surface p-6">
        <h2 className="font-editorial text-2xl">{t('profile.pregnancy')}</h2>
        <div className="flex flex-wrap gap-2">
          {pregnancyModes.map((mode) => (
            <Chip
              key={mode}
              onClick={() => {
                void data.saveProfile({ pregnancyMode: mode })
              }}
              selected={(data.profile?.pregnancyMode ?? 'tracking') === mode}
            >
              {t(`pregnancyMode.${mode}`)}
            </Chip>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl bg-surface p-6">
        <h2 className="font-editorial text-2xl">{t('profile.appearance')}</h2>
        <p className="text-sm font-medium">{t('profile.theme')}</p>
        <div className="flex flex-wrap gap-2">
          {themes.map((theme) => (
            <Chip
              key={theme}
              onClick={() => {
                void data.saveSettings({ theme })
              }}
              selected={(data.settings?.theme ?? 'system') === theme}
            >
              {t(`theme.${theme}`)}
            </Chip>
          ))}
        </div>
        <p className="text-sm font-medium">{t('profile.language')}</p>
        <div className="flex flex-wrap gap-2">
          {(['en', 'ru'] as const).map((option: Locale) => (
            <Chip
              key={option}
              onClick={() => {
                setLocale(option)
                void data.saveSettings({ locale: option })
              }}
              selected={locale === option}
            >
              {t(`language.${option}`)}
            </Chip>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-3xl bg-surface p-6">
        <h2 className="font-editorial text-2xl">{t('profile.privacy')}</h2>
        <p className="leading-7 text-muted">{t('profile.privacyCopy')}</p>
      </section>

      <section className="space-y-3 rounded-3xl bg-surface p-6">
        <h2 className="font-editorial text-2xl">{t('profile.install')}</h2>
        <p className="text-muted">{t(`profile.install.${homeStatus}`)}</p>
        {homeStatus === 'missed' ? (
          <Button
            onClick={() => {
              telegram.addToHomeScreen()
            }}
          >
            {t('action.install')}
          </Button>
        ) : null}
        {homeStatus !== 'missed' && webInstall.canInstall ? (
          <Button
            onClick={() => {
              void webInstall.install()
            }}
          >
            {t('action.install')}
          </Button>
        ) : null}
      </section>

      <section className="space-y-3 rounded-3xl bg-surface p-6">
        <h2 className="font-editorial text-2xl">{t('profile.data')}</h2>
        <Button
          onClick={() => {
            const csv = buildCsv({
              cycles: data.records.cycles,
              flow: data.records.flow,
              symptoms: data.records.symptoms,
              mood: data.records.mood,
              weight: data.records.weight,
              notes: data.records.notes,
              sexualActivity: data.records.sexualActivity,
              averageCycleLength: data.settings?.averageCycleLength ?? 28,
              averagePeriodDuration: data.settings?.averagePeriodDuration ?? 5,
              lutealPhaseLength: data.settings?.lutealPhaseLength ?? 14,
              pregnancyMode: data.profile?.pregnancyMode ?? 'tracking',
              ...(data.profile?.heightCm === undefined
                ? {}
                : { heightCm: data.profile.heightCm }),
            })
            downloadTextFile(CSV_FILENAME, csv, 'text/csv;charset=utf-8')
          }}
          variant="secondary"
        >
          {t('action.export')}
        </Button>
        <Button
          onClick={() => {
            setConfirmDelete(true)
          }}
          variant="ghost"
        >
          {t('profile.deleteAll')}
        </Button>
      </section>

      {confirmDelete ? (
        <BottomSheet
          onClose={() => {
            setConfirmDelete(false)
          }}
          title={t('profile.deleteAll.confirm')}
        >
          <p className="leading-7 text-muted">
            {t('profile.deleteAll.confirmBody')}
          </p>
          <Button
            className="mt-6 w-full"
            onClick={() => {
              void data.deleteAllLocalData().then(() => {
                setConfirmDelete(false)
                void navigate('/onboarding', { replace: true })
              })
            }}
            variant="danger"
          >
            {t('action.delete')}
          </Button>
        </BottomSheet>
      ) : null}
    </section>
  )
}
