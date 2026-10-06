import { useTranslation } from '../../app/i18n/locale-context'
import { dictionary, type TranslationKey } from '../../app/i18n/dictionary'
import { PageHeader } from '../../components/ui/PageHeader'
import { useData } from '../../features/data/data-context'
import {
  recommendationsForToday,
  todayInsights,
} from '../../features/cycle/selectors'

function asKey(key: string): TranslationKey | null {
  return Object.hasOwn(dictionary.en, key) ? (key as TranslationKey) : null
}

export function RecommendationsPage() {
  const { t } = useTranslation()
  const { records, settings, profile } = useData()
  const insights = todayInsights(records, settings)
  const items = recommendationsForToday(records, profile, insights)

  return (
    <section className="animate-reveal space-y-6">
      <PageHeader
        subtitle={t('recommendations.lead')}
        title={t('page.recommendations')}
      />
      <ul className="space-y-4">
        {items.map((item) => {
          const titleKey = asKey(item.titleKey)
          const bodyKey = asKey(item.bodyKey)
          const categoryKey = asKey(`category.${item.category}`)
          return (
            <li
              className="rounded-3xl bg-surface p-6 shadow-soft"
              key={item.id}
            >
              <p className="text-xs font-semibold tracking-[0.18em] text-sage uppercase">
                {categoryKey === null ? item.category : t(categoryKey)}
              </p>
              <h2 className="mt-2 font-editorial text-2xl">
                {titleKey === null ? item.id : t(titleKey)}
              </h2>
              <p className="mt-3 leading-7 text-muted">
                {bodyKey === null ? item.bodyText : t(bodyKey)}
              </p>
            </li>
          )
        })}
      </ul>
      <p className="text-sm leading-6 text-muted">
        {t('recommendations.disclaimer')}
      </p>
    </section>
  )
}
