{
  description = "My dev site, using astro";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-parts,
    }:
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
          tag = "latest";

          fromImage = pkgs.dockerTools.pullImage {
            imageName = "nginx";
            imageDigest = "sha256:28402db69fec7c17e179ea87882667f1e054391138f77ffaf0c3eb388efc3ffb";
            sha256 = "0cnq8cqmkqbp9gr4vp2zzsm5mjx1md2xj5q0xh5s3bjz8dkmm0fg";
            finalImageName = "nginx";
            finalImageTag = "alpine";
          };

          runAsRoot = ''
            # Copy static site files to nginx default location
            mkdir -p /usr/share/nginx/html
            cp -a ${example}/. /usr/share/nginx/html/

            # Ensure nginx user owns the files
            chown -R nginx:nginx /usr/share/nginx/html
          '';

          config = {
            ExposedPorts = {
              "80/tcp" = { };
            };
            Cmd = [
              "nginx"
              "-g"
              "daemon off;"
            ];
          };
        };
      });

      devShells = forAllSystems (pkgs: {
        default = pkgs.callPackage ./shell.nix { };
      });

      overlays.default = final: _: { example = final.callPackage ./default.nix { }; };
    };
}
