export interface BmiInput {
  heightCm: number
  weightKg: number
}

export type BmiClassification =
  'belowRange' | 'healthyRange' | 'aboveRange' | 'wellAboveRange'

export function calculateBmi({ heightCm, weightKg }: BmiInput): number | null {
  if (
    !Number.isFinite(heightCm) ||
    !Number.isFinite(weightKg) ||
    heightCm < 50 ||
    heightCm > 250 ||
    weightKg < 2 ||
    weightKg > 400
  ) {
    return null
  }
  const heightM = heightCm / 100
  return Math.round((weightKg / heightM ** 2) * 10) / 10
}

export function classifyBmi(bmi: number | null): BmiClassification | null {
  if (bmi === null || !Number.isFinite(bmi) || bmi <= 0) return null
  if (bmi < 18.5) return 'belowRange'
  if (bmi < 25) return 'healthyRange'
  if (bmi < 30) return 'aboveRange'
  return 'wellAboveRange'
}
