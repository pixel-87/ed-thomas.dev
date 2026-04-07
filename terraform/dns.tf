# -----------------------------------------------------------------------------
# EXISTING CLOUDFLARE DNS RECORDS
# -----------------------------------------------------------------------------

# --- Resource Definitions ---

resource "cloudflare_record" "root_a" {
  zone_id = var.cloudflare_zone_id
  name    = "ed-thomas.dev"
  content = var.home_ip
  type    = "A"
  proxied = false
  # ttl     = 1 # 1 means Automatic in Cloudflare v4
}

resource "cloudflare_record" "www_cname" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  content = "ed-thomas.dev"
  type    = "CNAME"
  proxied = false
  # ttl     = 1
}

resource "cloudflare_record" "grafana_cname" {
  zone_id = var.cloudflare_zone_id
  name    = "grafana"
  content = "ed-thomas.dev"
  type    = "CNAME"
  proxied = false
  # ttl     = 1
}

resource "cloudflare_record" "google_txt" {
  zone_id = var.cloudflare_zone_id
  name    = "ed-thomas.dev"
  content = "google-site-verification=FLFPuYo330nrkjxfEKaYKZOV0jwQZXthO0nbkPjs9mc"
  type    = "TXT"
  # ttl     = 1
}
