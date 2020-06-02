# This will point to the dev server run by `yarn start`
application: dev_admin_power_pack {
  label: "Admin Power Pack (Dev)"
  url: "http://localhost:8080/bundle.js"
}

# For prod you can either pull from a url, such as our github page
# Or you can point to a file right in the LookML project!
application: admin_power_pack {
  label: "Admin Power Pack"
  url: "https://davidtamaki.github.io/admin_power_pack/looker_admin_power_pack.js"
  # OR
  file: "admin_power_pack.js"
}