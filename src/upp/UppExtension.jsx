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
import { hot } from "react-hot-loader/root"
import { ExtensionContext } from '@looker/extension-sdk-react'
import { NavBar } from '../NavBar.jsx'
import { UppLayout } from './UppLayout.jsx'
import { ActionsBar } from './ActionsBar.jsx'
import { UserTable } from './UserTable.jsx'
import { USER_FIELDS, TABLE_COLUMNS, CREDENTIALS_INFO, makeLookerCaller } from './Constants.js'
import { 
    Heading, Banner, Box, 
    doDefaultActionListSort,
    InputSearch, ButtonGroup, ButtonToggle, ButtonItem
} from '@looker/components'

class UppExtensionInternal extends React.Component {
    static contextType = ExtensionContext // provides the coreSDK object
    
    /*
     ******************* React fifecycle methods *******************
     */
    constructor(props) {
        super(props)

        this.searchTimeout = React.createRef()
        
        this.state = {
            tableColumns: TABLE_COLUMNS.slice(),
            sortColumn: 'id',
            sortDirection: 'asc',
            activeShowWhoButton: "regular",
            activeFilterButtons: [],
            searchText: '',
            usersList: [],
            usersMap: new Map(),
            groupsMap: new Map(),
            rolesMap: new Map(),
            selectedUserIds: new Set(),
            isLoading: false,
            errorMessage: undefined
        }
    }

    componentDidMount() {
        if (this.initializeError) { return }

        this.lookerRequest = makeLookerCaller(this.context.coreSDK)

        this.loadUsersAndStuff()
    }

    /*
     ******************* General helper functions *******************
     */

    reloadUserId = async (user_id) => {
        const sdkUser = await lookerRequest('user', user_id, USER_FIELDS)
        const new_usersMap = new Map(this.state.usersMap)
        new_usersMap.set(sdkUser.id, sdkUser)
        console.log(`reload user ${user_id}`)
        this.setState({
            usersMap: new_usersMap
        })
    }

