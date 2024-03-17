export default function entries<Value, Key extends string | number | symbol = string>(
  obj: Record<Key, Value>
): [Key, Value][] {
  return Object.entries(obj).map(([key, value]) => [key as Key, value as Value])
}
