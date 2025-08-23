# TODO — package & deploy site

This file records the concrete plan of action, commands and suggested improvements for packaging the Hugo site and producing a Docker image that bundles Caddy + the built static files.

## High-level plan

- Test serving locally with Caddy (dev shell).
- Add a reproducible `site` package to `flake.nix` that builds the static files via `hugo`.
- Add a `siteImage` package to `flake.nix` (using `dockerTools.buildImage`) that bundles Caddy and the `site` output.
- Build the image (`nix build .#siteImage`), load it locally, test with `docker run`.
- Deploy the artifact to Ubuntu for now (scp/rsync `nix build .#site` result or push docker image to registry).
- Later: add CI job and/or NixOS/Kubernetes deployment (container image or NixOS `services.caddy` pointing at the store path).

## Checklist

- [ ] Add `caddy` to `devShell` (already present?) and confirm `caddy run` works in `nix develop`.
- [ ] Create a `Caddyfile` in repo root (or `deploy/Caddyfile`) that serves `./public` or `/srv`.
- [ ] Add `packages.${system}.site` derivation to `flake.nix` (build with `${pkgs.hugo}/bin/hugo -s ${toString ./.} -d $out --minify`).
- [ ] Add `packages.${system}.siteImage` using `pkgs.dockerTools.buildImage` copying the site into `/srv` and including `Caddyfile`.
- [ ] Run `nix build .#site` and inspect `./result`.
- [ ] Run `nix build .#siteImage` and load the tarball: `docker load < result`.
- [ ] Test image locally: `docker run --rm -p 8080:80 ed-thomas-site:latest`.
- [ ] Deploy: either (a) copy `result/` to `/var/www/...` and use systemd + Caddy on Ubuntu, or (b) push image to registry and deploy to Kubernetes.
- [ ] Commit `flake.lock` and document required Nix features in `README.md`.

## Useful commands

Enter dev shell (from project root):

```bash
nix develop
```

Build the reproducible site artifact:

```bash
nix build .#site
# static output in ./result
```

Build the docker image tarball and load it into Docker:

```bash
nix build .#siteImage
# result is a tarball (or image depending on dockerTools version)

docker load < result
docker tag ed-thomas-site:latest youruser/ed-thomas-site:latest
docker push youruser/ed-thomas-site:latest
```

Quick local test (serve ./public directly with Caddy):

```bash
# build site into ./public for quick iteration
hugo -D -d public
# run caddy using repo Caddyfile which points to ./public
caddy run --config Caddyfile
```

## Improvements & notes

- Commit `flake.lock` to the repo so collaborators and CI get the same inputs.
- Consider pinning `nixpkgs` to a specific commit for stricter reproducibility.
- Use a CI job that runs `nix build .#site` and `nix build .#siteImage` to verify builds on each push.
- Use binary caches or CI image registry to avoid long rebuilds on other machines.
- Build images for target architecture(s) if you need ARM support.
- Run Caddy in the container as a non-root user where possible and add a small healthcheck for k8s readiness/liveness.
- For production TLS, let Caddy obtain certs automatically (do not use `tls internal` on public sites).
- If you move to NixOS, you can serve the flake-built store path directly with `services.caddy` (very reproducible).
- If deploying to k8s, consider building an OCI image in the flake and publishing it to a registry from CI.

## Next steps (suggested immediate actions)

1. Create `Caddyfile` and verify `caddy run` serves `./public` inside `nix develop`.
2. Add `packages.${system}.site` to `flake.nix` and run `nix build .#site`.
3. Add `packages.${system}.siteImage`, build and test image locally. Push to registry when happy.

---

If you want, I can apply the `flake.nix` patch that adds `packages.${system}.site` and `siteImage` now, or produce a `Caddyfile` + systemd unit file for your Ubuntu host. Which should I do next?



{
  description = "A reproducible Hugo blog with Caddy";
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github.com/numtide/flake-utils";
  };
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        # This is the Nix package for your Hugo blog's static files.
        # It's a standard derivation that builds the site.
        my-blog-package = pkgs.stdenv.mkDerivation {
          pname = "my-hugo-blog";
          version = "1.0";
          src = ./.; # The source is your entire project directory
          nativeBuildInputs = [ pkgs.hugo ];
          buildPhase = ''
            echo "Building Hugo site..."
            hugo --minify
          '';
          installPhase = ''
            echo "Copying public directory to output..."
            cp -r public $out
          '';
        };
      in
      {
        # This is the final Docker image package.
        # It takes the blog package and the Caddy package and combines them.
        packages.default = pkgs.dockerTools.buildImage {
          name = "my-hugo-blog";
          tag = "latest";
          copyToRoot = pkgs.buildEnv {
            name = "image-root";
            paths = [ pkgs.caddy my-blog-package ];
            pathsToLink = [ "/bin" "/public" ];
          };
          config = {
            Entrypoint = [ "${pkgs.caddy}/bin/caddy" "run" "--config" "/etc/Caddyfile" "--adapter" "caddyfile" ];
            Expose = [ "80" "443" ];
          };
          extraConfig = {
            "/etc/Caddyfile" = ''
              :80 {
                root * /public
                file_server
              }
            '';
          };
        };

        # This is a devShell that provides the Hugo command.
        devShells.default = pkgs.mkShell {
          packages = [ pkgs.hugo ];
        };
      });
}


