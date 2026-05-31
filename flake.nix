{
  description = "Fusion - lightweight RSS reader and aggregator";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
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
