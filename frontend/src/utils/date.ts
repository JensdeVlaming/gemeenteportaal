export function startOfTodayIso() {
  const now = new Date();
  const localStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
  return localStart.toISOString();
}
