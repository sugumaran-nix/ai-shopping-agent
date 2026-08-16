/**
 * Per-marketplace icon using lucide-react.
 * Kept in one place so changes propagate everywhere.
 */
import {
  Package,       // Amazon
  ShoppingCart,  // Flipkart
  Shirt,         // Meesho
  Footprints,    // Myntra
} from 'lucide-react'
import type { Source } from '@/lib/api'

const ICONS: Record<Source, React.ElementType> = {
  amazon:   Package,
  flipkart: ShoppingCart,
  meesho:   Shirt,
  myntra:   Footprints,
}

export function SourceIcon({ source, className = 'w-4 h-4' }: { source: Source; className?: string }) {
  const Icon = ICONS[source]
  return <Icon className={className} aria-hidden />
}
