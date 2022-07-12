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

import * as xstate from 'xstate' 

export const CREDENTIALS_INFO = Object.freeze([
    { name: 'credentials_google', label: 'google', is_sso: true, id_prop: 'google_user_id' },
    { name: 'credentials_ldap', label: 'ldap', is_sso: true, id_prop: 'ldap_id' },
    { name: 'credentials_oidc', label: 'oidc', is_sso: true, id_prop: 'oidc_user_id' },
    { name: 'credentials_saml', label: 'saml', is_sso: true, id_prop: 'saml_user_id' },
    { name: 'credentials_api3', label: 'api3', is_sso: false, id_prop: 'client_id' },
    { name: 'credentials_embed', label: 'embed', is_sso: false, id_prop: 'external_user_id' },
    { name: 'credentials_totp', label: 'totp', is_sso: false, id_prop: '<unused special case>' },
    { name: 'credentials_looker_openid', label: 'looker_openid', is_sso: false, id_prop: 'email' }
])

export const SYSTEM_USER_ATTRIBUTES = ['email', 'first_name', 'last_name']

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
).toString()

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

export const ACTION_INFO = Object.freeze({
    selectByAttribute: {
        menuTitle: "User ID or email address",
        dialogTitle: "Select Users by ID/Email"
    },
    selectByQuery: {
        menuTitle: "Query ID",
        dialogTitle: "Select Users from Query"
    },
    emailFill: {
        cred: "email",
        menuTitle: "Auto-fill from other creds",
        dialogTitle: "Auto-fill Email Credentials"
    },
    emailMap: {
        menuTitle: "Bulk update from mapping",
        dialogTitle: "Update Emails from Mapping"
    },
    emailCreate: {
        menuTitle: "Bulk create from mapping",
        dialogTitle: "Create Users from Mapping"
    },
    emailSend: {
        menuTitle: "Bulk send email creds",
        dialogTitle: "Send User Credentials to User Email"
    },
    resetToken: {
        menuTitle: "Bulk create password reset",
        dialogTitle: "Create Password Reset URL"
    },
    deleteUsers: {
        menuTitle: "Delete users",
        dialogTitle: "Permanently Delete Users"
    },
    logoutUsers: {
        menuTitle: "Logout users",
        dialogTitle: "Terminate User Sessions"
    },
    setUserAtt: {
        menuTitle: "Set User Attributes",
        dialogTitle: "Set User Attributes for Users"
    },
    deleteUserAtt: {
        menuTitle: "Delete User Attributes",
        dialogTitle: "Delete User Attributes for Users"
    },
    addUsersGroups: {
        menuTitle: "Add users to groups",
        dialogTitle: "Add Users to Groups"
    },
    removeUsersGroups: {
        menuTitle: "Remove users from groups",
        dialogTitle: "Remove Users from Groups"
    },
    setUsersRoles: {
        menuTitle: "Set roles for users",
        dialogTitle: "Set Roles for Users"
    },
    deleteCreds: {
        dialogTitle: "Delete Credentials"
    },
    enableDisable: {
        dialogTitle: "Enable/Disable Users"
    }
})

export const WORKFLOW_MACHINE = xstate.Machine({
    id: 'workflow',
    initial: 'closed',
    context: {
        appAction: null,
        deleteCredsType: null,
        enableDisableType: null
    },
    states: {
        closed: {
            on: {
                CONFIGURE: {
                    target: 'configuring', 
                    // Note: xstate just happens to use the term "action" for a function that gets triggered
                    // upon a transition. So we use the name "appAction" to distinguish from what APP is doing
                    actions: [
                        xstate.assign({ appAction: (_, event) => event.appAction }),
                        xstate.assign({ deleteCredsType: (_, event) => event.deleteCredsType }),
                        xstate.assign({ enableDisableType: (_, event) => event.enableDisableType })
                    ]
                },
                REVIEW: 'reviewing'
            },
        },
        configuring: {
            on: {
                RUN: 'running',
                CLOSE: 'closed'
            },
        },
        running: {
            on: {
                REVIEW: 'reviewing',
            },
        },
        reviewing: {
            on: {
                CLOSE: 'closed',
            },
        },
    }
})