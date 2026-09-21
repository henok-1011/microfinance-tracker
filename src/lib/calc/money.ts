export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function sum(values: number[]): number {
  return round2(values.reduce((total, value) => total + value, 0))
}
