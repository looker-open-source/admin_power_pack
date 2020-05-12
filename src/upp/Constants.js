/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2020 Looker Data Sciences, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

export const CREDENTIALS_INFO = Object.freeze([
    {name: 'credentials_google', label: 'google', is_sso: true,  id_prop: 'google_user_id'},
    {name: 'credentials_ldap',   label: 'ldap',   is_sso: true,  id_prop: 'ldap_id'},
    {name: 'credentials_oidc',   label: 'oidc',   is_sso: true,  id_prop: 'oidc_user_id'},
    {name: 'credentials_saml',   label: 'saml',   is_sso: true,  id_prop: 'saml_user_id'},
    {name: 'credentials_api3',   label: 'api3',   is_sso: false, id_prop: 'client_id'},  
    {name: 'credentials_embed',  label: 'embed',  is_sso: false, id_prop: 'external_user_id'},
    {name: 'credentials_totp',   label: 'totp',   is_sso: false, id_prop: '<unused special case>'},
    {name: 'credentials_looker_openid', label: 'looker_openid', is_sso: false, id_prop: 'email'}
  ])

export const USER_FIELDS = Object.freeze(
    CREDENTIALS_INFO.map(cred => cred['name']
    ).concat(
        "id",
        "email",
        "credentials_email",
        "display_name",
        "role_ids",
        "group_ids",
        "is_disabled",
        "verified_looker_employee"
    )
)

export const TABLE_COLUMNS = [
    {
      id: 'id',
      title: 'ID',
      primaryKey: true,
      canSort: true,
      type: 'number',
      widthPercent: 5,
    },
    {
      id: 'display_name',
      title: 'Name',
      canSort: true,
      type: 'string',
      widthPercent: 15
    },
    {
      id: 'credentials_email',
      title: 'Email Credentials',
      type: 'string',
      widthPercent: 20
    },
    {
      id: 'other_credentials',
      title: 'Other Credentials',
      type: 'string',
      widthPercent: 20
    },
    {
      id: 'groups',
      title: 'Groups',
      type: 'string',
      widthPercent: 20
    },
    {
      id: 'roles',
      title: 'Roles',
      type: 'string',
      widthPercent: 20
    },
  ]