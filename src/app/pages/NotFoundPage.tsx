import { Link } from 'react-router-dom'
import { useTranslation } from '../../stores/preferences'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 py-24 text-center">
      <p className="font-mono text-5xl font-black text-[color:var(--color-plasma)]">404</p>
      <p className="text-sm font-semibold">{t('common.notFound')}</p>
      <Link to="/" className="btn btn-primary mt-2">
        {t('common.backHome')}
      </Link>
    </div>
  )
}
