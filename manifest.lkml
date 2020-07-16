# This will point to the dev server run by `yarn start`
application: dev_admin_power_pack {
  label: "Admin Power Pack (Dev)"
  url: "http://localhost:8080/bundle.js" 
}

# For prod you can either pull from a url, such as our public github page
# Or you can point to a file right in the LookML project!
application: admin_power_pack {
  label: "Admin Power Pack"
  url: "https://davidtamaki.github.io/admin_power_pack/looker_admin_power_pack.js"
  # OR
  file: "looker_admin_power_pack.js"
  # See documentation about entitlements at: https://docs.looker.com/reference/manifest-params/application?#entitlements
  entitlements: {
    local_storage: no
    navigation: yes
    new_window: yes
    allow_forms: yes
    allow_same_origin: no
    core_api_methods: [
      "all_roles", "all_users", "all_groups", "all_datagroups", 
      "me", "user", "update_user",
      "dashboard", "run_query", "query_for_slug", 
      "scheduled_plans_for_dashboard", "scheduled_plan_run_once",
      "create_scheduled_plan", "update_scheduled_plan", "delete_scheduled_plan",
      "create_user_credentials_email", "update_user_credentials_email",
      "delete_user_credentials_email", "delete_user_credentials_google", "delete_user_credentials_ldap", "delete_user_credentials_oidc", "delete_user_credentials_saml" 
    ]
  } 
}