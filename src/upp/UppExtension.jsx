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
import { UserTable } from './UserTable.jsx'
import { ActionsBar } from './ActionsBar.jsx'
import { USER_FIELDS } from './Constants.js'
import { ExtensionContext } from '@looker/extension-sdk-react'
import { hot } from "react-hot-loader/root"
import { 
    Heading, 
    Banner, 
    Box, 
    Flex, 
} from '@looker/components'

class UppExtensionInternal extends React.Component {
    static contextType = ExtensionContext

    constructor(props) {
        super(props)
        
        this.loadingComponent = props.loadingComponent
        
        this.state = {
            sdkUsersById: new Map(),
            sdkGroupsById: new Map(),
            sdkRolesById: new Map(),
            selectedUserIds: new Set(),
            isLoading: false,
            selectAllIsChecked: false,
            errorMessage: undefined
        }
    }

    componentDidMount() {
        if (this.initializeError) { return }
        this.loadUsersAndStuff()
    }

    call_looker(func, ...args) {
        console.log(`calling endpoint: ${func}   args: ${args}`)
        return this.context.coreSDK.ok(this.context.coreSDK[func](...args))
    }

    async loadUsersAndStuff() {
        this.setState({ isLoading: true, errorMessage: undefined })
        try {
            //throw "test"

            const [userResult, groupsResult, rolesResult] = await Promise.all([
                this.call_looker('all_users', {fields: USER_FIELDS}),
                this.call_looker('all_groups', {}),
                this.call_looker('all_roles', {})
            ])

            console.log("~~~~~ All Groups ~~~~")
            console.log(groupsResult)
            console.log("~~~~~ All Roles ~~~~")
            console.log(rolesResult)
            
            const sdkUsersById = new Map(userResult.map(u => [u.id, u]))
            const sdkGroupsById = new Map(groupsResult.map(g => [g.id, g]))
            const sdkRolesById = new Map(rolesResult.map(r => [r.id, r]))

            this.setState({
                sdkUsersById: sdkUsersById,
                sdkGroupsById: sdkGroupsById,
                sdkRolesById: sdkRolesById,
                isLoading: false,
            })
        } catch (error) {
            console.log(error)
            this.setState({
                sdkUsersById: new Map(),
                sdkGroupsById: new Map(),
                sdkRolesById: new Map(),
                isLoading: false,
                errorMessage: `Error loading users/groups/roles: "${error}"`
            })
        }
    }

    async reloadUserId(user_id) {
        const sdkUser = await this.call_looker('user', user_id, USER_FIELDS)
        const new_sdkUsersById = new Map(this.state.sdkUsersById)
        new_sdkUsersById.set(sdkUser.id, sdkUser)
        console.log(`reload user ${user_id}`)
        this.setState({
            sdkUsersById: new_sdkUsersById
        })
    }

    async runFuncOnSelectedUsers(func, name = "unnammed") {
        const selectedUsers = Array.from(this.state.selectedUserIds).map(user_id => this.state.sdkUsersById.get(user_id))
        const promises = selectedUsers.map(func.bind(this))
        await Promise.all(promises)
        console.log(`did the ${name} operation`)
        this.loadUsersAndStuff()
    }

    async createUserEmailCreds(sdkUser) {
        if (sdkUser.credentials_email) { 
            console.log("user already has email creds")
            return 
        }

        if (!sdkUser.email) { 
            console.log("user has no email address")
            return 
        } 
        this.call_looker('create_user_credentials_email', sdkUser.id, {email: sdkUser.email})
        //await this.reloadUserId(sdkUser.id)
    }

    async deleteUserEmailCreds(sdkUser) {
        if (!sdkUser.credentials_email) { 
            console.log("user has no email creds to delete")
            return 
        }
        this.call_looker('delete_user_credentials_email', sdkUser.id)
        //await this.reloadUserId(sdkUser.id)
    }

    async deleteUserSamlCreds(sdkUser) {
        if (!sdkUser.credentials_samle) { 
            console.log("user has no saml creds to delete")
            return 
        }
        this.call_looker('delete_user_credentials_saml', sdkUser.id)
        //await this.reloadUserId(sdkUser.id)
    }

