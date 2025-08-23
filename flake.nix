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
      pname = "ed-thomasdev";
      version = siteVersion;
      src = lib.cleanSource ./.;

      nativeBuildInputs = [pkgs.hugo];
      # If the theme is a git submodule / module, ensure it's vendored beforehand
      # or add extra fetch steps here.
      buildPhase = ''
                echo "Building Hugo site (production, minified)" >&2
                # Copy source to a temporary build dir so we can inject a generated
                # data file that Hugo will read at build time. This avoids needing
                # the .git metadata and lets templates access .Site.Data.build.
                rm -rf "$TMPDIR/src"
                mkdir -p "$TMPDIR/src"
                cp -a --preserve=mode . "$TMPDIR/src/"

                mkdir -p "$TMPDIR/src/data"
                cat > "$TMPDIR/src/data/build.json" <<EOF
        { "rev": "${siteRev}", "version": "${siteVersion}" }
        EOF

                hugo --minify --destination "$TMPDIR/out" --source "$TMPDIR/src"
      '';
      installPhase = ''
        mkdir -p $out
        cp -R "$TMPDIR/out"/* $out/
      '';
      # Pure build: no network access after evaluation; ensure modules are vendored.
      # If you use hugo modules, run `hugo mod vendor` and commit _vendor/.
    };

    # Minimal Caddyfile baked into the image; can be overridden at run-time.
    caddyfile = pkgs.writeText "Caddyfile" ''
      :80 {
        root * /srv
        file_server
        # Add headers / compression etc here as desired
      }
    '';

    # Docker image bundling Caddy + static site output.
    siteImage = pkgs.dockerTools.buildImage {
      name = "ed-thomasdev";
      tag = siteVersion;
      copyToRoot = pkgs.buildEnv {
        name = "image-root";
        paths = [pkgs.caddy site];
        pathsToLink = ["/bin"]; # caddy in /bin; we'll copy site manually below
      };
      extraCommands = ''
        # Place site at /srv
        mkdir -p srv
        cp -R ${site}/* srv/
        # Caddyfile
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
        echo "Dev shell: hugo available. Run 'hugo server -D' for drafts or 'hugo --minify' to rebuild." >&2
      '';
    };
  };
}
