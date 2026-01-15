import * as z from 'zod';

//== Event header
export const EventHeaderSchema = z.object({
  'x-hub-signature-256': z.string().optional(),
  'x-github-event': z.enum(["push", "installation", "installation_repositories"]),
}).loose();

export type EventHeader = z.infer<typeof EventHeaderSchema>;
export type EventType = EventHeader['x-github-event'];


//== Common schemas used in event payloads.
const RepositorySchema = z.object({
  id: z.number(),
}).loose();

const AccountSchema = z.object({
  login: z.string(),
  email: z.email(),
}).loose();

const InstallationSchema = z.object({
  id: z.number(),
}).loose();

const DetailedInstallationSchema = InstallationSchema.extend({
  account: AccountSchema
}).loose();

const AuthorSchema = z.object({
  username: z.string(),
}).loose();

const CommitSchema = z.object({
  id: z.string(),
  message: z.string(),
  timestamp: z.iso.datetime({offset: true}),
  url: z.httpUrl(),
  author: AuthorSchema,
}).loose();

const InstallationRepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  private: z.boolean(),
}).loose();

//== Event payloads schemas
//== Push Event
export const PushEventSchema = z.object({
  repository: RepositorySchema,
  installation: InstallationSchema,
  compare: z.httpUrl(),
  commits: z.array(CommitSchema),
}).loose();

export type PushEvent = z.infer<typeof PushEventSchema>;

//== Installation Events
const CreatedInstallationEventSchema = z.object({
  action: z.literal('created'),
  installation: DetailedInstallationSchema,
}).loose();

const DeletedInstallationEventSchema = z.object({
  action: z.literal('deleted'),
  installation: DetailedInstallationSchema,
}).loose();

export const InstallationEventSchema = z.discriminatedUnion('action', [
  CreatedInstallationEventSchema,
  DeletedInstallationEventSchema,
]);

export type InstallationEvent = z.infer<typeof InstallationEventSchema>;
export type CreatedInstallationEvent = z.infer<typeof CreatedInstallationEventSchema>;
export type DeletedInstallationEvent = z.infer<typeof DeletedInstallationEventSchema>;
export type SupportedInstallationAction = InstallationEvent['action'];

//== Installation Repositories Events
const AddedInstallationRepositoriesEventSchema = z.object({
  action: z.literal('added'),
  installation: DetailedInstallationSchema,
  repositories_added: z.array(InstallationRepositorySchema).optional(),
}).loose();

const RemovedInstallationRepositoriesEventSchema = z.object({
  action: z.literal('removed'),
  installation: DetailedInstallationSchema,
  repositories_removed: z.array(InstallationRepositorySchema).optional(),
}).loose();

export const InstallationRepositoriesEventSchema = z.discriminatedUnion('action', [
  AddedInstallationRepositoriesEventSchema,
  RemovedInstallationRepositoriesEventSchema,
]);

export type InstallationRepositoriesEvent = z.infer<typeof InstallationRepositoriesEventSchema>;
export type AddedInstallationRepositoriesEvent = z.infer<typeof AddedInstallationRepositoriesEventSchema>;
export type RemovedInstallationRepositoriesEvent = z.infer<typeof RemovedInstallationRepositoriesEventSchema>;
export type SupportedInstallationRepositoriesAction = InstallationRepositoriesEvent['action'];