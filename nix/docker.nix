{ pkgs, site }:

let
  port = "80";
in
pkgs.dockerTools.buildLayeredImage {
  name = "ed-thomas.dev";
  tag = "latest";
  
  contents = [ pkgs.static-web-server ];

  config = {
    Cmd = [ 
      "static-web-server"
      "--port" port
      "--root" site
      "--compression" "true"
      "--page-fallback" "404.html"
    ];
    ExposedPorts = {
      "${port}/tcp" = {};
    };
  };
}
