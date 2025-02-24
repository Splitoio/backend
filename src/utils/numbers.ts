export function toFixedNumber(num: number) {
  return num;
}

export function toInteger(num: number) {
  return Math.round(num);
}

export function toUIString(num: number) {
  return toFixedNumber(Math.abs(num)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
