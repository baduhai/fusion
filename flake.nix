{
  description = "Fusion - lightweight RSS reader and aggregator";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    {
      nixosModules = {
        default = import ./nix/module.nix;
        fusion = import ./nix/module.nix;
      };
    }
    // flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        version = "0.0.0";

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

          preBuild = ''
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
