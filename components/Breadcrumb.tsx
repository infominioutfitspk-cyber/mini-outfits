import Link from 'next/link';
import { ChevronRight, Home } from '@/components/common/Icons';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  siteUrl?: string;
}

export default function Breadcrumb({ items, siteUrl }: BreadcrumbProps) {
  const finalSiteUrl = siteUrl || process.env.NEXT_PUBLIC_SITE_URL || '';

  // Build JSON-LD Breadcrumb Schema
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: finalSiteUrl
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.label,
        item: item.href.startsWith('http') ? item.href : `${finalSiteUrl}${item.href}`
      }))
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <nav className="flex items-center space-x-1.5 text-xs md:text-sm text-gray-550 dark:text-gray-400 py-3 select-none">
        <Link 
          href="/" 
          className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Home</span>
        </Link>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <div key={item.href} className="flex items-center space-x-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {isLast ? (
                <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-xs">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer truncate max-w-[120px] sm:max-w-xs"
                >
                  {item.label}
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );
}