    /*
     ******************* Main data fetch *******************
     */
    loadUsersAndStuff = async () => {
        this.setState({ isLoading: true, errorMessage: undefined })
        try {
            //throw "test"
            //await new Promise(r => setTimeout(r, 5000))

            const [userResult, groupsResult, rolesResult] = await Promise.all([
                //lookerRequest('search_users', {fields: USER_FIELDS}),
                this.lookerRequest('all_users', {fields: USER_FIELDS}),
                this.lookerRequest('all_groups', {}),
                this.lookerRequest('all_roles', {})
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
     ******************* SELECTION stuff *******************
     */
    onSelectAll = (forceToggleTo = undefined) => {
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

    onSelectRow = (user_id) => {
        const new_selectedUserIds = new Set(this.state.selectedUserIds)
        
        // If delete returns true then that means the user was previously selected 
        if (!new_selectedUserIds.delete(user_id)) {
            new_selectedUserIds.add(user_id)
        }

        this.setState({selectedUserIds: new_selectedUserIds})
    }

    /*
     ******************* SEARCH & FILTER stuff *******************
     */
    onChangeSearch = (e) => {
        clearTimeout(this.searchTimeout.current)
        
        // If `e.persist` doesn't exist, a user has clicked the `x` button in the
        // InputSearch to clear the field. The event fired is a button click, and
        // NOT a React Synthetic event, so we have to treat it differently.        
        if (!e.persist) {
            this.setState({searchText: ''})
            this.runSearch('')
        } else {
            e.persist()
            
            this.setState({searchText: e.currentTarget.value})
        
            if (this.searchTimeout) {
                this.searchTimeout.current = window.setTimeout(() => {
                    this.runSearch(e.target.value)
                }, 500)
            }
        }
    }

    runSearch(searchText) {
        // Re-filter and re-sort. searchText is passed in to avoid race condition on state
        const filteredUsers = this.makeFilteredUsersList(undefined, searchText, undefined)        
        const {data: new_usersList} = this.makeSortedUsersList(filteredUsers)

        // Persist
        this.setState({usersList: new_usersList})
    }

    onChangeActiveFilterButtons = (new_activeFilterButtons) => {
        // Update the button state right away
        this.setState({activeFilterButtons: new_activeFilterButtons})
        
        // Re-filter and re-sort. new_activeFilterButtons passed in to avoid race condition on state
        const filteredUsers = this.makeFilteredUsersList(undefined, undefined, new_activeFilterButtons)
        const {data: new_usersList} = this.makeSortedUsersList(filteredUsers)
        
        // Persist
        this.setState({usersList: new_usersList})
    }

    onChangeActiveShowWhoButton = (new_activeShowWhoButton) => {
        // Update the button state right away
        this.setState({activeShowWhoButton: new_activeShowWhoButton})
        
        // Re-filter and re-sort. new_activeShowWhoButton passed in to avoid race condition on state
        const filteredUsers = this.makeFilteredUsersList(undefined, undefined, undefined, new_activeShowWhoButton)
        const {data: new_usersList} = this.makeSortedUsersList(filteredUsers)
        
        // Persist
        this.setState({usersList: new_usersList})
    }

    makeFilteredUsersList(usersMap = undefined, 
                        searchText = undefined, 
                        activeFilterButtons = undefined, 
                        activeShowWhoButton = undefined) {
        // This function can take the various state values as props so that we don't have
        // to `await` for state changes to persist before calling - avoids race conditions.
        // But those props can also be omitted for convenience, eg when calling from the load procedure.

        // We check for `undefined` because falsey values can be explicitly passed.
        if (usersMap === undefined) usersMap = this.state.usersMap
        if (searchText === undefined) searchText = this.state.searchText
        if (activeFilterButtons === undefined) activeFilterButtons = this.state.activeFilterButtons
        if (activeShowWhoButton === undefined) activeShowWhoButton = this.state.activeShowWhoButton
        
        // Step 0: get a fresh array of all users
        let filteredUsers = Array.from(usersMap.values())

        // Step 1: filter according to which type of users to show
        switch (activeShowWhoButton) {
            case "regular":
                filteredUsers = filteredUsers.filter(u => !u.verified_looker_employee && !u.credentials_embed.length)
                break
            case "embed":
                filteredUsers = filteredUsers.filter(u => !u.verified_looker_employee && u.credentials_embed.length)
                break
            case "lookerSupport":
                filteredUsers = filteredUsers.filter(u => u.verified_looker_employee)
                break
        }

        // Step 2: filter according to the button toggles
        if (activeFilterButtons.includes("blankName")) {
            filteredUsers = filteredUsers.filter(u => !u.display_name)
        }
        if (activeFilterButtons.includes("noEmail")) {
            filteredUsers = filteredUsers.filter(u => !u.credentials_email)
        }
        if (activeFilterButtons.includes("noSSO")) {
            const sso_cred_names = CREDENTIALS_INFO.filter(c => c.is_sso).map(c => c.name)
            filteredUsers = filteredUsers.filter(user => 
                !sso_cred_names.map(cred_name => !!user[cred_name]).includes(true)
            )
        }
        if (activeFilterButtons.includes("duplicateEmails")) {
            // make a map of how many times each email occurs
            const emailCounts = {}
            Array.from(usersMap.values())
                .map(u => u.email)
                .filter(eml => eml) // remove null, undefined, ""
                .reduce((cts, eml) => (cts[eml] = ++cts[eml] || 1, cts), emailCounts)
            // now only take users where count > 1
            filteredUsers = filteredUsers.filter(user => emailCounts[user.email] > 1)
            console.log(emailCounts)
        }
        if (activeFilterButtons.includes("duplicateNames")) {
            // make a map of how many times each email occurs
            const nameCounts = {}
            Array.from(usersMap.values())
                .map(u => u.display_name)
                .filter(name => name) // remove null, undefined, ""
                .reduce((cts, name) => (cts[name] = ++cts[name] || 1, cts), nameCounts)
            // now only take users where count > 1
            filteredUsers = filteredUsers.filter(user => nameCounts[user.display_name] > 1)
            console.log(nameCounts)
        }

        // Step 3: filter according to the search box
        if (searchText) {
            searchText = searchText.toLowerCase()
            // Check if the user id, name, or email matches the search string
            filteredUsers = filteredUsers.filter(u => {
                return (
                    u.id.toString().includes(searchText)
                    || u.display_name?.toLowerCase().includes(searchText)
                    || u.email?.toLowerCase().includes(searchText)
                )
            })
        }    

        // Step 4: get outta here
        return filteredUsers
    }

    /*
     ******************* SORT stuff *******************
     */
    onSort = (columnId, sortDirection) => {
        // This function should only be called as the actual click handler.
        // It's the only one that cares about receiving new values
        // for the sort critera or actually persisting the new tableColumns.

        const {
          columns: new_tableColumns,
          data: new_usersList,
        } = this.makeSortedUsersList(this.state.usersList, columnId, sortDirection)
        
        this.setState({
            tableColumns: new_tableColumns,
            usersList: new_usersList,
            sortColumn: columnId,
            sortDirection: sortDirection
        })
    }

    makeSortedUsersList(arrayToSort, columnId = undefined, sortDirection = undefined) {
        // This function is used any time we re-filter the data,
        // which doesn't care about changing the sort criteria

        if (columnId === undefined) columnId = this.state.sortColumn
        if (sortDirection === undefined) sortDirection = this.state.sortDirection

        // This thing looks like: `{columns: newColumnsObj, data: sortedDataArray}`
        const resultObj = doDefaultActionListSort(arrayToSort, this.state.tableColumns, columnId, sortDirection)
        
        return resultObj
    }

    /*
     ******************* RENDERING *******************
     */    
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

        const actionsBar = 
            <ActionsBar 
                isLoading={this.state.isLoading}
                selectedUserIds={this.state.selectedUserIds}
                usersMap={this.state.usersMap}
                loadUsersAndStuff={this.loadUsersAndStuff}
            />
                               
        const showWhoToggle = 
            <ButtonToggle value={this.state.activeShowWhoButton} onChange={this.onChangeActiveShowWhoButton}>
                <ButtonItem value="regular">Regular Users</ButtonItem>
                <ButtonItem value="embed">Embed Users</ButtonItem>
                <ButtonItem value="lookerSupport">Looker Support</ButtonItem>
            </ButtonToggle>
             
        const quickFilterGroup = 
            <ButtonGroup value={this.state.activeFilterButtons} onChange={this.onChangeActiveFilterButtons}>
                <ButtonItem value="blankName">Blank name</ButtonItem>
                <ButtonItem value="noEmail">No email</ButtonItem>
                <ButtonItem value="noSSO">No SSO</ButtonItem>
                <ButtonItem value="duplicateEmails">Duplicate Emails</ButtonItem>
                <ButtonItem value="duplicateNames">Duplicate Names</ButtonItem>
            </ButtonGroup>
                  
        const searchInput = 
            <InputSearch 
                value={this.state.searchText} 
                onChange={this.onChangeSearch} 
                width="20rem" 
                placeholder="Search by name, email, id"
            />
               
        const userTable = 
            <UserTable
                isLoading={this.state.isLoading}
                usersList={this.state.usersList}
                groupsMap={this.state.groupsMap}
                rolesMap={this.state.rolesMap}
                selectedUserIds={this.state.selectedUserIds}
                onSelectRow={this.onSelectRow}
                onSelectAll={this.onSelectAll}
                tableColumns={this.state.tableColumns}
                onSort={this.onSort}
            />

        return (
            <UppLayout
                errorBanner={this.renderErrorBanner()}
                actionsBar={actionsBar}
                showWhoToggle={showWhoToggle}
                quickFilterGroup={quickFilterGroup}
                searchInput={searchInput}
                userTable={userTable}
            />
        )
    }
}

export const UppExtension = hot(UppExtensionInternal)