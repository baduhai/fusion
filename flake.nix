{
  description = "Fusion - lightweight RSS reader and aggregator";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    {
      nixosModules = {
        default = { self, ... }: {
          imports = [ ./nix/module.nix ];
          nixpkgs.overlays = [ self.overlays.default ];
        };
        fusion = { self, ... }: {
          imports = [ ./nix/module.nix ];
          nixpkgs.overlays = [ self.overlays.default ];
        };
      };

      overlays.default = final: prev: {
        fusion = self.packages.${final.system}.default;
      };
    }
    // flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        version = "1.2.0";

        frontendDist = pkgs.buildNpmPackage {
          name = "fusion-frontend-${version}";
          src = ./frontend;
          npmDepsHash = "sha256-/CcVE4y+wFakIrJIiRHM5mur52Xe4aSZG3Zshjk++Ag=";
          npmBuild = "npm run build";
          installPhase = "cp -r dist $out";
        };
      in
      {
        packages.default = pkgs.buildGoModule {
          pname = "fusion";
          inherit version;
          src = ./.;
          vendorHash = "sha256-jZLsvmpkRH4NPLQM1gFZ06NPCk0YfsR1aBOwcSSIeE4=";
          modRoot = "backend";
          subPackages = [ "cmd/fusion" ];
          ldflags = [ "-s" "-w" ];

          postPatch = ''
            rm -rf backend/internal/web/dist
            mkdir -p backend/internal/web/dist
            cp -r ${frontendDist}/* backend/internal/web/dist/
          '';
        };

        packages.fusion = self.packages.${system}.default;

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            go
            nodejs_22
            pnpm
          ];

          shellHook = ''
            export PATH="$HOME/go/bin:$PATH"
            echo "Go  $(go version)"
            echo "Node $(node --version)"
            echo "pnpm $(pnpm --version)"
          '';
        };
      });
}
