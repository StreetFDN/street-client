import * as z from 'zod';

//== Event header
export const SupportedEventTypesSchema = z.enum(['installation', 'installation_repositories', 'push', 'pull_request', 'release']);
export const EventHeaderSchema = z.object({
  'x-hub-signature-256': z.string().optional(),
  'x-github-event': z.union([
    SupportedEventTypesSchema,
    z.string()
  ]),
}).loose();

export type EventHeader = z.infer<typeof EventHeaderSchema>;
export type EventType = z.infer<typeof SupportedEventTypesSchema>;


//== Common schemas used in event payloads.
const RepositorySchema = z.object({
  id: z.number(),
}).loose();

const AccountSchema = z.object({
  login: z.string(),
  email: z.email().optional(),
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

const UserSchema = z.object({
  id: z.number(),
  login: z.string(),
}).loose();

const PullRequestLabelSchema = z.object({
  name: z.string(),
}).loose();

const CommitSchema = z.object({
  id: z.string(),
  message: z.string(),
  timestamp: z.iso.datetime({offset: true}),
  url: z.httpUrl(),
  author: AuthorSchema,
  distinct: z.boolean(),
}).loose();

const InstallationRepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  private: z.boolean(),
}).loose();

const PullRequestSchema = z.object({
  id: z.number(),
  number: z.number(),
  merged_at: z.iso.datetime({offset: true}).nullable(),
  url: z.httpUrl(),
  body: z.string().nullable(),
  title: z.string(),
  user: UserSchema,
  additions: z.number().optional(),
  deletions: z.number().optional(),
  labels: z.array(PullRequestLabelSchema).nullable(),
}).loose();

const ReleaseSchema = z.object({
  url: z.httpUrl(),
  id: z.number(),
  author: AccountSchema,
  name: z.string(),
  tag_name: z.string(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  published_at: z.iso.datetime({offset: true}).nullable(),
  created_at: z.iso.datetime({offset: true}).nullable(),
  updated_at: z.iso.datetime({offset: true}).nullable(),
  body: z.string(),
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

//== Pull Request Event
export const PullRequestEventSchema = z.object({
  action: z.union([
    z.literal('closed'),
    z.string(),
  ]),
  pull_request: PullRequestSchema,
  installation: InstallationSchema,
  repository: RepositorySchema,
}).loose();

export type PullRequestEvent = z.infer<typeof PullRequestEventSchema>;

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

//== Release Event
const SupportedReleaseActionsSchema = z.enum(['released', 'deleted']);
export const ReleaseEventSchema = z.object({
  action: z.union([
    SupportedReleaseActionsSchema,
    z.string(),
  ]),
  release: ReleaseSchema,
  repository: RepositorySchema,
  installation: InstallationSchema,
}).loose();

export type SupportedReleaseAction = z.infer<typeof SupportedReleaseActionsSchema>;
export type ReleaseEvent = z.infer<typeof ReleaseEventSchema>;
