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
import asyncPool from "tiny-async-pool"; // limit concurrency with Looker API
import { UsersPageLayout } from './UsersPageLayout'
import { ActionsBar } from './ActionsBar'
import { UsersTable } from './UsersTable'
import { USER_FIELDS, TABLE_COLUMNS, CREDENTIALS_INFO, EMBED_USER_FIELDS, EMBED_TABLE_COLUMNS } from './constants'
import { makeLookerCaller } from '../shared/utils'
import { 
    Banner, 
    doDefaultActionListSort,
    InputSearch, ButtonGroup, ButtonItem, Select,
    SpaceVertical,
    Label,
    Text,
    Box,
    Space
} from '@looker/components'

export class UsersPage extends React.Component {
    static contextType = ExtensionContext // provides the coreSDK object
    
    /*
     ******************* React lifecycle methods *******************
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
            credentialSearchText: '',
            credentialSearchError: '',
            groupSearchText: '',
            groupSearchError: '',
            currentPage: 1,
            pageSize: 20,
            usersList: [],
            userAtt: [],
            usersMap: new Map(),
            groupsMap: new Map(),
            rolesMap: new Map(),
            selectedUserIds: new Set(),
            isLoading: false,
            errorMessage: undefined,
            totalUsersCount: 0,
            isCredentialSearch: false,
            isGroupSearch: false
        }
    }

    componentDidMount() {
        if (this.initializeError) { return }

        this.lookerRequest = makeLookerCaller(this.context.core40SDK)

        this.loadUsersAndStuff()
    }

    /*
     ******************* General helper functions *******************
     */

    async asyncSetState(newState) {
        return new Promise(resolve => this.setState(newState, resolve))
    }

    reloadUserId = async (user_id) => {
        const user = await lookerRequest('user', user_id, USER_FIELDS)
        const new_usersMap = new Map(this.state.usersMap)
        new_usersMap.set(user.id, user)
        console.log(`reload user ${user_id}`)
        this.setState({
            usersMap: new_usersMap
        })
    }

    // no longer required - overriding chatty default timeout to 90 seconds via chattyTimeout
    allUsersPaginated = async () => {
        const pageSize = 1000 // bigger page sizes take longer to return. 1k users returns between 10-15s
        let pagesAtTime = 6 // connections will stall if more than 6 sent at same time
        let pages = Array.from(Array(pagesAtTime), (x, i) => i +1)
        let keepGoing = true
        let userResult = []

        const getUsers = async (page) => {
            return await this.lookerRequest('all_users', {fields: USER_FIELDS, page: page, per_page: pageSize});
        }

        while (keepGoing) {
            let response = await asyncPool(pagesAtTime, pages, getUsers)
            userResult = [...userResult, ...response.flat()];
            pages = pages.map(i => i+=pagesAtTime);

            if (response.flat().length < pageSize*pagesAtTime) {
                keepGoing = false;
                return userResult;
            }
        }
    }

