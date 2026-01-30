export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (value == null)
    throw new Error(`Missing required environment variable: ${name}`);

  return value;
}

export function getDefaultEnv(name: string, defaultValue: string = ''): string {
  const value = process.env[name];
  if (value == null) return defaultValue;

  return value;
}
