project_name: "admin_power_pack"

# You can point to a file right in the lookml project,
# or you can point to a url such as our github page.
application: admin_power_pack {
  label: "Admin Power Pack"
  file: "dist/looker_admin_power_pack.js"
  # url: "https://looker-open-source.github.io/admin_power_pack/dist/looker_admin_power_pack.js"
  entitlements: {
    local_storage: no
    navigation: yes
    new_window: yes
    new_window_external_urls: ["https://docs.looker.com"]
    use_form_submit: yes
    use_embeds: no
    core_api_methods: [
      "all_roles", "all_users", "all_groups", "all_datagroups",
      "me", "user", "create_user", "update_user", "delete_user", "send_user_credentials_email_password_reset", "create_user_credentials_email_password_reset",
      "all_user_attributes", "set_user_attribute_user_value", "delete_user_attribute_user_value",
      "add_group_user", "delete_group_user", "set_user_roles",
      "all_dashboards", "dashboard", "run_query", "query_for_slug", "create_query",
      "scheduled_plan", "all_scheduled_plans", "scheduled_plans_for_dashboard", "scheduled_plan_run_once", "scheduled_plan_run_once_by_id",
      "create_scheduled_plan", "update_scheduled_plan", "delete_scheduled_plan",
      "create_user_credentials_email", "update_user_credentials_email",
      "delete_user_credentials_email", "delete_user_credentials_google", "delete_user_credentials_ldap", "delete_user_credentials_oidc", "delete_user_credentials_saml",
      "all_user_sessions", "delete_user_session"    
    ]
  } 
}

# This will point to the dev server run by `yarn start`
# application: dev_admin_power_pack {
#   label: "Admin Power Pack (Dev)"
#   url: "http://localhost:8080/bundle.js" 
# }

constant: CONNECTION_NAME {
  value: "admin_power_pack_stub"
  export: override_optional
}

constant: VERSION {
  value: "v1.0.2"
}