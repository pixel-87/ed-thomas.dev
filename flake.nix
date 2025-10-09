{
  description = "My dev site, using astro";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
  };

  outputs = inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [ "x86_64-linux" "aarch64-linux" ];
      
      perSystem = { config, self', inputs', pkgs, system, ... }: {
        packages = {
          site = pkgs.callPackage ./nix/default.nix { };
          docker = pkgs.callPackage ./nix/docker.nix { 
            site = config.packages.site;
          };
          default = config.packages.site;
        };

        devShells.default = pkgs.callPackage ./nix/shell.nix { };
      };

      flake = {
        overlays.default = final: _: { 
          ed-thomas-dev = final.callPackage ./nix/default.nix { }; 
        };
      };
    };
}
