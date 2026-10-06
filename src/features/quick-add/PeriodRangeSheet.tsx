import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../app/i18n/locale-context'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { Button } from '../../components/ui/Button'
import { todayLocalDate, type LocalDate } from '../../domain'
import { useData } from '../data/data-context'
import { useTelegram } from '../telegram/telegram-context'
import {
  addCalendarMonths,
  formatLocalDateDisplay,
  monthCells,
  monthTitle,
  weekdayLabels,
} from '../../lib/dates'
import { parseLocalDate, startOfMonth } from '../../domain/cycle/localDate'
import { periodRangeSchema } from './schema'

interface PeriodRangeSheetProps {
  onClose: () => void
  initialStart?: LocalDate | null
  initialEnd?: LocalDate | null
  editingId?: string | null
}

export function PeriodRangeSheet({
  onClose,
  initialStart = null,
  initialEnd = null,
  editingId = null,
}: PeriodRangeSheetProps) {
  const { t, locale } = useTranslation()
  const telegram = useTelegram()
  const data = useData()
  const today = todayLocalDate()
  const weekStartsOn: 0 | 1 = locale === 'ru' ? 1 : 0
  const [month, setMonth] = useState(() =>
    startOfMonth(initialStart ?? today),
  )
  const [startDate, setStartDate] = useState<LocalDate | null>(initialStart)
  const [endDate, setEndDate] = useState<LocalDate | null>(initialEnd)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const dirty = startDate !== initialStart || endDate !== initialEnd
  const isEditing = editingId !== null
  const labels = weekdayLabels(locale, weekStartsOn)
  const cells = useMemo(
    () => monthCells(month, weekStartsOn),
    [month, weekStartsOn],
  )

  function selectDay(date: LocalDate): void {
    setError(null)
    if (startDate === null || endDate !== null) {
      setStartDate(date)
      setEndDate(null)
      return
    }
    if (date <= startDate) {
      setStartDate(date)
      setEndDate(null)
      return
    }
    setEndDate(date)
  }

  const submit = useCallback(async () => {
    if (startDate === null) {
      return
    }
    const parsed = periodRangeSchema.safeParse({
      startDate,
      ...(endDate === null ? {} : { endDate }),
    })
    if (!parsed.success) {
      setError(t('quickAdd.error.periodRange'))
      telegram.haptic('warning')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const nextId = `cycle:${parsed.data.startDate}`
      if (editingId !== null && editingId !== nextId) {
        await data.deleteRecord('cycle', editingId)
      }
      await data.saveCycle({
        id: nextId,
        startDate: parsed.data.startDate,
        ...(parsed.data.endDate === undefined
          ? {}
          : { endDate: parsed.data.endDate }),
      })
      telegram.haptic('success')
      onClose()
    } catch {
      telegram.haptic('error')
      setError(t('quickAdd.error.empty'))
    } finally {
      setSaving(false)
    }
  }, [data, editingId, endDate, onClose, startDate, t, telegram])

  const deletePeriod = useCallback(async () => {
    if (editingId === null) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      await data.deleteRecord('cycle', editingId)
      telegram.haptic('success')
      onClose()
    } catch {
      telegram.haptic('error')
      setError(t('quickAdd.error.empty'))
    } finally {
      setSaving(false)
      setConfirmDelete(false)
    }
  }, [data, editingId, onClose, t, telegram])

  const requestClose = useCallback(() => {
    if (dirty) {
      setConfirmLeave(true)
      return
    }
    onClose()
  }, [dirty, onClose])

  useEffect(() => {
    telegram.backButton.show(
      confirmLeave
        ? () => {
            setConfirmLeave(false)
          }
        : requestClose,
    )
    telegram.mainButton.show(t('action.save'), () => {
      void submit()
    })
    return () => {
      telegram.backButton.hide()
      telegram.mainButton.hide()
    }
  }, [confirmLeave, requestClose, submit, t, telegram])

  const rangeLabel =
    startDate === null
      ? null
      : endDate === null
        ? formatLocalDateDisplay(startDate, locale)
        : `${formatLocalDateDisplay(startDate, locale)} — ${formatLocalDateDisplay(endDate, locale)}`

  return (
    <BottomSheet
      footer={
        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            disabled={saving || startDate === null}
            onClick={() => void submit()}
          >
            {t('action.save')}
          </Button>
          {isEditing ? (
            confirmDelete ? (
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  disabled={saving}
                  onClick={() => void deletePeriod()}
                  variant="danger"
                >
                  {t('action.confirm')}
                </Button>
                <Button
                  className="w-full"
                  disabled={saving}
                  onClick={() => {
                    setConfirmDelete(false)
                  }}
                  variant="ghost"
                >
                  {t('action.cancel')}
                </Button>
              </div>
            ) : (
              <Button
                className="w-full"
                disabled={saving}
                onClick={() => {
                  setConfirmDelete(true)
                }}
                variant="ghost"
              >
                {t('calendar.deletePeriod')}
              </Button>
            )
          ) : null}
        </div>
      }
      fullScreen
      onClose={confirmLeave ? () => undefined : requestClose}
      title={t('quickAdd.period')}
    >
      <div className="space-y-6">
        <p className="text-sm leading-6 text-muted">{t('period.rangeHint')}</p>
        <div className="flex items-center justify-between gap-3">
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
          <h3 className="font-editorial text-2xl">{monthTitle(month, locale)}</h3>
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
            const isStart = date === startDate
            const isEnd = date === endDate
            const inRange =
              startDate !== null &&
              endDate !== null &&
              date > startDate &&
              date < endDate
            return (
              <button
                aria-label={formatLocalDateDisplay(date, locale)}
                aria-pressed={isStart || isEnd || inRange}
                className={`min-h-11 rounded-2xl text-sm ${
                  isStart || isEnd
                    ? 'bg-plum text-ivory'
                    : inRange
                      ? 'bg-plum/20'
                      : 'bg-surface'
                }`}
                data-date={date}
                key={date}
                onClick={() => {
                  selectDay(date)
                }}
                type="button"
                {...(date === today ? { 'aria-current': 'date' as const } : {})}
              >
                {parseLocalDate(date).day}
              </button>
            )
          })}
        </div>
        {rangeLabel === null ? null : (
          <p className="text-sm font-medium">{rangeLabel}</p>
        )}
        {error === null ? null : (
          <p className="text-sm text-plum" role="alert">
            {error}
          </p>
        )}
      </div>
      {confirmLeave ? (
        <BottomSheet
          onClose={() => {
            setConfirmLeave(false)
          }}
          title={t('calendar.unsaved.title')}
        >
          <div className="flex flex-col gap-3">
            <Button
              className="w-full"
              disabled={saving || startDate === null}
              onClick={() => void submit()}
            >
              {t('action.save')}
            </Button>
            <Button
              className="w-full"
              onClick={onClose}
              variant="secondary"
            >
              {t('calendar.unsaved.discard')}
            </Button>
          </div>
        </BottomSheet>
      ) : null}
    </BottomSheet>
  )
}
