/** Unidades que se convierten a una unidad mayor cuando la cantidad crece. */
const SCALE_UP: Record<string, { unit: string; factor: number }> = {
  g: { unit: "kg", factor: 1000 },
  ml: { unit: "L", factor: 1000 },
};

export function formatQuantity(quantity: number, unit: string): string {
  const up = SCALE_UP[unit];
  if (up && quantity >= up.factor) {
    return `${round(quantity / up.factor, 2)} ${up.unit}`;
  }
  const plural =
    quantity !== 1 && ["unidad", "diente", "tallo", "hoja", "lata", "cubo", "rebanada"].includes(unit)
      ? unit === "unidad"
        ? "unidades"
        : `${unit}s`
      : unit;
  return `${round(quantity, unit === "unidad" || unit === "huevo" ? 0 : 1)} ${plural}`;
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** Redondea hacia arriba las unidades que no se pueden comprar fraccionadas. */
export function purchasable(quantity: number, unit: string): number {
  const whole = ["unidad", "diente", "tallo", "hoja", "lata", "cubo", "rebanada"];
  return whole.includes(unit) ? Math.ceil(quantity) : Math.round(quantity * 10) / 10;
}
