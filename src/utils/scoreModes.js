export const SCORE_MODES = [
  { value: 'points', label: 'Punten' },
  { value: 'games', label: 'Games' },
  { value: 'games_sets', label: 'Games & Sets' },
]

export const SETS_FORMATS = [
  { value: 3, label: 'Best-of-3' },
  { value: 5, label: 'Best-of-5' },
]

export function scoreModeLabel(mode) {
  return SCORE_MODES.find((m) => m.value === mode)?.label ?? mode
}
