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
import { USER_FIELDS, TABLE_COLUMNS } from './Constants.js'
import { ExtensionContext } from '@looker/extension-sdk-react'
import { hot } from "react-hot-loader/root"
import { 
    Heading, 
    Banner, 
    Box, 
    Flex, 
    doDefaultActionListSort
} from '@looker/components'

class UppExtensionInternal extends React.Component {
    static contextType = ExtensionContext // provides the coreSDK object

    /*
     ******************* React fifecycle methods *******************
     */
    constructor(props) {
        super(props)
        
        this.loadingComponent = props.loadingComponent

        this.searchTimeout = React.createRef()
        
        this.state = {
            tableColumns: TABLE_COLUMNS.slice(),
            sortColumn: 'id',
            sortDirection: 'asc',
            searchText: '',
            usersList: [],
            usersMap: new Map(),
            groupsMap: new Map(),
            rolesMap: new Map(),
            selectedUserIds: new Set(),
            isLoading: false,
            isRunning: false,
            errorMessage: undefined
        }
    }

    componentDidMount() {
        if (this.initializeError) { return }
        this.loadUsersAndStuff()
    }

    /*
     ******************* General helper functions *******************
     */
    call_looker(func, ...args) {
        console.log(`calling endpoint: ${func}   args: ${args}`)
        return this.context.coreSDK.ok(this.context.coreSDK[func](...args))
    }

    async setRunning(value) {
        this.setState({isRunning: value})
    }

    async reloadUserId(user_id) {
        const sdkUser = await this.call_looker('user', user_id, USER_FIELDS)
        const new_usersMap = new Map(this.state.usersMap)
        new_usersMap.set(sdkUser.id, sdkUser)
        console.log(`reload user ${user_id}`)
        this.setState({
            usersMap: new_usersMap
        })
    }

    async runFuncOnSelectedUsers(func, name = "unnammed") {
        const selectedUsers = Array.from(this.state.selectedUserIds).map(u_id => this.state.usersMap.get(u_id))
        const promises = selectedUsers.map(func.bind(this))
        await Promise.all(promises)
        // await new Promise(r => setTimeout(r, 10000));
        console.log(`did the ${name} operation`)
        this.loadUsersAndStuff()
    }

    /*
     ******************* Main data fetch *******************
     */
    async loadUsersAndStuff() {
        this.setState({ isLoading: true, errorMessage: undefined })
        try {
            //throw "test"
            //await new Promise(r => setTimeout(r, 5000))

            const [userResult, groupsResult, rolesResult] = await Promise.all([
                this.call_looker('search_users', {fields: USER_FIELDS, verified_looker_employee: false, sorts: "first_name asc, last_name asc"}),
                this.call_looker('all_groups', {}),
                this.call_looker('all_roles', {})
            ])

            console.log("~~~~~ All Users (count) ~~~~")
            console.log(userResult)
            console.log("~~~~~ All Groups ~~~~")
            console.log(groupsResult)
            console.log("~~~~~ All Roles ~~~~")
            console.log(rolesResult)
            
            const new_usersMap = new Map(userResult.map(u => [u.id, u]))
            const new_groupsMap = new Map(groupsResult.map(g => [g.id, g]))
            const new_rolesMap = new Map(rolesResult.map(r => [r.id, r]))

            // This method gets called after actions run, which means there
            // may be sorts & filters already. Reapply them so the same records are in view.
            const filteredUsers = this.makeFilteredUsersList(new_usersMap)
            const {data: new_usersList} = this.makeSortedUsersList(filteredUsers)

            this.setState({
                usersList: new_usersList,
                usersMap: new_usersMap,
                groupsMap: new_groupsMap,
                rolesMap: new_rolesMap,
                isLoading: false,
            })

        } catch (error) {
            console.log(error)
            this.setState({
                usersMap: new Map(),
                groupsMap: new Map(),
                rolesMap: new Map(),
                isLoading: false,
                errorMessage: `Error loading users/groups/roles: "${error}"`
            })
        }
    }

    /*
     ******************* Callbacks to run the actions *******************
     */
    async runDeleteCreds(credType) {
        const propName = `credentials_${credType}`
        const methName = `delete_user_credentials_${credType}`
        
        const func = (sdkUser) => {
            if (!sdkUser[propName]) {
                console.log(`user ${sdkUser.id} has no ${credType} creds to delete`)
                return
            }
            this.call_looker(methName, sdkUser.id)
            //await this.reloadUserId(sdkUser.id)
        }
        
        await this.setRunning(true)
        await this.runFuncOnSelectedUsers(func, `delete ${credType} creds`)
        this.setRunning(false)
    }

