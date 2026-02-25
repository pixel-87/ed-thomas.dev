{
  description = "My dev site, using astro";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";

  outputs =
    { self, nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forAllSystems (pkgs: {
        ed-thomas-dev = pkgs.callPackage ./nix/default.nix { };
        default = self.packages.${pkgs.stdenv.hostPlatform.system}.ed-thomas-dev;

        container = pkgs.callPackage ./nix/container-image.nix {
          edThomasDev = pkgs.callPackage ./nix/default.nix { };
        };

      });

      devShells = forAllSystems (pkgs: {
        default = pkgs.callPackage ./nix/shell.nix { };
      });

      overlays.default = final: _: {
        ed-thomas-dev = final.callPackage ./nix/default.nix { };
      };
    };
}
