// Centralized color palette (use only these colors across gradients)
// Source array provided by user
export const palette = [
  '#132aff',
  '#7eaffe',
  '#266eff',
  '#6498fe',
  '#154afe',
  '#3282ff',
  '#1417ff',
  '#143bfe',
  '#175aff',
];

// Convenience gradient pairs for consistent usage
export const gradients = {
  a: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
  b: `linear-gradient(135deg, ${palette[2]}, ${palette[3]})`,
  c: `linear-gradient(135deg, ${palette[4]}, ${palette[5]})`,
  d: `linear-gradient(135deg, ${palette[6]}, ${palette[7]})`,
  e: `linear-gradient(135deg, ${palette[7]}, ${palette[8]})`,
};

export default palette;