    async runEmailFill() {
        await this.setRunning(true)
        await this.runFuncOnSelectedUsers(this.createUserEmailCreds, "create email creds")
        this.setRunning(false)
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

    /*
     ******************* Callbacks for selecting rows *******************
     */
    onSelectAll(forceToggleTo = undefined) {
        let fillAll = forceToggleTo

        // If forceToggleTo is passed then we will do what it says.
        // Otherwise: If there are currently any selected items then clear the set.
        //            If the set is empty then select all.
        if (forceToggleTo === undefined) {
            fillAll = (this.state.selectedUserIds.size === 0)
        }
        
        const new_selectedUserIds = fillAll ? new Set(this.state.usersMap.keys()) : new Set()

        this.setState({selectedUserIds: new_selectedUserIds})
    }

    onSelectRow(user_id) {
        const new_selectedUserIds = new Set(this.state.selectedUserIds)
        
        // If delete returns true then that means the user was previously selected 
        if (!new_selectedUserIds.delete(user_id)) {
            new_selectedUserIds.add(user_id)
        }

        this.setState({selectedUserIds: new_selectedUserIds})
    }

    /*
     ******************* Callbacks & helpers for search and sort *******************
     */
    onChangeSearch(e) {
        clearTimeout(this.searchTimeout.current)
        
        // If `e.persist` doesn't exist, a user has clicked the `x` button in the
        // InputSearch to clear the field. The event fired is a button click, and
        // NOT a React Synthetic event, so we have to treat it differently.        
        if (!e.persist) {
            console.log("click x")

            this.setState({searchText: ''})
            this.handleSearchText('')
        } else {
            e.persist()
            
            this.setState({searchText: e.currentTarget.value})
        
            if (this.searchTimeout) {
                this.searchTimeout.current = window.setTimeout(() => {
                    this.handleSearchText(e.target.value)
                }, 500)
            }
        }
    }

    onSort(columnId, sortDirection, arrayToSort = undefined) {
        if (!arrayToSort) arrayToSort = this.state.usersList
        
        const {
          columns: new_tableColumns,
          data: new_usersList,
        } = this.makeSortedUsersList(arrayToSort, columnId, sortDirection)
        
        this.setState({
            tableColumns: new_tableColumns,
            usersList: new_usersList,
            sortColumn: columnId,
            sortDirection: sortDirection
        })
    }

    handleSearchText(searchText) {
        // Helper function does the real work - elsewhere it is called directly
        const filteredUsers = this.makeFilteredUsersList(this.state.usersMap, searchText)        
        
        // Force unselect all because we don't want stuff selected that can't be seen
        //this.onSelectAll(false)

        // Pass off the new user list to the sort function, which will persist it in state
        // This avoids state race condition and extra calls to render, since we need to sort anyway
        this.onSort(this.state.sortColumn, this.state.sortDirection, filteredUsers)
    }

    makeFilteredUsersList(usersMap, searchText = undefined) {
        let filteredUsers

        if (searchText === undefined) { 
            searchText = this.state.searchText
        }

        // Case: the search string is not empty
        if (searchText) {
            console.log(`filter string: ${searchText}`)
            searchText = searchText.toLowerCase()
            // Check if the user id, name, or email matches the search string
            filteredUsers = Array.from(usersMap.values()).filter(u => {
                return (
                    u.id.toString().includes(searchText)
                    || u.display_name.toLowerCase().includes(searchText)
                    || u.email?.toLowerCase().includes(searchText)
                )
            })
            
        // Case: the search string is empty. Reset the list to include all users. No need to clear selections
        } else {
            console.log("unfilter")
            filteredUsers = Array.from(usersMap.values())
        }
        
        return filteredUsers
    }

    makeSortedUsersList(arrayToSort, columnId = undefined, sortDirection = undefined) {
        if (!columnId) columnId = this.state.sortColumn
        if (!sortDirection) sortDirection = this.state.sortDirection

        // This thing looks like {columns: newColumnsObj, data: sortedDataArray}
        const resultObj = doDefaultActionListSort(arrayToSort, this.state.tableColumns, columnId, sortDirection)
        
        return resultObj
    }

    /*
     ******************* Rendering *******************
     */    
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
                            isRunning={this.state.isRunning}
                            numSelectedUsers={this.state.selectedUserIds.size}
                            searchText={this.state.searchText}
                            onChangeSearch={this.onChangeSearch.bind(this)}
                            runEmailFill={this.runEmailFill.bind(this)}
                            runDeleteCreds={this.runDeleteCreds.bind(this)}
                        />
                        <Box p='large'>
                            <UserTable
                                isLoading={this.state.isLoading}
                                usersList={this.state.usersList}
                                groupsMap={this.state.groupsMap}
                                rolesMap={this.state.rolesMap}
                                selectedUserIds={this.state.selectedUserIds}
                                onSelectRow={(user_id) => this.onSelectRow(user_id)}
                                onSelectAll={this.onSelectAll.bind(this)}
                                tableColumns={this.state.tableColumns}
                                onSort={this.onSort.bind(this)}
                            />
                        </Box>
                    </Box>
                </Flex>
            </>
        )
    }
}

export const UppExtension = hot(UppExtensionInternal)