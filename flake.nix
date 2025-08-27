{
  description = "My hugo blog (packaged with Nix + Caddy docker image)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    # Very much inspired by https://github.com/jnsgruk/jnsgr.uk/blob/main/flake.nix
    system = "x86_64-linux";
    pkgs = nixpkgs.legacyPackages.${system};
    lib = pkgs.lib;

    siteVersion = self.shortRev or (builtins.substring 0 7 self.dirtyRev);
    siteRev = self.rev or self.dirtyRev;
    
    # Reproducible build of the static site. We avoid using ./public as an input;
    # instead we let `hugo` render directly into $out.
    site = pkgs.stdenv.mkDerivation {
      pname = "ed-thomasdev";
      version = siteVersion;
      src = lib.cleanSource ./.;

      nativeBuildInputs = [pkgs.hugo pkgs.go];
      # If the theme is a git submodule / module, ensure it's vendored beforehand
      # or add extra fetch steps here.

      installPhase = ''
        mkdir -p $out
        hugo --minify --baseURL "/" --destination "$out" --source . --config "config/_default/hugo.toml"
      '';
      # Pure build: no network access after evaluation; ensure modules are vendored.
      # If you use hugo modules, run `hugo mod vendor` and commit _vendor/.
    };

    # Minimal Caddyfile baked into the image; can be overridden at run-time.
    caddyfile = pkgs.writeText "Caddyfile" ''
      :80 {
        root * /srv
        file_server
      }
    '';

    # Docker image bundling Caddy + static site output.
    siteImage = pkgs.dockerTools.buildImage {
      name = "ed-thomas-site";
      tag = siteVersion;
      copyToRoot = pkgs.buildEnv {
        name = "image-root";
        paths = [pkgs.caddy site];
        pathsToLink = ["/bin"];
      };
      extraCommands = ''
        mkdir -p srv
        cp -a ${site}/. srv/
        mkdir -p etc
        cp ${caddyfile} etc/Caddyfile
      '';
      config = {
        ExposedPorts = {
          "80/tcp" = {};
        };
        Entrypoint = ["caddy" "run" "--config" "/etc/Caddyfile"];
      };
    };
  in {
    packages.${system} = {
      site = site;
      siteImage = siteImage;
      default = site; # `nix build` yields the static site by default
    };

    devShells.${system}.default = pkgs.mkShell {
      buildInputs = with pkgs; [
        hugo
        pandoc
        go
        caddy
        alejandra
      ];
      shellHook = ''
        echo "Entered Dev Shell"
      '';
    };
  };
}