    /*
     ******************* Main data fetch *******************
     */
    loadUsersAndStuff = async () => {
        this.setState({ isLoading: true, errorMessage: undefined })
        try {

            // const userQuery = await this.lookerRequest('create_query', {model: 'system__activity', view: 'user', fields: ['user.count'], limit: '1'})
            // const userCount = await this.lookerRequest('run_query', {query_id: userQuery.id, result_format: 'json', cache: false}).then(response => response[0]['user.count'])
            // let userGrabber
            // if (userCount > 20000) {
            //     userGrabber = this.allUsersPaginated();
            // } else {
            //     userGrabber = this.lookerRequest('all_users', {fields: USER_FIELDS});
            // }

            const [userResult, groupsResult, rolesResult, userAttResult] = await Promise.all([
                // userGrabber,                
                this.lookerRequest('all_users', {fields: USER_FIELDS}),
                this.lookerRequest('all_groups', {}),
                this.lookerRequest('all_roles', {}),
                this.lookerRequest('all_user_attributes', {}),
            ])

            // console.log("~~~~~ All Users (count) ~~~~")
            // console.log(userResult)
            // console.log("~~~~~ All Groups ~~~~")
            // console.log(groupsResult)
            // console.log("~~~~~ All Roles ~~~~")
            // console.log(rolesResult)
            // console.log("~~~~~ All User Attributes ~~~~")
            // console.log(userAttResult)
            
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
                userAtt: userAttResult,
                isLoading: false,
                totalUsersCount: userResult.length
            })

        } catch (error) {
            console.log(error)
            this.setState({
                usersMap: new Map(),
                groupsMap: new Map(),
                rolesMap: new Map(),
                userAtt: [],
                isLoading: false,
                errorMessage: `Error loading users/groups/roles: "${error}"`,
                totalUsersCount: 0
            })
        }
    }

    loadEmbedUsersAndStuff = async () => {
        this.setState({ isLoading: true, errorMessage: undefined })
        try {

            // Search for embed users specifically
            const [userResult, groupsResult] = await Promise.all([
                this.lookerRequest('search_users', {
                    fields: EMBED_USER_FIELDS,
                    embed_user: true
                }),
                this.lookerRequest('all_groups', {}),
            ])

            console.log("~~~~~ Embed Users (count) ~~~~")
            console.log(userResult)
            console.log("~~~~~ All Groups ~~~~")
            console.log(groupsResult)
            
            const new_usersMap = new Map(userResult.map(u => [u.id, u]))
            const new_groupsMap = new Map(groupsResult.map(g => [g.id, g]))

            // This method gets called after actions run, which means there
            // may be sorts & filters already. Reapply them so the same records are in view.
            const filteredUsers = this.makeFilteredUsersList(new_usersMap)
            const {data: new_usersList} = this.makeSortedUsersList(filteredUsers)

            this.setState({
                usersList: new_usersList,
                usersMap: new_usersMap,
                groupsMap: new_groupsMap,
                isLoading: false,
                totalUsersCount: userResult.length
            })

        } catch (error) {
            console.log(error)
            this.setState({
                usersMap: new Map(),
                groupsMap: new Map(),
                isLoading: false,
                errorMessage: `Error loading embed users/groups: "${error}"`,
                totalUsersCount: 0
            })
        }
    }

    /*
     ******************* SELECTION stuff *******************
     */
    onSelectAll = () => {
        // If anything is currently selected, then we toggle all off
        // If nothing is selected then we toggle all on
        const doAll = (this.state.selectedUserIds.size === 0)
        
        // Populate from usersList because only the visible rows should be selected
        const new_selectedUserIds = doAll ? new Set(this.state.usersList.map(u => u.id)) : new Set()

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

    setNewSelectedUserIds = (new_selectedUserIds) => {
        return this.asyncSetState({selectedUserIds: new_selectedUserIds})
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
        this.setState({usersList: new_usersList, currentPage: 1})
    }

    onChangeActiveFilterButtons = (new_activeFilterButtons) => {
        let updated_activeFilterButtons = new_activeFilterButtons;
        const lastFilter = new_activeFilterButtons.slice(-1)[0]
        
        switch (lastFilter) {
            case "disabled":
                updated_activeFilterButtons = updated_activeFilterButtons.filter(f => f !== "notDisabled")
                break
            case "notDisabled":
                updated_activeFilterButtons = updated_activeFilterButtons.filter(f => f !== "disabled")
                break
        }

        // Update the button state right away
        this.setState({activeFilterButtons: updated_activeFilterButtons})
        
        // Re-filter and re-sort. updated_activeFilterButtons passed in to avoid race condition on state
        const filteredUsers = this.makeFilteredUsersList(undefined, undefined, updated_activeFilterButtons)
        const {data: new_usersList} = this.makeSortedUsersList(filteredUsers)
        
        // Persist
        this.setState({usersList: new_usersList, currentPage: 1})
    }

    onChangeActiveShowWhoButton = (new_activeShowWhoButton) => {
        // Update the button state right away
        this.setState({activeShowWhoButton: new_activeShowWhoButton})
        
        // Load embed users if embed filter is selected
        if (new_activeShowWhoButton === "embed") {
            this.setState({ tableColumns: EMBED_TABLE_COLUMNS.slice() })
            this.loadEmbedUsersAndStuff()
        } else {
            // Reset to regular table columns
            this.setState({ tableColumns: TABLE_COLUMNS.slice() })
            // Re-filter and re-sort. new_activeShowWhoButton passed in to avoid race condition on state
            const filteredUsers = this.makeFilteredUsersList(undefined, undefined, undefined, new_activeShowWhoButton)
            const {data: new_usersList} = this.makeSortedUsersList(filteredUsers)
            
            // Persist
            this.setState({usersList: new_usersList, currentPage: 1})
        }
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
            case "all":
                break
            case "regular":
                filteredUsers = filteredUsers.filter(u => !u.verified_looker_employee && !u.credentials_embed.length)
                break
            case "embed":
                filteredUsers = filteredUsers.filter(u => !u.verified_looker_employee && u.credentials_embed.length)
                break
            case "lookerSupport":
                filteredUsers = filteredUsers.filter(u => u.verified_looker_employee)
                break
            case "selected":
                filteredUsers = filteredUsers.filter(u => this.state.selectedUserIds.has(u.id))
                break
        }

        // Step 2: filter according to the button toggles
        if (activeFilterButtons.includes("blankName")) {
            filteredUsers = filteredUsers.filter(u => !u.display_name)
        }
        if (activeFilterButtons.includes("noEmail")) {
            filteredUsers = filteredUsers.filter(u => !u.credentials_email)
        }
        if (activeFilterButtons.includes("disabled")) {
            filteredUsers = filteredUsers.filter(u => u.is_disabled)
        }
        if (activeFilterButtons.includes("notDisabled")) {
            filteredUsers = filteredUsers.filter(u => !u.is_disabled)
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
        
        let newArrayToSort = arrayToSort
        if (columnId === 'display_name') {
            newArrayToSort = arrayToSort.map(u => {
                const cleanUser = u
                cleanUser.display_name = u.display_name || ""  // to allow sorting on users with null names
                return cleanUser
            })
        }

        // This thing looks like: `{columns: newColumnsObj, data: sortedDataArray}`
        const resultObj = doDefaultActionListSort(newArrayToSort, this.state.tableColumns, columnId, sortDirection)
        
        return resultObj
    }

    /*
     ******************* PAGINATION *******************
     */ 
    onChangePage = (new_currentPage) => {
        this.setState({currentPage: new_currentPage})
    }

    onChangePageSize = (new_pageSize) => {
        this.setState({pageSize: new_pageSize})
    }

    /*
     ******************* EMBED CREDENTIAL SEARCH stuff *******************
     */
    onCredentialSearchChange = (e) => {
        const credentialSearchText = e.currentTarget.value
        this.setState({
            credentialSearchText: credentialSearchText,
            credentialSearchError: '', // Clear error when user types
            groupSearchText: '',
            groupSearchError: '',
            isGroupSearch: false
        })
    }

    onCredentialSearchKeyPress = async (e) => {
        if (e.key === 'Enter') {
            const credentialValue = this.state.credentialSearchText.trim()
            if (credentialValue) {
                await this.searchByCredential(credentialValue)
            }
        }
    }

    onCredentialSearchClear = async () => {
        this.setState({
            credentialSearchText: '',
            credentialSearchError: '',
            isCredentialSearch: false
        })
        await this.loadEmbedUsersAndStuff()
    }

    searchByCredential = async (credentialValue) => {
        this.setState({ 
            isLoading: true, 
            errorMessage: undefined,
            credentialSearchError: '' // Clear previous errors
        })
        try {
            // Search for user by embed credential
            const userResult = await this.lookerRequest('user_for_credential', 'embed', credentialValue)
            
            if (userResult) {
                // Create a map with just this user
                const new_usersMap = new Map([[userResult.id, userResult]])
                
                // Update state to show only this user
                this.setState({
                    usersList: [userResult],
                    usersMap: new_usersMap,
                    isLoading: false,
                    totalUsersCount: 1,
                    isCredentialSearch: true,
                    currentPage: 1,
                    credentialSearchError: ''
                })
            } else {
                this.setState({
                    usersList: [],
                    usersMap: new Map(),
                    isLoading: false,
                    totalUsersCount: 0,
                    isCredentialSearch: true,
                    currentPage: 1,
                    credentialSearchError: `Could not find user with embed credential: ${credentialValue}`
                })
            }
        } catch (error) {
            console.log(error)
            this.setState({
                usersList: [],
                usersMap: new Map(),
                isLoading: false,
                totalUsersCount: 0,
                isCredentialSearch: true,
                currentPage: 1,
                credentialSearchError: `Error searching for credential: ${error}`
            })
        }
    }

    /*
     ******************* EMBED GROUP SEARCH stuff *******************
     */
    onGroupSearchChange = (e) => {
        const groupSearchText = e.currentTarget.value
        this.setState({
            groupSearchText: groupSearchText,
            groupSearchError: '', // Clear error when user types
            credentialSearchText: '',
            credentialSearchError: '',
            isCredentialSearch: false
        })
    }

    onGroupSearchKeyPress = async (e) => {
        if (e.key === 'Enter') {
            const groupValue = this.state.groupSearchText.trim()
            if (groupValue) {
                await this.searchByGroup(groupValue)
            }
        }
    }

    onGroupSearchClear = async () => {
        this.setState({
            groupSearchText: '',
            groupSearchError: '',
            isGroupSearch: false
        })
        await this.loadEmbedUsersAndStuff()
    }

    searchByGroup = async (externalGroupId) => {
        this.setState({ 
            isLoading: true, 
            errorMessage: undefined,
            groupSearchError: '' // Clear previous errors
        })
        try {
            const groupResult = await this.lookerRequest('search_groups', {
                external_group_id: externalGroupId,
                fields: 'id'
            }, )
            let lookerGroupId = null
            if (groupResult && groupResult.length > 0) {    
                lookerGroupId = groupResult.map(g => g.id)
            } 
            if (!lookerGroupId) {
                this.setState({
                    groupSearchError: `Could not find group with external group ID: ${externalGroupId}`,
                    isLoading: false,
                    usersList: [],
                    usersMap: new Map(),
                    totalUsersCount: 0,
                    isGroupSearch: true,
                    currentPage: 1,
                })
                return
            }
            // Search for users by embed group
            const userResult = await this.lookerRequest('search_users', {
                fields: EMBED_USER_FIELDS,
                embed_user: true,
                group_id: lookerGroupId.join(',')
            })
            
            if (userResult && userResult.length > 0) {
                const new_usersMap = new Map(userResult.map(u => [u.id, u]))
                
                // Update state to show only these users
                this.setState({
                    usersList: userResult,
                    usersMap: new_usersMap,
                    isLoading: false,
                    totalUsersCount: userResult.length,
                    isGroupSearch: true,
                    currentPage: 1,
                    groupSearchError: ''
                })
            } else {
                this.setState({
                    usersList: [],
                    usersMap: new Map(),
                    isLoading: false,
                    totalUsersCount: 0,
                    isGroupSearch: true,
                    currentPage: 1,
                    groupSearchError: `Could not find users with external group ID: ${externalGroupId}`
                })
            }
        } catch (error) {
            console.log(error)
            this.setState({
                usersList: [],
                usersMap: new Map(),
                isLoading: false,
                totalUsersCount: 0,
                isGroupSearch: true,
                currentPage: 1,
                groupSearchError: `Error searching for group: ${error}`
            })
        }
    }

    onExternalUserIdClick = (externalUserId) => {
        this.setState({
            credentialSearchText: externalUserId,
            credentialSearchError: '',
            groupSearchText: '',
            groupSearchError: '',
            isGroupSearch: false
        })
        this.searchByCredential(externalUserId)
    }

    onExternalGroupIdClick = (externalGroupId) => {
        this.setState({
            groupSearchText: externalGroupId,
            groupSearchError: '',
            credentialSearchText: '',
            credentialSearchError: '',
            isCredentialSearch: false
        })
        this.searchByGroup(externalGroupId)
    }

    /*
     ******************* RENDERING *******************
     */    
    render() {
        const errorBanner = !this.state.errorMessage ? null : <Banner intent='error'>{this.state.errorMessage}</Banner>

        const actionsBar = 
            <ActionsBar 
                isLoading={this.state.isLoading}
                selectedUserIds={this.state.selectedUserIds}
                usersMap={this.state.usersMap}
                groupsMap={this.state.groupsMap}
                rolesMap={this.state.rolesMap}
                userAtt={this.state.userAtt}
                loadUsersAndStuff={this.loadUsersAndStuff}
                setNewSelectedUserIds={this.setNewSelectedUserIds}
            />
                               
        const showWhoToggle = 
            <Select 
                width={150}
                onChange={this.onChangeActiveShowWhoButton}
                defaultValue="regular"
                options={[
                  { value: 'all', label: 'All Users' },
                  { value: 'regular', label: 'Regular Users' },
                  { value: 'embed', label: 'Embed Users' },
                  { value: 'lookerSupport', label: 'Looker Support' },
                  { value: 'selected', label: 'Selected Users' }
                ]}
            />

        const quickFilterGroup = 
            <ButtonGroup value={this.state.activeFilterButtons} onChange={this.onChangeActiveFilterButtons}>
                <ButtonItem value="blankName">Blank name</ButtonItem>
                <ButtonItem value="noEmail">No email</ButtonItem>
                <ButtonItem value="noSSO">No SSO</ButtonItem>
                <ButtonItem value="duplicateEmails">Duplicate Emails</ButtonItem>
                <ButtonItem value="duplicateNames">Duplicate Names</ButtonItem>
                <ButtonItem value="disabled">Disabled</ButtonItem>
                <ButtonItem value="notDisabled">Not Disabled</ButtonItem>
            </ButtonGroup>
                   
        const searchInput = 
            <InputSearch
                width="20rem" 
                placeholder="Search by name, email, id"
                value={this.state.searchText}
                onChange={this.onChangeSearch}
            />

        // Show embed-specific search fields when embed filter is selected
        const embedSearchFields = this.state.activeShowWhoButton === "embed" ? (
            <Space>
                <SpaceVertical gap="small">
                    <Label>Search by Embed Credential</Label>
                    <InputSearch
                        placeholder="your_external_user_id"
                        value={this.state.credentialSearchText}
                        onChange={this.onCredentialSearchChange}
                        onKeyPress={this.onCredentialSearchKeyPress}
                        onClear={this.onCredentialSearchClear}
                    />
                    
                    {this.state.credentialSearchError ? (
                        <Text fontSize="xsmall" color="critical">{this.state.credentialSearchError}</Text>
                    ) : (
                        <Label 
                            style={{alignSelf: 'flex-end', color: 'grey', fontWeight: "400"}} 
                            fontSize="xxsmall" 
                            color="secondary"
                        >
                            {"Exact match only"}
                        </Label>
                    )}
                </SpaceVertical>
                <SpaceVertical gap="small">
                    <Label>Search by External Group ID</Label>
                    <InputSearch
                        placeholder="your_external_group_id"
                        value={this.state.groupSearchText}
                        onChange={this.onGroupSearchChange}
                        onKeyPress={this.onGroupSearchKeyPress}
                        onClear={this.onGroupSearchClear}
                    />
                    {this.state.groupSearchError ? (
                        <Text fontSize="xsmall" color="critical">{this.state.groupSearchError}</Text>
                    ): (
                        <Label 
                            style={{alignSelf: 'flex-end', color: 'grey', fontWeight: "400"}} 
                            fontSize="xxsmall" 
                            color="secondary"
                        >
                            {"Accepts wildcards ( _, % )"}
                        </Label>
                    )}
                </SpaceVertical>
            </Space>
        ) : null
                
        const usersTable = 
            <UsersTable 
                isLoading={this.state.isLoading}
                usersList={this.state.usersList}
                usersMap={this.state.usersMap}
                groupsMap={this.state.groupsMap}
                rolesMap={this.state.rolesMap}
                selectedUserIds={this.state.selectedUserIds}
                totalUsersCount={this.state.totalUsersCount}
                onSelectRow={this.onSelectRow}
                onSelectAll={this.onSelectAll}
                tableColumns={this.state.tableColumns}
                sortColumn={this.state.sortColumn}
                sortDirection={this.state.sortDirection}
                onSort={this.onSort}
                pageSize={this.state.pageSize}
                currentPage={this.state.currentPage}
                onChangePage={this.onChangePage}
                onChangePageSize={this.onChangePageSize}
                activeShowWhoButton={this.state.activeShowWhoButton}
                onExternalUserIdClick={this.onExternalUserIdClick}
                onExternalGroupIdClick={this.onExternalGroupIdClick}
            />

        return (
            <UsersPageLayout
                errorBanner={errorBanner}
                actionsBar={actionsBar}
                showWhoToggle={showWhoToggle}
                quickFilterGroup={quickFilterGroup}
                searchInput={searchInput}
                embedSearchFields={embedSearchFields}
                usersTable={usersTable}
            />
        )
    }
}