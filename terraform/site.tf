# -----------------------------------------------------------------------------
# PRIVATE S3 BUCKET FOR SITE FILES
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "site" {
  bucket = "ed-thomas-dev-site-assets" # Must be globally unique
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
  name                              = "ed-thomas.dev-oac"
  description                       = "OAC for ed-thomas.dev S3 Origin"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# -----------------------------------------------------------------------------
# CLOUDFRONT FUNCTION (Astro directory routing fix)
# -----------------------------------------------------------------------------

resource "aws_cloudfront_function" "rewrite_uri" {
  name    = "ed-thomas-dev-rewrite-uri"
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

# -----------------------------------------------------------------------------
# CLOUDFRONT DISTRIBUTION
# -----------------------------------------------------------------------------

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = ["backup.ed-thomas.dev"]
  price_class         = "PriceClass_100" # Cheapest option, US/Europe edge locations only

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = aws_s3_bucket.site.id
    origin_access_control_id = aws_cloudfront_origin_access_control.site_oac.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = aws_s3_bucket.site.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # Using the AWS Managed CachingOptimized policy
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

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
