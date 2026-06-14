import { Helmet } from 'react-helmet-async'

const SITE = 'https://mh3-project.vercel.app'
const DEFAULT_DESC = 'Shanti monitors your desktop activity, detects stress patterns, and guides you through breathing exercises — all powered by AI and beautifully private.'
const DEFAULT_IMAGE = `${SITE}/og-image.png`

interface SeoProps {
  title: string
  description?: string
  path?: string
  image?: string
  type?: 'website' | 'article'
}

export default function Seo({ title, description, path, image, type }: SeoProps) {
  const fullTitle = `${title} — Shanti`
  const url = path ? `${SITE}${path}` : SITE
  const img = image ?? DEFAULT_IMAGE

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description ?? DEFAULT_DESC} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content={type ?? 'website'} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description ?? DEFAULT_DESC} />
      <meta property="og:image" content={img} />
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description ?? DEFAULT_DESC} />
      <meta property="twitter:image" content={img} />
    </Helmet>
  )
}
