# -----------------------------------------------------------------------------
# ACM CERTIFICATE
# -----------------------------------------------------------------------------

resource "aws_acm_certificate" "site_cert" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  tags = {
    Name = "${var.domain_name}-cert"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# AUTOMATIC CLOUDFLARE DNS VALIDATION
# -----------------------------------------------------------------------------

resource "cloudflare_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.site_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    } if dvo.domain_name == var.domain_name # AWS issues the exact same CNAME for both root and wildcard, so we only need to create one
  }

  zone_id = var.cloudflare_zone_id
  name    = each.value.name
  content = each.value.record
  type    = each.value.type
  proxied = false
}

resource "aws_acm_certificate_validation" "site_cert_validation" {
  certificate_arn         = aws_acm_certificate.site_cert.arn
  validation_record_fqdns = [for record in cloudflare_record.cert_validation : record.hostname]
}
