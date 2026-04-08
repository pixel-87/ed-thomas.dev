# -----------------------------------------------------------------------------
# EXISTING CLOUDFLARE DNS RECORDS
# -----------------------------------------------------------------------------

# --- Resource Definitions ---

resource "cloudflare_record" "root_a" {
  zone_id = var.cloudflare_zone_id
  name    = var.domain_name
  content = aws_cloudfront_distribution.site.domain_name
  type    = "CNAME"
  proxied = false
}

resource "cloudflare_record" "www_cname" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  content = aws_cloudfront_distribution.site.domain_name
  type    = "CNAME"
  proxied = false
}

resource "cloudflare_record" "grafana_cname" {
  zone_id = var.cloudflare_zone_id
  name    = "grafana"
  content = var.domain_name
  type    = "CNAME"
  proxied = false
}

resource "cloudflare_record" "google_txt" {
  zone_id = var.cloudflare_zone_id
  name    = var.domain_name
  content = "google-site-verification=FLFPuYo330nrkjxfEKaYKZOV0jwQZXthO0nbkPjs9mc"
  type    = "TXT"
}

# -----------------------------------------------------------------------------
# FAILOVER BACKEND RECORD
# -----------------------------------------------------------------------------

resource "cloudflare_record" "home_a" {
  zone_id = var.cloudflare_zone_id
  name    = "home"
  content = var.home_ip
  type    = "A"
  proxied = false
}
