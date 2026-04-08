# -----------------------------------------------------------------------------
# PRIVATE S3 BUCKET FOR SITE FILES
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "site" {
  bucket = "${replace(var.domain_name, ".", "-")}-site-assets"
}

resource "aws_s3_bucket_public_access_block" "site_pab" {
  bucket = aws_s3_bucket.site.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# -----------------------------------------------------------------------------
# CLOUDFRONT ORIGIN ACCESS CONTROL (OAC)
# -----------------------------------------------------------------------------

resource "aws_cloudfront_origin_access_control" "site_oac" {
  name                              = "${replace(var.domain_name, ".", "-")}-oac"
  description                       = "OAC for ${var.domain_name} S3 Origin"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# -----------------------------------------------------------------------------
# CLOUDFRONT FUNCTION (Astro directory routing fix)
# -----------------------------------------------------------------------------

resource "aws_cloudfront_function" "rewrite_uri" {
  name    = "${replace(var.domain_name, ".", "-")}-rewrite-uri"
  runtime = "cloudfront-js-2.0"
  comment = "Appends index.html to directory requests"
  publish = true
  code    = <<-EOT
    function handler(event) {
        var request = event.request;
        var uri = request.uri;

        // Check whether the URI is missing a file name.
        if (uri.endsWith('/')) {
            request.uri += 'index.html';
        } 
        // Check whether the URI is missing a file extension.
        else if (!uri.includes('.')) {
            request.uri += '/index.html';
        }

        return request;
    }
  EOT
}

data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewer"
}

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

# -----------------------------------------------------------------------------
# CLOUDFRONT DISTRIBUTION
# -----------------------------------------------------------------------------

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain_name, "www.${var.domain_name}", "backup.${var.domain_name}"]
  price_class         = "PriceClass_100" # Cheapest option, US/Europe edge locations only

  origin {
    domain_name = cloudflare_record.home_a.hostname
    origin_id   = "home_server"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 4
    }

    connection_attempts = 2
    connection_timeout  = 4
  }

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = aws_s3_bucket.site.id
    origin_access_control_id = aws_cloudfront_origin_access_control.site_oac.id
  }

  origin_group {
    origin_id = "failover_group"

    failover_criteria {
      status_codes = [500, 502, 503, 504]
    }

    member {
      origin_id = "home_server"
    }

    member {
      origin_id = aws_s3_bucket.site.id
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "failover_group"

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # Using the AWS Managed CachingOptimized policy
    cache_policy_id = data.aws_cloudfront_cache_policy.optimized.id

    # Forward the Host header to the origin so SNI matches the live domain
    # AWS Managed AllViewerOriginRequest policy forwards Host
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id



    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite_uri.arn
    }
  }

  # Astro's default 404 page is 404.html
  custom_error_response {
    error_code            = 403 # S3 returns 403 Forbidden for missing files when OAC is used
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 300
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.site_cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

# -----------------------------------------------------------------------------
# S3 BUCKET POLICY (Allow CloudFront to read)
# -----------------------------------------------------------------------------

data "aws_iam_policy_document" "site_bucket_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site_policy" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.site_bucket_policy.json
}

# -----------------------------------------------------------------------------
# CLOUDFLARE DNS ROUTE FOR BACKUP SITE
# -----------------------------------------------------------------------------

resource "cloudflare_record" "backup_cname" {
  zone_id = var.cloudflare_zone_id
  name    = "backup"
  content = aws_cloudfront_distribution.site.domain_name
  type    = "CNAME"
  proxied = false # Important: Keep false for now to avoid SSL conflicts/double CDN
}
