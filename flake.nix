{
  description = "My hugo blog (packaged with Nix + Caddy docker image)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    system = "x86_64-linux";
    pkgs = nixpkgs.legacyPackages.${system};
    lib = pkgs.lib;

    siteVersion = self.shortRev or (builtins.substring 0 7 self.dirtyRev);
    siteRev = self.rev or self.dirtyRev;

    # Reproducible build of the static site. We avoid using ./public as an input;
    # instead we let `hugo` render directly into $out.
    site = pkgs.stdenv.mkDerivation {
      pname = "ed-thomas.dev";
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
      # If using hugo modules, run `hugo mod vendor` and commit _vendor/.
    };

    # Docker image bundling Caddy + static site output.
    siteImage = pkgs.dockerTools.buildImage {
      name = "ed-thomas.dev";
      tag = siteVersion;
      copyToRoot = pkgs.buildEnv {
        name = "image-root";
        paths = [pkgs.caddy site];
        pathsToLink = ["/bin"];
      };
      extraCommands = ''
        mkdir -p srv
        cp -a ${site}/. srv/
      '';
      config = {
        ExposedPorts = {
          "80/tcp" = {};
        };
        Entrypoint = ["caddy"];
        Cmd = ["file-server" "--root" "/srv" "--listen" ":80"];
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
