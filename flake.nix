{
  description = "My dev site, using astro";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      forAllSystems =
        function:
        nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed (
          system: function nixpkgs.legacyPackages.${system}
        );
    in
    {
      packages = forAllSystems (pkgs: rec {
        example = pkgs.callPackage ./default.nix { };
        default = self.packages.${pkgs.stdenv.hostPlatform.system}.example;

        site = pkgs.dockerTools.buildImage {
          name = "ed-thomas.dev";

          copyToRoot = pkgs.buildEnv {
            name = "image-root";
            paths = [ pkgs.caddy example ];
            pathsToLink = [ "/bin" "/etc" ];
          };

          runAsRoot = ''
            mkdir -p /srv
            cp -a ${example}/. /srv/
          '';

          config = {
            ExposedPorts = {
              "80/tcp" = {};
              "443/tcp" = {};
            };
            Entrypoint = [ "caddy" ];
            Cmd = [ "run" "--config" "/etc/caddy/Caddyfile" ];
          };
        };
      });

      devShells = forAllSystems (pkgs: {
        default = pkgs.callPackage ./shell.nix { };
      });

      overlays.default = final: _: { example = final.callPackage ./default.nix { }; };
    };
}
