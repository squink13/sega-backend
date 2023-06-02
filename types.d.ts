import type {
  BaseClientOptions,
  SchemaInference,
  XataRecord,
} from "@xata.io/client";
declare const tables: readonly [
  {
    readonly name: "nextauth_users";
    readonly columns: readonly [
      {
        readonly name: "email";
        readonly type: "email";
      },
      {
        readonly name: "emailVerified";
        readonly type: "datetime";
      },
      {
        readonly name: "name";
        readonly type: "string";
      },
      {
        readonly name: "image";
        readonly type: "string";
      }
    ];
  },
  {
    readonly name: "nextauth_accounts";
    readonly columns: readonly [
      {
        readonly name: "user";
        readonly type: "link";
        readonly link: {
          readonly table: "nextauth_users";
        };
      },
      {
        readonly name: "type";
        readonly type: "string";
      },
      {
        readonly name: "provider";
        readonly type: "string";
      },
      {
        readonly name: "providerAccountId";
        readonly type: "string";
      },
      {
        readonly name: "refresh_token";
        readonly type: "string";
      },
      {
        readonly name: "access_token";
        readonly type: "string";
      },
      {
        readonly name: "expires_at";
        readonly type: "int";
      },
      {
        readonly name: "token_type";
        readonly type: "string";
      },
      {
        readonly name: "scope";
        readonly type: "string";
      },
      {
        readonly name: "id_token";
        readonly type: "text";
      },
      {
        readonly name: "session_state";
        readonly type: "string";
      },
      {
        readonly name: "last_logged_in";
        readonly type: "datetime";
        readonly defaultValue: "now";
      }
    ];
  },
  {
    readonly name: "nextauth_users_accounts";
    readonly columns: readonly [
      {
        readonly name: "user";
        readonly type: "link";
        readonly link: {
          readonly table: "nextauth_users";
        };
      },
      {
        readonly name: "account";
        readonly type: "link";
        readonly link: {
          readonly table: "nextauth_accounts";
        };
      }
    ];
  },
  {
    readonly name: "osu_profile";
    readonly columns: readonly [
      {
        readonly name: "account";
        readonly type: "link";
        readonly link: {
          readonly table: "nextauth_accounts";
        };
      },
      {
        readonly name: "username";
        readonly type: "string";
      },
      {
        readonly name: "country_code";
        readonly type: "string";
      },
      {
        readonly name: "rank";
        readonly type: "int";
      },
      {
        readonly name: "badges";
        readonly type: "int";
      },
      {
        readonly name: "avatar_url";
        readonly type: "string";
      }
    ];
  },
  {
    readonly name: "discord_profile";
    readonly columns: readonly [
      {
        readonly name: "account";
        readonly type: "link";
        readonly link: {
          readonly table: "nextauth_accounts";
        };
      },
      {
        readonly name: "username";
        readonly type: "string";
      },
      {
        readonly name: "avatar_url";
        readonly type: "string";
      },
      {
        readonly name: "discriminator";
        readonly type: "int";
      },
      {
        readonly name: "avatar";
        readonly type: "string";
      }
    ];
  },
  {
    readonly name: "registered";
    readonly columns: readonly [
      {
        readonly name: "osu";
        readonly type: "link";
        readonly link: {
          readonly table: "osu_profile";
        };
      },
      {
        readonly name: "discord";
        readonly type: "link";
        readonly link: {
          readonly table: "discord_profile";
        };
      },
      {
        readonly name: "tz";
        readonly type: "int";
      },
      {
        readonly name: "title";
        readonly type: "string";
      },
      {
        readonly name: "created_at";
        readonly type: "datetime";
        readonly defaultValue: "now";
      },
      {
        readonly name: "aim";
        readonly type: "int";
      },
      {
        readonly name: "control";
        readonly type: "int";
      },
      {
        readonly name: "speed";
        readonly type: "int";
      },
      {
        readonly name: "reading";
        readonly type: "int";
      },
      {
        readonly name: "stamina";
        readonly type: "int";
      },
      {
        readonly name: "tech";
        readonly type: "int";
      }
    ];
  }
];
export type SchemaTables = typeof tables;
export type InferredTypes = SchemaInference<SchemaTables>;
export type NextauthUsers = InferredTypes["nextauth_users"];
export type NextauthUsersRecord = NextauthUsers & XataRecord;
export type NextauthAccounts = InferredTypes["nextauth_accounts"];
export type NextauthAccountsRecord = NextauthAccounts & XataRecord;
export type NextauthUsersAccounts = InferredTypes["nextauth_users_accounts"];
export type NextauthUsersAccountsRecord = NextauthUsersAccounts & XataRecord;
export type OsuProfile = InferredTypes["osu_profile"];
export type OsuProfileRecord = OsuProfile & XataRecord;
export type DiscordProfile = InferredTypes["discord_profile"];
export type DiscordProfileRecord = DiscordProfile & XataRecord;
export type Registered = InferredTypes["registered"];
export type RegisteredRecord = Registered & XataRecord;
export type DatabaseSchema = {
  nextauth_users: NextauthUsersRecord;
  nextauth_accounts: NextauthAccountsRecord;
  nextauth_users_accounts: NextauthUsersAccountsRecord;
  osu_profile: OsuProfileRecord;
  discord_profile: DiscordProfileRecord;
  registered: RegisteredRecord;
};
declare const DatabaseClient: any;
export declare class XataClient extends DatabaseClient<DatabaseSchema> {
  constructor(options?: BaseClientOptions);
}
export declare const getXataClient: () => XataClient;
export {};
