{ pkgs, edThomasDev }:

let
  port = "80";
  # Read the SWS configuration directly from the tracked file to keep them in sync
  swsConfig = ./sws.toml;
in
pkgs.dockerTools.buildLayeredImage {
  name = "ed-thomas.dev";
  tag = "latest";

  contents = [ pkgs.static-web-server ];

  config = {
    Cmd = [
      "static-web-server"
      "--config-file"
      swsConfig
      "--port"
      port
      "--root"
      edThomasDev
      "--compression"
      "true"
      "--page-fallback"
      "404.html"
      "--accept-markdown"
      "true"
    ];
    ExposedPorts = {
      "${port}/tcp" = { };
    };
  };
}
