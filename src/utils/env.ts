import { Maybe } from 'types/utils';

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (value == null)
    throw new Error(`Missing required environment variable: ${name}`);

  return value;
}

export function getDefaultEnv(name: string, defaultValue: string): string;
export function getDefaultEnv(name: string, defaultValue?: null): Maybe<string>;
export function getDefaultEnv(
  name: string,
  defaultValue?: Maybe<string>,
): Maybe<string> {
  return process.env[name] ?? defaultValue ?? null;
}
