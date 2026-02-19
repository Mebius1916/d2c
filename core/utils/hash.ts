export const FNV_OFFSET_BASIS_32 = 2166136261;
export const FNV_PRIME_32 = 16777619;

export function fnv1a32Update(hash: number, input: string): number {
  let next = hash;
  for (let i = 0; i < input.length; i++) {
    next ^= input.charCodeAt(i);
    next = Math.imul(next, FNV_PRIME_32);
  }
  return next >>> 0;
}

export function fnv1a32(input: string): number {
  return fnv1a32Update(FNV_OFFSET_BASIS_32, input);
}

export function hashClassName(input: string): string {
  return `h_${fnv1a32(input).toString(16)}`;
}