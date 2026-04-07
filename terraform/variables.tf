variable "aws_region" {
  type        = string
  description = "The AWS region to deploy to."
  default     = "us-east-1"
}

variable "state_bucket_name" {
  type        = string
  description = "The name of the S3 bucket to store Terraform state."
  default     = "ed-thomas-dev-tf-state"
}

variable "cloudflare_api_token" {
  type        = string
  description = "Cloudflare API token used to manage DNS records."
  sensitive   = true
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Cloudflare zone ID for ed-thomas.dev."
}

variable "alert_email_address" {
  type        = string
  description = "Email address to receive AWS billing alerts."
}