    toggleSelectAllCheckbox() {
        const new_selectAllIsChecked = !this.state.selectAllIsChecked
        
        // Start with a new blank set. If we unchecked the box then we want this.
        let new_selectedUserIds = new Set()
        
        // If the box was checked then fill the set with all of the user ids instead
        if (new_selectAllIsChecked) {
            new_selectedUserIds  = new Set(this.state.sdkUsersById.keys())
        }

        this.setState({
            selectAllIsChecked: new_selectAllIsChecked,
            selectedUserIds: new_selectedUserIds
        })
    }

    toggleUserCheckbox(user_id) {
        const new_selectedUserIds= new Set(this.state.selectedUserIds)
        
        // See docs for Set.prototype.delete() 
        if (!new_selectedUserIds.delete(user_id)) {
            new_selectedUserIds.add(user_id)
        }

        this.setState({selectedUserIds: new_selectedUserIds})
    }

    setSdkUsersFromSortedList(userList) {
        const new_sdkUsersById = new Map(userList.map(u => [u.id, u]))
        console.log(userList)
        console.log(new_sdkUsersById)
        this.setState({sdkUsersById: new_sdkUsersById})
    }

    onConfirmCreateEmailCreds(closeCallback) {
        this.runFuncOnSelectedUsers(this.createUserEmailCreds, "create email creds")
        closeCallback()
    } 

    onConfirmDeleteEmailCreds(closeCallback) {
        this.runFuncOnSelectedUsers(this.deleteUserEmailCreds, "delete email creds")
        closeCallback()
    }

    onConfirmDeleteSamlCreds(closeCallback) {
        this.runFuncOnSelectedUsers(this.deleteUserSamlCreds, "delete saml creds")
        closeCallback()
    }

    renderTitle() {
        return (
            <Box
                pl='small'
                py='xsmall' 
                bg='palette.charcoal100' 
                borderBottom='1px solid' 
                borderBottomColor='palette.charcoal300'
            >
                <Heading as='h1' fontWeight='light'>Users Page Plus</Heading>
            </Box>
        )
    }

    renderNavbar() {
        return (
            <Box 
                width='10rem' 
                pl='xlarge'
                pt='large'
                borderRight='1px solid' 
                borderRightColor='palette.charcoal300'
            >
                Space reserved here
            </Box>
        )
    }

    renderErrorBanner() {
        if (!this.state.errorMessage) {
            return
        }
        return (
            <Banner intent='error'>{this.state.errorMessage}</Banner>
        )
    }

    render() {
        if (this.context.initializeError) {
            return <Banner intent='error'>{this.context.initializeError}</Banner>
        }
        return (
            <>
                {this.renderTitle()}
                <Flex height='100vh'>
                    {this.renderNavbar()}
                    <Box flexGrow={1} overflow="scroll" height="100%">
                        {this.renderErrorBanner()}
                        <ActionsBar 
                            numSelectedUsers={this.state.selectedUserIds.size}
                            onConfirmCreateEmailCreds={this.onConfirmCreateEmailCreds.bind(this)}
                            onConfirmDeleteEmailCreds={this.onConfirmDeleteEmailCreds.bind(this)}
                            onConfirmDeleteSamlCreds={this.onConfirmDeleteSamlCreds.bind(this)}
                        />
                        <Box p='large'>
                            <UserTable
                                loadingComponent={this.loadingComponent}
                                isLoading={this.state.isLoading}
                                sdkUsersList={Array.from(this.state.sdkUsersById.values())}
                                sdkGroupsById={this.state.sdkGroupsById}
                                sdkRolesById={this.state.sdkRolesById}
                                selectedUserIds={this.state.selectedUserIds}
                                selectAllIsChecked={this.state.selectAllIsChecked}
                                toggleUserCheckbox={(user_id) => this.toggleUserCheckbox(user_id)}
                                toggleSelectAllCheckbox={() => this.toggleSelectAllCheckbox()}
                                setSdkUsersFromSortedList={this.setSdkUsersFromSortedList.bind(this)}
                            />
                        </Box>
                    </Box>
                </Flex>
            </>
        )
    }
}

export const UppExtension = hot(UppExtensionInternal)