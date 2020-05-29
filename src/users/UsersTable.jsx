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

import React from 'react'
import { ExtensionContext } from '@looker/extension-sdk-react'
import { CREDENTIALS_INFO } from './constants.js'
import { InlineEditEmail } from './InlineEditEmail.jsx'
import {
    ActionListManager, ActionList,
    ActionListItem, ActionListItemColumn, ActionListItemAction,
    Flex,
    Box,
    Text,
    Tooltip,
    Link,
    Icon
} from '@looker/components'

export class UsersTable extends React.Component {
    static contextType = ExtensionContext

    constructor(props) {
        super(props)
    }

makeRowFormatter(user) {
    const args = {}
    if (user.is_disabled) {
       args["color"] = "palette.charcoal400"
    }
    return (inner) => { return <Box {...args} >{inner}</Box> }
}

    renderOtherCreds(user) {
        // Take the list of all credential types and add this user's value for that cred type to each
        const used_creds = CREDENTIALS_INFO.map(cred =>
            Object.assign(cred, { value: user[cred.name] })
            // Omit the values that turn out to be null or undefined
        ).filter(cred => Boolean(cred.value)
            // Some cred types return an array (eg API3) so map those into multiple top-level outputs
            // This handles when it is an empty array too
        ).flatMap(cred => {
            if (!Array.isArray(cred.value)) {
                return cred
            } else {
                return cred.value.map(val => {
                    const updated = { ...cred }
                    updated.value = val
                    return updated
                })
            }
        })

        return (
            used_creds.map((cred, index) => {
                return (
                    <Box key={`user-${user.id}-creds-${index}`}>
                        <Text fontSize="xsmall" fontWeight="bold">{cred.label}: </Text>
                        <Text fontSize="xsmall">
                            {cred.label == "totp"
                                ? (cred.value.is_disabled ? "disabled" : "enabled")
                                : String(cred.value[cred.id_prop])
                            }
                        </Text>
                    </Box>
                )
            })
        )
    }

    renderDisplayName(user) {
        if (user.is_disabled) {
            return (
                <Tooltip content="User is disabled">
                    <Flex alignItems="center">
                        {user.display_name} &nbsp;
                        <Icon name="Block" size={12}/>
                    </Flex>
                </Tooltip>
            )
        }
        return <span>{user.display_name}</span>
    }

    renderUser(user) {
        const formatIfDisabled = this.makeRowFormatter(user)
        const groups = user.group_ids.map(gid => this.props.groupsMap.get(gid) || {id: gid, name: `!! Error - unknown group id ${gid} !!`})
        const roles = user.role_ids.map(rid => this.props.rolesMap.get(rid) || {id: rid, name: `Embed-role-id-${rid}`})

        const actions = (
            <ActionListItemAction>
                <Link
                    onClick={() => this.context.extensionSDK.openBrowserWindow(`/admin/users/${user.id}/edit`, '_blank')}
                >
                    Edit <Icon name="External" />
                </Link>
            </ActionListItemAction>
        )
        return (
            <ActionListItem
                key={user.id}
                id={user.id}
                actions={actions}
            >
                <ActionListItemColumn>{formatIfDisabled(user.id)}</ActionListItemColumn>
                <ActionListItemColumn>{formatIfDisabled(this.renderDisplayName(user))}</ActionListItemColumn>
                <ActionListItemColumn>{formatIfDisabled(<InlineEditEmail user={user} />)}</ActionListItemColumn>
                <ActionListItemColumn>{formatIfDisabled(this.renderOtherCreds(user))}</ActionListItemColumn>
                <ActionListItemColumn>{formatIfDisabled(groups.map(g => g.name).join(", "))}</ActionListItemColumn>
                <ActionListItemColumn>{formatIfDisabled(roles.map(r => r.name).join(", "))}</ActionListItemColumn>
            </ActionListItem>
        )
    }

    render() {
        return (
            <>
            <ActionListManager isLoading={this.props.isLoading} noResults={false}>
                <ActionList
                    canSelect
                    onSelect={(user_id) => this.props.onSelectRow(user_id)}
                    onSelectAll={() => this.props.onSelectAll()}
                    itemsSelected={Array.from(this.props.selectedUserIds)}
                    onSort={this.props.onSort}
                    columns={this.props.tableColumns}
                >
                    {this.props.usersList.map(u => this.renderUser(u))}
                </ActionList>
            </ActionListManager>
            </>
        )
    }
}