import { onCLS, onINP, onLCP } from 'web-vitals'
import type { Metric } from 'web-vitals'

const samples: { name: string; value: number }[] = []
let is_started = false

function remember(metric: Metric): void {
  samples.push({ name: metric.name, value: metric.value })
}

/** Снимает LCP, INP и CLS один раз за вкладку. Значения остаются в памяти вкладки, без стороннего сборщика. */
export function reportWebVitals(): void {
  if (is_started) return
  is_started = true
  onCLS(remember)
  onINP(remember)
  onLCP(remember)
}

export function webVitalSamples(): readonly { name: string; value: number }[] {
  return samples
}
