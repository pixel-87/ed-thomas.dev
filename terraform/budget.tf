# -----------------------------------------------------------------------------
# AWS BILLING BUDGET ($1 Alert)
# -----------------------------------------------------------------------------

resource "aws_budgets_budget" "cost_budget" {
  name         = "1-dollar-monthly-budget"
  budget_type  = "COST"
  limit_amount = "1.0"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # Alert if AWS forecasts we will hit 80% ($0.80) this month
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email_address]
  }

  # Alert if we actually hit 100% ($1.00) this month
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email_address]
  }
}
