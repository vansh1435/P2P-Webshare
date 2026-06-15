export function formatBytes(bytes = 0) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatSpeed(bytesPerSecond = 0) {
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatPercent(value = 0) {
  return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
}
