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
    Pagination, PageSize,
    Flex, Box, Grid,
    Text, Tooltip,
    Link, Icon
} from '@looker/components'

export class UsersTable extends React.Component {
    static contextType = ExtensionContext

    constructor(props) {
        super(props)
    }

    /*
     ******************* HELPERS *******************
     */   
    makeRowFormatter(user) {
        const args = {}
        if (user.is_disabled) {
           args["color"] = "neutral"
        }
        return (inner) => { return <Box {...args} >{inner}</Box> }
    }

    totalRows() {
        return this.props.usersList.length
    }

    indexIsInCurrentPage(index) {
        return Math.floor(index / this.props.pageSize)+1 === this.props.currentPage
    }

    /*
     ******************* RENDERING *******************
     */
    renderUser(user) {
        const formatIfDisabled = this.makeRowFormatter(user)
        const groups = user.group_ids.map(gid => this.props.groupsMap.get(gid) || {id: gid, name: `!! Error - unknown group id ${gid} !!`})
        const roles = user.role_ids.map(rid => this.props.rolesMap.get(rid) || {id: rid, name: `Embed-role-id-${rid}`})

        const actions = (
            <ActionListItemAction>
                <Link onClick={() => this.context.extensionSDK.openBrowserWindow(`/admin/users/${user.id}/edit`, '_blank')} >
                    Edit <Icon name="External" />
                </Link>
            </ActionListItemAction>
        )

        // Use embed-specific rendering when embed filter is active
        if (this.props.activeShowWhoButton === "embed") {
            return (
                <ActionListItem
                    key={user.id}
                    id={user.id}
                    actions={actions}
                >
                    <ActionListItemColumn>{formatIfDisabled(user.id)}</ActionListItemColumn>
                    <ActionListItemColumn>{formatIfDisabled(this.renderDisplayName(user))}</ActionListItemColumn>
                    <ActionListItemColumn>{formatIfDisabled(this.renderEmbedUserId(user))}</ActionListItemColumn>
                    <ActionListItemColumn>{formatIfDisabled(this.renderExternalGroupId(user))}</ActionListItemColumn>
                    <ActionListItemColumn>{formatIfDisabled(groups.map(g => g.name).join(", "))}</ActionListItemColumn>
                </ActionListItem>
            )
        }

        // Regular user rendering
        return (
            <ActionListItem
                key={user.id}
                id={user.id}
                actions={actions}
            >
                <ActionListItemColumn>{formatIfDisabled(user.id)}</ActionListItemColumn>
                <ActionListItemColumn>{formatIfDisabled(this.renderDisplayName(user))}</ActionListItemColumn>
                <ActionListItemColumn>{formatIfDisabled(this.renderEmail(user))}</ActionListItemColumn>
                <ActionListItemColumn>{formatIfDisabled(this.renderOtherCreds(user))}</ActionListItemColumn>
                <ActionListItemColumn>{formatIfDisabled(groups.map(g => g.name).join(", "))}</ActionListItemColumn>
                <ActionListItemColumn>{formatIfDisabled(roles.map(r => r.name).join(", "))}</ActionListItemColumn>
            </ActionListItem>
        )
    }

    renderDisplayName(user) {
        if (user.is_disabled) {
            return (
                <Tooltip content="User is disabled">
                    <span>{user.display_name}</span>
                </Tooltip>
            )
        }
        return <span>{user.display_name}</span>
    }

    renderEmail(user) {
        return <InlineEditEmail user={user} />
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

    renderEmbedUserId(user) {
        if (user.credentials_embed && user.credentials_embed.length > 0) {
            return user.credentials_embed.map((embedCred, index) => (
                <Box key={`user-${user.id}-embed-${index}`}>
                    <Text fontSize="xsmall">
                        {embedCred.external_user_id ? (
                            <Link 
                                onClick={() => this.props.onExternalUserIdClick(embedCred.external_user_id)}
                                style={{ cursor: 'pointer' }}
                            >
                                {embedCred.external_user_id}
                            </Link>
                        ) : (
                            'No external user ID'
                        )}
                    </Text>
                </Box>
            ))
        }
        return <Text fontSize="xsmall" color="neutral">No embed credentials</Text>
    }

    renderExternalGroupId(user) {
        if (user.credentials_embed && user.credentials_embed.length > 0) {
            return user.credentials_embed.map((embedCred, index) => (
                <Box key={`user-${user.id}-group-${index}`}>
                    <Text fontSize="xsmall">
                        {embedCred.external_group_id ? (
                            <Link 
                                onClick={() => this.props.onExternalGroupIdClick(embedCred.external_group_id)}
                                style={{ cursor: 'pointer' }}
                            >
                                {embedCred.external_group_id}
                            </Link>
                        ) : (
                            'No external group ID'
                        )}
                    </Text>
                </Box>
            ))
        }
        return <Text fontSize="xsmall" color="neutral">No embed credentials</Text>
    }

    renderCounts() {
        const userTypeText = this.props.activeShowWhoButton === "embed" ? "embed users" : "users"
        return (
            <Text fontSize="small">
            {this.props.selectedUserIds.size} selected • {this.props.usersList.length} in filtered table • {this.props.totalUsersCount} total {userTypeText}
            </Text>
        )
    }

    renderPageSelector() {
        return (
            <Pagination
                current={this.props.currentPage}
                pages={Math.ceil(this.totalRows() / this.props.pageSize)}
                onChange={this.props.onChangePage}
            />
        )
    }

    renderPageSize() {
        return (
            <PageSize
                value={this.props.pageSize}
                options={[5, 10, 20, 50, 100]}
                total={this.props.usersList.length}
                onChange={this.props.onChangePageSize}
            />
        )
    }

    render() {
        const usersInPage = this.props.usersList.filter( (u,index) => this.indexIsInCurrentPage(index) )
        
        // We pass all user ids to pageItems because our onSelectAll method
        // goes across pages. The select all checkbox state would not work correctly
        // if we only pass the ids on the current page.
        const allUserIds = this.props.usersList.map(u => u.id)
          
        return (
            <Flex flexDirection="column" alignItems="center">
                <Box width="100%" mb="small">
                <ActionListManager isLoading={this.props.isLoading} noResults={false}>
                    <Grid columns={3}>
                        <Box justifySelf="left">{this.renderCounts()}</Box>
                        <Box justifySelf="center">{this.renderPageSelector()}</Box>
                        <Box justifySelf="right">{this.renderPageSize()}</Box>
                    </Grid>
                    <ActionList
                        select={{
                            selectedItems: Array.from(this.props.selectedUserIds),
                            pageItems: allUserIds,
                            onClickRowSelect: false,
                            onSelect: (user_id) => this.props.onSelectRow(user_id),
                            onSelectAll: () => this.props.onSelectAll()
                        }}
                        onSort={this.props.onSort}
                        columns={this.props.tableColumns}
                    >
                        {usersInPage.map(u => this.renderUser(u))}
                    </ActionList> 
                </ActionListManager>
                </Box>
                {this.renderPageSelector() /* show again at bottom of table */}    
                </Flex>
        )
    }
}