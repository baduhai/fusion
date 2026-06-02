{
  lib,
  config,
  pkgs,
  ...
}:
let
  cfg = config.services.fusion;
  inherit (lib) mkEnableOption mkOption mkIf mkDefault types;
in
{

  options.services.fusion = {
    enable = mkEnableOption "Fusion — lightweight RSS reader and aggregator";

    package = mkOption {
      type = types.package;
      defaultText = lib.literalExpression "pkgs.fusion";
      description = "The fusion package to use.";
    };


    port = mkOption {
      type = types.port;
      default = 40982;
      description = "Port to listen on.";
    };

    passwordFile = mkOption {
      type = with types; nullOr str;
      default = null;
      description = "Path to a file containing the login password. If unset, authentication is disabled.";
      example = "/run/secrets/fusion-password";
    };

    dbPath = mkOption {
      type = types.str;
      default = "/var/lib/fusion/fusion.db";
      description = "Path to the SQLite database file.";
    };

    feverUsername = mkOption {
      type = types.str;
      default = "fusion";
      description = "Username used to derive the Fever API key (md5(username:password)).";
    };

    pullInterval = mkOption {
      type = types.ints.positive;
      default = 1800;
      description = "Default pull interval in seconds (default: 1800 = 30 min).";
    };

    pullTimeout = mkOption {
      type = types.ints.positive;
      default = 30;
      description = "HTTP request timeout in seconds for feed fetching.";
    };

    pullConcurrency = mkOption {
      type = types.ints.positive;
      default = 10;
      description = "Maximum number of concurrent feed pulls.";
    };

    pullMaxBackoff = mkOption {
      type = types.ints.positive;
      default = 172800;
      description = "Global maximum scheduling delay in seconds (default: 172800 = 48 hours).";
    };

    allowPrivateFeeds = mkOption {
      type = types.bool;
      default = false;
      description = "Allow pulling private/localhost feed URLs.";
    };

    corsAllowedOrigins = mkOption {
      type = types.listOf types.str;
      default = [ ];
      description = "Allowed CORS origins. Empty means allow all.";
      example = [ "https://example.com" ];
    };

    logLevel = mkOption {
      type = types.enum [ "DEBUG" "INFO" "WARN" "ERROR" ];
      default = "INFO";
      description = "Log level.";
    };

    oidc = {
      issuer = mkOption {
        type = with types; nullOr str;
        default = null;
        description = "OIDC provider URL. When set, OIDC authentication is enabled.";
      };

      clientId = mkOption {
        type = with types; nullOr str;
        default = null;
        description = "OAuth2 client ID for OIDC.";
      };

      clientSecretFile = mkOption {
        type = with types; nullOr str;
        default = null;
        description = "Path to a file containing the OIDC client secret.";
        example = "/run/secrets/fusion-oidc-secret";
      };

      redirectURI = mkOption {
        type = with types; nullOr str;
        default = null;
        description = "OIDC callback URL (required when OIDC is enabled).";
      };

      allowedUser = mkOption {
        type = with types; nullOr str;
        default = null;
        description = "Optional: restrict login to a specific user identity (email or sub).";
      };
    };
  };

  config = lib.mkMerge [
    {
      services.fusion.package = mkDefault pkgs.fusion;
    }
    (mkIf cfg.enable {
    assertions = [
      {
        assertion = cfg.oidc.issuer != null -> cfg.oidc.redirectURI != null;
        message = "services.fusion.oidc.redirectURI is required when OIDC is enabled.";
      }
      {
        assertion = cfg.oidc.issuer != null -> cfg.oidc.clientId != null;
        message = "services.fusion.oidc.clientId is required when OIDC is enabled.";
      }
      {
        assertion = cfg.oidc.issuer != null -> cfg.oidc.clientSecretFile != null;
        message = "services.fusion.oidc.clientSecretFile is required when OIDC is enabled.";
      }
    ];

    systemd.services.fusion = {
      description = "Fusion RSS Reader";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];

      environment = {
        FUSION_PORT = toString cfg.port;
        FUSION_DB_PATH = cfg.dbPath;
        FUSION_FEVER_USERNAME = cfg.feverUsername;
        FUSION_PULL_INTERVAL = toString cfg.pullInterval;
        FUSION_PULL_TIMEOUT = toString cfg.pullTimeout;
        FUSION_PULL_CONCURRENCY = toString cfg.pullConcurrency;
        FUSION_PULL_MAX_BACKOFF = toString cfg.pullMaxBackoff;
        FUSION_ALLOW_PRIVATE_FEEDS = lib.boolToString cfg.allowPrivateFeeds;
        FUSION_LOG_LEVEL = cfg.logLevel;
      } // lib.optionalAttrs (cfg.corsAllowedOrigins != [ ]) {
        FUSION_CORS_ALLOWED_ORIGINS = lib.concatStringsSep "," cfg.corsAllowedOrigins;
      } // lib.optionalAttrs (cfg.oidc.issuer != null) {
        FUSION_OIDC_ISSUER = cfg.oidc.issuer;
        FUSION_OIDC_CLIENT_ID = cfg.oidc.clientId;
        FUSION_OIDC_REDIRECT_URI = cfg.oidc.redirectURI;
      } // lib.optionalAttrs (cfg.oidc.allowedUser != null) {
        FUSION_OIDC_ALLOWED_USER = cfg.oidc.allowedUser;
      };

      serviceConfig = {
        ExecStart = "${cfg.package}/bin/fusion";
        DynamicUser = true;
        StateDirectory = "fusion";
        RuntimeDirectory = "fusion";
        Restart = "on-failure";
        RestartSec = 10;

        # Hardening
        ProtectSystem = "strict";
        ProtectHome = true;
        PrivateTmp = true;
        PrivateDevices = true;
        ProtectKernelTunables = true;
        ProtectKernelModules = true;
        ProtectControlGroups = true;
        NoNewPrivileges = true;
        RestrictRealtime = true;
        RestrictNamespaces = true;
        LockPersonality = true;
        MemoryDenyWriteExecute = true;
        SystemCallArchitectures = "native";
        SystemCallFilter = [ "@system-service" "~@privileged" ];
      } // lib.optionalAttrs (cfg.passwordFile != null || cfg.oidc.clientSecretFile != null) {
        LoadCredential = lib.concatStringsSep " " (
          lib.optional (cfg.passwordFile != null) "fusion-password:${cfg.passwordFile}"
          ++ lib.optional (cfg.oidc.clientSecretFile != null) "oidc-secret:${cfg.oidc.clientSecretFile}"
        );
      };

      preStart = ''
        ${lib.optionalString (cfg.passwordFile != null) ''
          echo "FUSION_PASSWORD=$(cat "$CREDENTIALS_DIRECTORY/fusion-password")" > /run/fusion/env
        ''}
        ${lib.optionalString (cfg.oidc.clientSecretFile != null) ''
          echo "FUSION_OIDC_CLIENT_SECRET=$(cat "$CREDENTIALS_DIRECTORY/oidc-secret")" >> /run/fusion/env
        ''}
      '';

      environmentFile = mkIf (cfg.passwordFile != null || cfg.oidc.clientSecretFile != null) [
        "/run/fusion/env"
      ];
    };
  })
  ];
}
