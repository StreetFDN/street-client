import { Maybe, Result } from 'types/utils';

//= Fetch Endpoint definitions
// Error types
export type ApiResponse<T> = {
  data?: T[];
  errors?: ResponseError[];
  meta?: {
    next_token?: string;
  };
};

type ResponseError = {
  title: string;
  detail: string;
  type: string;
  resource_type?: string;
  resource_id?: string;
};

type EndpointWithFields<
  TPath extends string = string,
  TQuery extends object = object,
  TFieldsKey extends string = string,
  TBaseResponse extends object = object,
  TFieldsQuery extends object = object,
> = {
  path: TPath;
  query: TQuery;
  fieldsKey: TFieldsKey;
  baseResponse: TBaseResponse;
  fields: TFieldsQuery;
};

// Get Users by IDs
type BaseUserResponse = {
  id: string;
  name: string;
  username: string;
};

type UserFieldsQueryParameters = {
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
    like_count: Maybe<number>;
  };
  connection_status: Maybe<
    (
      | 'follow_request_received'
      | 'follow_request_sent'
      | 'blocking'
      | 'followed_by'
      | 'following'
      | 'muting'
    )[]
  >;
  protected: boolean;
  profile_image_url: string;
  description: string;
  is_identity_verified: boolean;
  verified: boolean;
  verified_type: 'blue' | 'government' | 'business' | 'none';
  subscription: unknown;
  subscription_type: 'Basic' | 'Premium' | 'PremiumPlus' | 'None';
  receives_your_dm: boolean;
  created_at: string;
  affiliation: Maybe<{
    badge_url: string;
    url: string;
    user_id: string[];
    description: string;
  }>;
  location: Maybe<string>;
  url: Maybe<string>;
  profile_banner_url: Maybe<string>;
  entities: Maybe<{
    description: string;
    url: string;
  }>;
  pinned_tweet_id: Maybe<string>;
  parody: Maybe<boolean>;
  most_recent_tweet_id: Maybe<string>;
  withheld: Maybe<{
    country_codes: string[];
    scope: Maybe<string>;
  }>;
};

type GetUsersByIDs = EndpointWithFields<
  '/users',
  { ids: string[] },
  'user.fields',
  BaseUserResponse,
  UserFieldsQueryParameters
>;

// Search users by name
type GetUsersByUsernames = EndpointWithFields<
  '/users/by',
  { usernames: string[] },
  'user.fields',
  BaseUserResponse,
  UserFieldsQueryParameters
>;

// Search Tweets with Query
type BaseSearchTweetsResponse = {
  text: string;
  id: string;
  edit_history_tweet_ids: string[];
};

type SearchTweetsFieldsQueryParameters = {
  attachments: Maybe<unknown>;
  author_id: string;
  community_id: Maybe<string>;
  context_annotations: {
    domain: string;
    entity: {
      id: string;
      description: string;
      name: Maybe<string>;
    };
  }[];
  conversation_id: Maybe<string>;
  created_at: string;
  display_text_range: number[];
  edit_controls: {
    edits_remaining: number;
    is_edit_eligible: boolean;
    editable_until: string;
  };
  entities: {
    annotations: {
      end: number;
      start: number;
      normalized_text: Maybe<string>;
      probability: Maybe<string>;
      type: Maybe<string>;
    }[];
    cashtags: {
      end: number;
      start: number;
      tag: string;
    }[];
    hashtags: {
      end: number;
      start: number;
      tag: string;
    }[];
    mentions: {
      end: number;
      start: number;
      username: string;
      id: Maybe<string>;
    }[];
    urls: {
      end: number;
      start: number;
      url: string;
      description: Maybe<string>;
      display_url: Maybe<string>;
      expanded_url: Maybe<string>;
      images: {
        height: Maybe<number>;
        url: Maybe<string>;
        width: Maybe<number>;
      }[];
      media_key: Maybe<string>;
      status: number;
      title: Maybe<string>;
      unwound_url: Maybe<string>;
    }[];
  };
  geo: Maybe<{
    coordinates: number[];
    types: string[];
    place_id: Maybe<string>;
  }>;
  in_reply_to_user_id: Maybe<string>;
  lang: string;
  note_tweet: Maybe<BaseSearchTweetsResponse>;
  possibly_sensitive: boolean;
  public_metrics: {
    bookmark_count: number;
    impression_count: number;
    like_count: number;
    reply_count: number;
    retweet_count: number;
    quote_count: Maybe<number>;
  };
  referenced_tweets: {
    id: string;
    type: 'retweet' | 'quoted' | 'replied_to';
  }[];
  reply_settings:
    | 'everyone'
    | 'mentionedUsers'
    | 'following'
    | 'other'
    | 'subscribers'
    | 'verified';
  scopes: Maybe<{
    followers: boolean;
  }>;
  withheld: Maybe<{
    copyright: boolean;
    country_codes: string[];
    scope: Maybe<'tweet' | 'user'>;
  }>;
};

type SearchRecentTweets = EndpointWithFields<
  '/tweets/search/recent',
  {
    query: string;
    start_time?: string;
    end_time?: string;
    since_id?: string;
    until_id?: string;
    max_results?: string;
    next_token?: string;
    pagination_token?: string;
    sort_order?: 'recency' | 'relevancy';
  },
  'tweet.fields',
  BaseSearchTweetsResponse,
  SearchTweetsFieldsQueryParameters
>;

//= Service Helper types wrapping complex endpoint types
export type UserResult = Result<
  BaseUserResponse &
    Pick<UserFieldsQueryParameters, ['public_metrics'][number]>,
  ResponseError
>;
export type Tweet = BaseSearchTweetsResponse &
  Pick<
    SearchTweetsFieldsQueryParameters,
    ['public_metrics', 'created_at', 'author_id'][number]
  >;

// Type Glue for the xApiFetch function
export type Endpoints =
  | GetUsersByIDs
  | GetUsersByUsernames
  | SearchRecentTweets;

type FieldsQuery<TFields extends object> = readonly (keyof TFields)[];

type InferFieldsFromQuery<
  TEndpoint extends EndpointWithFields,
  TQuery,
> = TEndpoint['fieldsKey'] extends infer TKey extends string
  ? TQuery extends { [TProp in TKey]?: infer TFields }
    ? TFields extends FieldsQuery<TEndpoint['fields']>
      ? TFields
      : undefined
    : undefined
  : undefined;

export type QueryOf<TEndpoint extends EndpointWithFields> =
  TEndpoint['query'] & {
    [K in TEndpoint['fieldsKey']]?: FieldsQuery<TEndpoint['fields']>;
  };

export type ResponseOf<
  TEndpoint extends EndpointWithFields,
  TQuery,
> = ApiResponse<
  TEndpoint['baseResponse'] &
    (InferFieldsFromQuery<TEndpoint, TQuery> extends FieldsQuery<
      TEndpoint['fields']
    >
      ? Pick<
          TEndpoint['fields'],
          InferFieldsFromQuery<TEndpoint, TQuery>[number]
        >
      : unknown)
>;

export type EndpointByPath<
  TEndpoints extends { path: string },
  TPath extends TEndpoints['path'],
> = Extract<TEndpoints, { path: TPath }>;
