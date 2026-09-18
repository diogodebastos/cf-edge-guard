variable "zone_name" {
  description = "The Cloudflare zone this PoC manages (TF_VAR_zone_name)."
  type        = string
}

variable "hostname" {
  description = "Hostname Edge Guard is served on (TF_VAR_hostname)."
  type        = string
}

variable "account_id" {
  description = "Cloudflare account ID. Defaults to the CLOUDFLARE_ACCOUNT_ID env var."
  type        = string
  default     = null
}

# Bot Fight Mode is zone-wide and cannot be scoped to a single hostname on the
# Free plan, so it is applied as a deliberate second step. Flip to true and
# re-apply once you accept that it also covers the main site.
variable "enable_bot_fight_mode" {
  description = "Enable zone-wide Bot Fight Mode."
  type        = bool
  default     = true
}
