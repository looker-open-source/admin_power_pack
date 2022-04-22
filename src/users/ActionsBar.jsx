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

import React, { useState, useContext } from 'react'
import { useMachine } from '@xstate/react' // workflow helper
import Papa from 'papaparse' // csv parsing library
import asyncPool from "tiny-async-pool"; // limit concurrency with Looker API
import { chain, sortBy } from 'lodash'
import { ExtensionContext } from '@looker/extension-sdk-react'
import { ACTION_INFO, WORKFLOW_MACHINE, SYSTEM_USER_ATTRIBUTES } from './constants'
import { makeLookerCaller } from '../shared/utils'
import styled from "styled-components"
import {
    Button, ButtonOutline, ButtonTransparent,
    Menu, MenuDisclosure, MenuList, MenuItem, MenuGroup,
    Dialog, ConfirmLayout,
    List, ListItem,
    Text, Paragraph,
    FieldCheckbox, FieldText,
    TextArea, InputSearch, InputText,
    Link,
    Space, SpaceVertical
  } from '@looker/components'

const MonospaceTextArea = styled(TextArea)`
    textarea {
        font-family:monospace;
    }
`
export function ActionsBar(props) {
    const context = useContext(ExtensionContext) // provides the coreSDK object
    const asyncLookerCall = makeLookerCaller(context.core40SDK)

    const [workflowMachine, sendWorkflowEvent] = useMachine(WORKFLOW_MACHINE)

    const [selectByAttributeText, set_selectByAttributeText] = useState("")
    const [selectByQueryText, set_selectByQueryText] = useState("")
    const [emailMapText, set_emailMapText] = useState("")
    const [emailCreateText, set_emailCreateText] = useState("")
    const [userAttValueSet, set_userAttValueSet] = useState(new Map())
    const [userAttValueDelete, set_userAttValueDelete] = useState(new Map())
    const [addUsersGroups, set_addUsersGroups] = useState(new Map())
    const [removeUsersGroups, set_removeUsersGroups] = useState(new Map())
    const [setUsersRoles, set_setUsersRoles] = useState(new Map())
    const [expirePasswordUrl, set_expirePasswordUrl] = useState(true)
    const [lowerCaseEmail, set_lowerCaseEmail] = useState(false)
    const [logMessages, set_logMessages] = useState([])

    /*
     ******************* HELPERS *******************
     */
    function currentAction() {
        return workflowMachine.context.appAction
    }

    function deleteCredsType() {
        return workflowMachine.context.deleteCredsType || ""
    }

    function enableDisableType() {
        return workflowMachine.context.enableDisableType || ""
    }

    function isDialogOpen(name) {
        return (workflowMachine.matches('configuring') && workflowMachine.context.appAction === name)
    }

    function isReviewOpen() {
        return ['running', 'reviewing'].some(workflowMachine.matches)
    }

    function isRunning() {
        return workflowMachine.matches('running')
    }

    function clearLog() {
        set_logMessages([])
    }

    function log(entry) {
        set_logMessages(prevLog => prevLog.concat(entry))
    }

    function logWidth() {
        const lineLengths = logMessages.map(line => line.length)
        return Math.max(...lineLengths)
    }

    function reviewDialogTitle() {
        if (!currentAction()) return ""
        
        return `${ACTION_INFO[currentAction()].dialogTitle} - ${workflowMachine.matches('running') ? 'In Progress' : 'Complete'}`
    }

    function closeResetState() {
        set_userAttValueSet(new Map());
        set_userAttValueDelete(new Map());
        set_addUsersGroups(new Map());
        set_removeUsersGroups(new Map());
        set_setUsersRoles(new Map());
        set_expirePasswordUrl(true);
        handleClose();
    }

    /*
     ******************* DIALOG OPEN/CLOSE *******************
     */
    const handleClose = () => {  
        if (isRunning()) { return } // Can't close the review dialog while an action is running
        sendWorkflowEvent('CLOSE')
    }

    const openSelectByAttribute = () => {
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'selectByAttribute'})
    }

    const openSelectByQuery = () => {
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'selectByQuery'})
    }

    const openEmailFill = () => {
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'emailFill'}) 
    } 

    const openEmailMap = () => {
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'emailMap'})
    }

    const openEmailCreate = () => {
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'emailCreate'})
    }

    const openEmailSend = () => {
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'emailSend'})
    }

    const openResetToken = () => {
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'resetToken'})
    }
    
    const openDelete = (type) => { 
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'deleteCreds', deleteCredsType: type})
    }

    const openEnableDisable = (type) => {
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'enableDisable', enableDisableType: type})
    }

    const openDeleteUsers = (type) => {
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'deleteUsers'})
    }

    const openLogoutUsers = (type) => {
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'logoutUsers'})
    }

    const openSetUserAtt = (type) => {
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'setUserAtt'})
    }

    const openDeleteUserAtt = (type) => {
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'deleteUserAtt'})
    }

    const openAddUsersGroups = (type) => {
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'addUsersGroups'})
    }

    const openRemoveUsersGroups = (type) => {
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'removeUsersGroups'})
    }

    const openSetUsersRoles = (type) => {
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'setUsersRoles'})
    }

    const openViewLog = () => {
        sendWorkflowEvent('REVIEW')
    }

    /*
     ******************* INPUT ONCHANGE HANDLERS *******************
     */
    const onChangeSelectByAttributeText = (e) => {
        set_selectByAttributeText(e.currentTarget.value)
    }

    const onChangeSelectByQueryText = (e) => {
        set_selectByQueryText(e.currentTarget.value)
    }

    const onChangeEmailMapText = (e) => {
        set_emailMapText(e.currentTarget.value)
    }

    const onChangeEmailCreateText = (e) => {
        set_emailCreateText(e.currentTarget.value)
    }

    const onChangeSetUserAttValues = (e) => {
        set_userAttValueSet(userAttValueSet.set(e.currentTarget.name, e.currentTarget.value))
    }

    const onChangeDeleteUserAttValues = (e) => {
        set_userAttValueDelete(userAttValueDelete.set(e.target.name, e.target.checked))
    }

    const onChangeAddUsersGroups = (e) => {
        set_addUsersGroups(addUsersGroups.set(e.target.name, e.target.checked))
    }

    const onChangeRemoveUsersGroups = (e) => {
        set_removeUsersGroups(removeUsersGroups.set(e.target.name, e.target.checked))
    }

    const onChangeSetUserRoles = (e) => {
        set_setUsersRoles(setUsersRoles.set(e.target.name, e.target.checked))
    }

    const onChangeSetExpiringPasswordUrl = (e) => {
        set_expirePasswordUrl(e.target.checked)
    }

    const onChangeSetLowerCaseEmail = (e) => {
        set_lowerCaseEmail(e.target.checked)
    }

    /*
     ******************* ACTION RUNNERS *******************
     */
    const runSelectByAttribute = () => {
        runInWorkflow(
            selectByAttribute
        )
    }

    const runSelectByQuery = () => {
        runInWorkflow(
            selectByQuery
        )
    }

    const runEmailFill = () => {
        runInWorkflow(async () => 
            runOnSelectedUsers(
                fillUserEmailCred, 
                "fill email creds"
            )
        )
    }

    const runEmailMap = () => {
        runInWorkflow(async () => 
            runOnSelectedUsers(
                makeMapEmailFunc(), 
                "map email creds"
            ) 
        )
    }


    const runEmailCreate = () => {
        runInWorkflow(async () => 
            makeCreateEmailFunc()
        )
    }

    const runEmailSend = () => {
        runInWorkflow(async () => 
            runOnSelectedUsers(
                sendCredEmailReset, 
                "send email reset"
            )
        )
    }

    const runResetToken = () => {
        runInWorkflow(async () => 
            runOnSelectedUsers(
                createResetToken, 
                `create a password reset token with expire set to ${expirePasswordUrl}`
            )
        )
        closeResetState()
    }

    const runDeleteCreds = () => { 
        runInWorkflow(async () => 
            runOnSelectedUsers(
                makeDeleteCredFunc(),
                `delete ${deleteCredsType()} creds`
            )
        )
    }

    const runEnableDisable = () => {
        runInWorkflow(async () => 
            runOnSelectedUsers(
                makeEnableDisableFunc(), 
                enableDisableType().toLowerCase()
            )
        )
    }

    const runDeleteUsers = () => {
        runInWorkflow(async () => 
            runOnSelectedUsers(
                deleteUserFunc, 
                'delete'
            )
        ).then(props.setNewSelectedUserIds(new Set()))
    }

    const runLogoutUsers = () => {
        runInWorkflow(async () => 
            runOnSelectedUsers(
                logoutUserFunc, 
                'logout'
            )
        )
    }

    const runSetUserAtt = () => {
        runInWorkflow(async () => 
            runOnSelectedUsers(
                setUserAttFunc, 
                "set user attributes"
            )
        )
        closeResetState()
    }

    const runDeleteUserAtt = () => {
        runInWorkflow(async () => 
            runOnSelectedUsers(
                deleteUserAttFunc, 
                "delete user attributes"
            )
        )
        closeResetState()
    }

    const runAddUsersGroups = () => {
        runInWorkflow(async () => 
            runOnSelectedUsers(
                addUserGroupsFunc, 
                "add users to groups"
            )
        )
        closeResetState()
    }

    const runRemoveUsersGroups = () => {
        runInWorkflow(async () => 
            runOnSelectedUsers(
                removeUserGroupsFunc, 
                "remove users from groups"
            )
        )
        closeResetState()
    }

    const runSetUsersRoles = () => {
        runInWorkflow(async () => 
            runOnSelectedUsers(
                setUserRolesFunc, 
                "set roles for users"
            )
        )
        closeResetState()
    }
    /*
    ******************* ACTION FUNCTIONS *******************
    */
    const runInWorkflow = async (func) => {
        clearLog()
        sendWorkflowEvent('RUN')

        try {
            await func()
        } catch (error) {
            console.log(error)
            log(`ERROR: unhandled exception in function '${func.name}'. See console too.`)
            log(error)
        }

        sendWorkflowEvent('REVIEW')
    }

    const runOnSelectedUsers = async (funcToRun, description = "") => {
        const selectedUsers = Array.from(props.selectedUserIds).map(u_id => props.usersMap.get(u_id))

        if (!selectedUsers.length) {
            log(
                "Whoops! No users were selected. Please select some users before running the action. "
                + "The last used config inputs will be saved until you refresh the page."
            )
            return
        }

        log(`${props.selectedUserIds.size} users selected to ${description}.`)
        
        try {
             // need to batch create promises to avoid hitting timeout issues 
            await asyncPool(15, selectedUsers, funcToRun);
            log(`Action complete; refreshing user table`)
        } catch (error) {
            log('FATAL: unhandled exception while running action on selected users. The first promise rejection is:')
            log(error)
            log('Refreshing user table to avoid showing inconsistent state')
        } finally {
            await props.loadUsersAndStuff()
        }
    }

    const selectByAttribute = async () => {
        // we're going to record which tokens match along with which ones didn't
        let foundCounts = {}
        let new_selectedUserIds = new Set()
        
        // this regex should cover us well but I still might be missing corner cases
        const tokens = selectByAttributeText.trim().split(/[\s,;\t\n]+/).filter(Boolean)
        
        log(`${tokens.length} search tokens provided`)
        
        tokens.forEach(t => foundCounts[t] = 0)

        props.usersMap.forEach((user, id) => {
            const idStr = id.toString()
            if (tokens.includes(idStr)) {
                new_selectedUserIds.add(id)
                foundCounts[idStr] = ++foundCounts[idStr]
            }
            // check both individually so we can cross both tokens off 
            // even if an id and email point to same account
            if (tokens.includes(user.email)) {
                new_selectedUserIds.add(id)
                foundCounts[user.email] = ++foundCounts[user.email]
            }
        })

        await props.setNewSelectedUserIds(new_selectedUserIds)
        log(`${new_selectedUserIds.size} users selected`)

        const unmatched = Object.keys(foundCounts).filter(token => foundCounts[token] === 0)
        log(`${unmatched.length} unmatched tokens`)
        
        if (unmatched.length > 0) {
            log("The unmatched tokens are:")
            log(unmatched)
        }
    }

    const selectByQuery = async () => {
        const slug = selectByQueryText

        log(`Fetching query slug '${slug}'`)
        let query
        try {
            query = await asyncLookerCall('query_for_slug', slug)
        } catch (error) {
            log("ERROR fetching query for slug. Make sure the slug exists.")
            log(error)
            return
        }
        
        if (!query.fields.includes("user.id")) {
            log("ERROR: query definition does not contain a 'user.id' column")
            return
        }
        
        log(`Running query id '${query.id}'`)
        let results
        try {
            results = await asyncLookerCall('run_query', {query_id: query.id, result_format: 'json'})
        } catch (error) {
            log("ERROR running query:")
            log(error)
            return
        }

        const ids = new Set(results.map(row => row['user.id']))
        log(`Found ${results.length} rows; ${ids.size} distinct user ids`)

        await props.setNewSelectedUserIds(ids)
        log("Selection complete")
    }
    
    const fillUserEmailCred = async (user) => {
        if (user.credentials_email) { 
            log(`Skip: user ${user.id}: already has email creds: ${user.credentials_email.email}`)
            return 
        }
        if (!user.email) { 
            log(`Skip: user ${user.id}: no email address from other creds`)
            return 
        }
        try { 
            const emailUpdate = lowerCaseEmail ? user.email.toLowerCase() : user.email
            await asyncLookerCall('create_user_credentials_email', user.id, {email: emailUpdate})
            log(`User ${user.id}: created credentials_email ${emailUpdate}`)
        } catch (error) {
            log(`ERROR: user ${user.id}: unable to create credentials_email. Message: '${error.message}'`)
        }
        return
    }

    const makeMapEmailFunc = () => {
        const rawData = Papa.parse(emailMapText).data
        const cleanData = rawData.map( arr => arr.map( el => el.trim() ).filter(Boolean) )
        const mappings = new Map(cleanData)

        const mapFunc = async (user) => {
            const oldEmail = user.email
            const newEmail = mappings.get(oldEmail)

            if (!newEmail) {
                log(`Skip: user ${user.id}: no mapping for email ${oldEmail}`)
                return
            }

            const op = user.credentials_email ? "update" : "create"
            
            try {
                await asyncLookerCall(`${op}_user_credentials_email`, user.id, {email: newEmail})
                log(`User ${user.id}: ${op}d credentials_email. old= ${oldEmail} :: new= ${newEmail}`)
            } catch (error) {
                log(`ERROR: user ${user.id}: unable to ${op} credentials_email. Message: '${error.message}'. Most likely the email is already in use.`)
            }
            return
        }
        return mapFunc
    }

    const makeCreateEmailFunc = async () => {
        let rawData

        try {
            rawData = Papa.parse(emailCreateText,
                {
                    header: true,
                    transform: field => field.trim(),
                    transformHeader: header => header.trim(),
                    dynamicTyping: field => { 
                        // validate UAs and set numeric type for number UAs 
                        const thisUserAtt = props.userAtt.filter(ua => ua.name === field)[0];                        
                        return (thisUserAtt.type === 'number') ? true : false;
                    }
                }).data   
        } catch (error) {
            log(`FATAL: There was an error parsing CSV data: ${error}`)
            log('No users were created.')
            return
        }

        const userData = rawData.filter(u => u.email !== "")

        const createUser = async (user) => {
            try { 
                const newUser = await asyncLookerCall('create_user', {first_name: user.first_name, last_name: user.last_name });
                log(`User ${newUser.id}: created for ${user.first_name} ${user.last_name}`);

                const newUserWithEmail = await asyncLookerCall('create_user_credentials_email', newUser.id, {email: user.email })
                    .then(response => {
                        log(`User ${newUser.id}: email credentials set to ${user.email}`);
                    })
                    .catch(error => {
                        log(`ERROR: user ${newUser.id}: Unable to set email credentials to ${user.email}: ${error.message}. Most likely the email is already in use. See network tab.`);
                    })

                const uaPromises = []
                for (const [key, value] of Object.entries(user)) {
                    // skip system defaults and empty string values
                    if (Boolean(value) && !SYSTEM_USER_ATTRIBUTES.includes(key)) {
                        const thisUserAtt = props.userAtt.filter(ua => ua.name === key)[0];  
                        const response = await asyncLookerCall('set_user_attribute_user_value', newUser.id, thisUserAtt.id, {value: value });
                        uaPromises.push(response)
                        log(`User ${newUser.id}: User Attribute ${key} set to: ${value}`);
                    }
                }
                return [newUserWithEmail, ...uaPromises]
            } catch (error) {
                log(`ERROR: user ${newUser.id}: unable to creating user / set User Attribute for ${user.email}: '${error.message}'`)
            }
        }

        Promise.allSettled(
            await asyncPool(15, userData, createUser)
        ).then(values => {
            log(`Action complete; refreshing user table`)
            props.loadUsersAndStuff()
        });

        return
    }

    const sendCredEmailReset = async (user) => {
        if (!user.credentials_email) {
            log(`Skip: user ${user.id}: no email credentials associated with: ${user.display_name}`);
            return;
        } 
        if (user.is_disabled) {
            log(`Skip: user ${user.id}: user is disabled`);
            return;
        }
        try {
            // endpoint is currently rate limited to 5 every 5 minutes - see rate_limit.rb
            const send_email = await asyncLookerCall('send_user_credentials_email_password_reset', user.id);
            log(`User ${user.id}: credentials sent to user's email ${user.credentials_email.email}`);
        } catch (error) {
            log(`ERROR: user ${user.id}: unable to send user credentials email. Message: '${error.message}'`);
        } 
        return;
    }

    const createResetToken = async (user) => {
        if (!user.credentials_email) {
            log(`Skip: user ${user.id}: no email credentials associated with: ${user.display_name}`);
            return;
        } 
        if (user.is_disabled) {
            log(`Skip: user ${user.id}: user is disabled`);
            return;
        }
        try {
            const req = await asyncLookerCall('create_user_credentials_email_password_reset', {user_id: user.id, expires: expirePasswordUrl });
            const resetUrl = req.logged_in_at === "" ? req.password_reset_url.replace("password/reset", "account/setup") : req.password_reset_url
            log(`User ${user.id}: reset url created for user ${user.credentials_email.email} => ${resetUrl}`);
        } catch (error) {
            log(`ERROR: user ${user.id}: unable to create reset url. Message: '${error.message}'`);
        } 
        return;
    }    

    const makeDeleteCredFunc = () => {
        const credType = deleteCredsType().toLowerCase()
        const propName = `credentials_${credType}`
        const methName = `delete_user_${propName}`
        
        const deleteFunc = async (user) => {
            if (!user[propName]) {
                log(`Skip: user ${user.id}: no ${propName} to delete`)
                return
            }
            try {
                await asyncLookerCall(methName, user.id)
                log(`User ${user.id}: deleted ${propName}`)
            } catch (error) {
                log(`ERROR: user ${user.id}: unable to delete ${propName}. Message: '${error.message}'`)
            }
            return
        }
        return deleteFunc
    }

    const makeEnableDisableFunc = () => {
        const changeType = enableDisableType().toLowerCase()
        const new_is_disabled = (changeType === "disable")

        const enableDisableFunc = async (user) => {
            if (user.is_disabled === new_is_disabled) {
                log(`Skip: user ${user.id}: already ${changeType}d`)
                return
            }
            try {
                await asyncLookerCall("update_user", user.id, {is_disabled: new_is_disabled})
                log(`User ${user.id}: ${changeType}d`)
            } catch (error) {
                log(`ERROR: user ${user.id}: unable to ${changeType}. Message: '${error.message}'`)
            }
            return
        }
        return enableDisableFunc
    }

    const deleteUserFunc = async (user) => {
        try {
            await asyncLookerCall("delete_user", user.id)
            log(`User ${user.id}: Deleted`)
        } catch (error) {
            log(`ERROR: user ${user.id}: unable to delete. Message: '${error.message}'`)
        }
        return;
    }

    const logoutUserFunc = async (user) => {
        const sessions = await asyncLookerCall("all_user_sessions", user.id)
        if (sessions.length === 0) {
            log(`User ${user.id}: No active sessions to delete`);
        } else {
            const sessionPromises = sessions.map(async (s) => {
                try {
                    const response = await asyncLookerCall("delete_user_session", user.id, s.id)
                    log(`User ${user.id}: ${s.credentials_type} session ${s.id} deleted`);
                } catch (error) {
                    log(`ERROR: user ${user.id}: unable to delete session ${s.id}. Message: '${error.message}'`)
                }
            })
            return Promise.allSettled(sessionPromises)
        }
        return
    }
    
    const setUserAttFunc = async (user) => {
        for (const [key, value] of userAttValueSet) {
            if (!value) continue;
            try {
                const thisUserAtt = props.userAtt.filter(ua => ua.name === key)[0];
                let newValue = value;
                if (thisUserAtt.type === 'number') newValue = Number(value);
                const response = await asyncLookerCall('set_user_attribute_user_value', user.id, thisUserAtt.id, {value: value});
                log(`User ${user.id}: User Attribute ${key} set to: ${value}`);
            } catch (error) {
                log(`ERROR: user ${user.id}: unable to set User Attribute for ${key} to ${value}. Message: '${error.message}'`);
            } 
        }
        return;
    }

    const deleteUserAttFunc = async (user) => {
        for (const [key, value] of userAttValueDelete) {
            if (!value) continue;
            try {
                const thisUserAttID = props.userAtt.filter(ua => ua.name === key)[0].id;
                const response = await asyncLookerCall('delete_user_attribute_user_value', user.id, thisUserAttID);
                log(`User ${user.id}: User Attribute ${key} deleted`);
            } catch (error) {
                log(`ERROR: user ${user.id}: unable to delete User Attribute for ${key}. Message: '${error.message}'`);
            }
        }
        return;
    }

    const addUserGroupsFunc = async (user) => {
        for (const [key, value] of addUsersGroups) {
            if (!value) continue;
            try {
                const groupName = props.groupsMap.get(key).name
                const response = await asyncLookerCall('add_group_user', key, {user_id: user.id});  // returns 200 regardless if user already in group or not
                log(`User ${user.id}: Added to group ${groupName}`);
            } catch (error) {
                log(`ERROR: user ${user.id}: unable to add user to group ${groupName}. Message: '${error.message}'`);
            }
        }
        return;
    }

    const removeUserGroupsFunc = async (user) => {
        for (const [key, value] of removeUsersGroups) {
            if (!value) continue;
            try {
                const groupName = props.groupsMap.get(key).name
                const response = await asyncLookerCall('delete_group_user', key, user.id);  // returns 204 regardless if user was in the group or not
                log(`User ${user.id}: Removed from group ${groupName}`);
            } catch (error) {
                log(`ERROR: user ${user.id}: unable to remove user from group ${groupName}. Message: '${error.message}'`);
            }
        }
        return;
    }

    const setUserRolesFunc = async (user) => {
        const roles = [...setUsersRoles]
            .filter(([key, value]) => Boolean(value))
            .map(([key, value]) => key)
        const roleNames = roles.map(r =>  props.rolesMap.get(r).name ) 

        try {
            const response = await asyncLookerCall('set_user_roles', user.id, roles);
            log(`User ${user.id}: Roles set to: ${roleNames}`);
        } catch (error) {
            log(`ERROR: user ${user.id}: unable to set roles to ${roleNames}. Message: '${error.message}'`);
        }
        return;
    }

    /*
    ******************* RENDERING *******************
    */
    function renderSelectBy() {
        return (
            <>
            <Menu>
                <MenuDisclosure>
                    <ButtonOutline iconAfter="ArrowDown"  mr="xsmall">Select By</ButtonOutline>
                </MenuDisclosure>
                <MenuList placement="right-start">
                    <MenuItem icon="FindSelected" onClick={openSelectByAttribute}>{ACTION_INFO.selectByAttribute.menuTitle}</MenuItem>
                    <MenuItem icon="Table" onClick={openSelectByQuery}>{ACTION_INFO.selectByQuery.menuTitle}</MenuItem>
                </MenuList>
            </Menu>
            
            {/*
            ******************* SELECT BY ATTRIBUTE Dialog *******************
            */}
            <Dialog
              isOpen={isDialogOpen('selectByAttribute')}
              onClose={handleClose}
            >
              <ConfirmLayout
                title={ACTION_INFO.selectByAttribute.dialogTitle}
                message={
                    <>
                    <Paragraph mb="small">
                        Paste a list of user ids or email addresses. 
                        They can be separated by comma, semicolon, or any whitespace (space, tab, newline).
                    </Paragraph>
                    <TextArea resize value={selectByAttributeText} onChange={onChangeSelectByAttributeText}/>
                    </>
                }
                primaryButton={<Button onClick={runSelectByAttribute}>Select</Button>}
                secondaryButton={<ButtonTransparent onClick={handleClose}>Cancel</ButtonTransparent>}
              />
            </Dialog>

            {/*
            ******************* SELECT BY QUERY Dialog *******************
            */}
            <Dialog
              isOpen={isDialogOpen('selectByQuery')}
              onClose={handleClose}
            >
              <ConfirmLayout
                title={ACTION_INFO.selectByQuery.dialogTitle}
                message={
                    <>
                    <Paragraph mb="small">
                        Enter a query slug (qid) from the URL of a System Activity explore such as&nbsp;
                        <Link onClick={() => context.extensionSDK.openBrowserWindow("/explore/system__activity/user", '_blank')}>User</Link>
                        &nbsp;or <Link onClick={() => context.extensionSDK.openBrowserWindow("/explore/system__activity/history", '_blank')}>History</Link>.
                        The query must have a "user.id" column which will be used to select the user accounts.
                    </Paragraph>
                    <InputText value={selectByQueryText} onChange={onChangeSelectByQueryText}/>
                    </>
                }
                primaryButton={<Button onClick={runSelectByQuery}>Select</Button>}
                secondaryButton={<ButtonTransparent onClick={handleClose}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            </>
        )
    }


    function renderManageEmailCreds() {
        return (
            <>
            <Menu>
                <MenuDisclosure>
                    <ButtonOutline iconAfter="ArrowDown" mr="xsmall">Bulk Mappings</ButtonOutline>
                </MenuDisclosure>
                <MenuList placement="right-start">
                    <MenuItem icon="UserAttributes" onClick={openEmailCreate}>{ACTION_INFO.emailCreate.menuTitle}</MenuItem>
                    <MenuItem icon="VisTable" onClick={openEmailMap}>{ACTION_INFO.emailMap.menuTitle}</MenuItem>
                </MenuList>
            </Menu>
            
            {/*
            ******************* EMAIL FILL Dialog *******************
            */}
            <Dialog
              isOpen={isDialogOpen("emailFill")}
              onClose={handleClose}
            >
              <ConfirmLayout
                title={ACTION_INFO.emailFill.dialogTitle}
                message={
                    <>
                    This will create <Text fontWeight="bold">email</Text> creds for <Text fontWeight="bold">{props.selectedUserIds.size}</Text> selected users. 
                    <SpaceVertical>
                        <List type="bullet">
                            <ListItem>
                                It will use the email address already assigned to the user by the other cred types.
                            </ListItem> 
                            <ListItem>
                                It won't do anything for accounts that already have an email cred.
                            </ListItem>
                            <ListItem>
                                Later you can update the address manually or by using a bulk mapping.
                            </ListItem>
                        </List>
                        <FieldCheckbox label={'Convert email addresses to lowercase'} checked={lowerCaseEmail} onChange={onChangeSetLowerCaseEmail} inline />
                        <Space/>
                    </SpaceVertical>
                    </>
                }
                primaryButton={<Button onClick={runEmailFill}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={handleClose}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            {/*
            ******************* EMAIL MAP Dialog *******************
            */}
            <Dialog
              isOpen={isDialogOpen("emailMap")}
              onClose={handleClose}
            >
              <ConfirmLayout
                title={ACTION_INFO.emailMap.dialogTitle}
                message={
                    <>
                    <Paragraph mb="small">
                        Paste a CSV of email address mappings. 
                        There should be two addresses per line, separated by a comma.
                    </Paragraph>
                    <Paragraph mb="small">
                        If a user currently has the email address in the first column, 
                        the address for their credentials_email record will be created/updated 
                        to the value in the second column. We cannot update the address that is
                        associated to an SSO credential - that must be changed via the SSO provider.
                    </Paragraph>
                    <Paragraph mb="small">
                        Note that duplicate email addresses are not allowed in Looker. If the target address 
                        is already in use then the user will be skipped.
                    </Paragraph>
                    <MonospaceTextArea 
                        resize 
                        value={emailMapText} 
                        onChange={onChangeEmailMapText} 
                        placeholder={"jon.snow@old.com,jsnow@new.com         arya.stark@old.com,astark@new.com"}
                    />
                    </>
                }
                primaryButton={<Button onClick={runEmailMap}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={handleClose}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            {/*
            ******************* EMAIL CREATE Dialog *******************
            */}
            <Dialog
              isOpen={isDialogOpen("emailCreate")}
              onClose={handleClose}
            >
              <ConfirmLayout
                title={ACTION_INFO.emailCreate.dialogTitle}
                message={
                    <>
                    <Paragraph mb="small">
                        Paste a CSV of new users with User Attributes (UA). There should be
                        one user per line. For UA values that have a comma, e.g. an advanced 
                        data type leveraging Looker's filter expressions, ensure that the values
                        are wrapped in double quotes (").
                    </Paragraph>
                    <Paragraph mb="small">
                        The header must begin with email, first_name, last_name for the first 3 columns, 
                        with the remaining columns containing any additional UAs (optional). All UA header 
                        values must match the name stored in Looker or the import will not run.
                    </Paragraph>
                    <Paragraph mb="small">
                        Note that duplicate email addresses are not allowed in Looker. If the email address 
                        is already in use then the email credentials will not be set. Later you can send
                        setup emails to these new users via the Send Email Creds function.
                    </Paragraph>
                    <MonospaceTextArea 
                        resize 
                        value={emailCreateText} 
                        onChange={onChangeEmailCreateText} 
                        placeholder={'email,first_name,last_name,house,castle\nthebastard@got.com,Jon,Snow,"Stark,Targaryen",Castle Black\nkingslayer@got.com,Jamie,Lannister,Lannister,Casterly Rock'}
                    />
                    </>
                }
                primaryButton={<Button onClick={runEmailCreate}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={handleClose}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            {/*
            ******************* EMAIL SEND Dialog *******************
            */}
            <Dialog
              isOpen={isDialogOpen("emailSend")}
              onClose={handleClose}
            >
              <ConfirmLayout
                title={ACTION_INFO.emailSend.dialogTitle}
                message={
                    <>
                    This will send a password reset email for <Text fontWeight="bold">{props.selectedUserIds.size}</Text> selected users. 
                    <List type="bullet">
                        <ListItem>
                            If a password reset token does not already exist for this user, it will create one and then send it.
                        </ListItem> 
                        <ListItem>
                            If the user has not yet set up their account, it will send a setup email to the user.
                        </ListItem>
                        <ListItem>
                            Password reset URLs will expire in 60 minutes.
                        </ListItem>
                        <ListItem>
                            This endpoint is rate limited to 5 requests every 5 minutes. If you require higher throughput, 
                            use the Create Password Reset URL function and share the generated URL with users manually.
                        </ListItem>
                    </List>
                    </>
                }
                primaryButton={<Button onClick={runEmailSend}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={handleClose}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            {/*
            ******************* PASSWORD RESET TOKEN Dialog *******************
            */}
            <Dialog
              isOpen={isDialogOpen("resetToken")}
              onClose={closeResetState}
            >
              <ConfirmLayout
                title={ACTION_INFO.resetToken.dialogTitle}
                message={
                    <>
                    This will create a cryptographically secure random password reset URL for <Text fontWeight="bold">{props.selectedUserIds.size}</Text> selected users. 
                    <SpaceVertical>
                        <List type="bullet">
                            <ListItem>
                                It is your responsibility to <Text fontWeight="bold">securely share</Text> the URL with the user.
                            </ListItem>
                            <ListItem>
                                If the user already has a password reset token then this invalidates the old token and creates a new one.
                            </ListItem> 
                            <ListItem>
                                For users that have never logged in to Looker yet, this will create a 'account/setup' URL. For users have
                                logged in at least once, this will create a 'password/reset' URL.
                            </ListItem>
                            <ListItem>
                                The expire period is 60 minutes when enabled.
                            </ListItem>                            
                        </List>
                        <FieldCheckbox label={'Expiring URL'} checked={expirePasswordUrl} onChange={onChangeSetExpiringPasswordUrl} inline />
                        <Space/>
                    </SpaceVertical>
                    </>
                }
                primaryButton={<Button onClick={runResetToken}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={closeResetState}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            </>            
        )
    }

    function renderDeleteCreds() {
        return (
            <>
            {/*
            ******************* DELETE CRED Dialog *******************
            */}
            <Dialog
              isOpen={isDialogOpen("deleteCreds")}
              onClose={handleClose}
            >
              <ConfirmLayout
                title={`Delete ${deleteCredsType()} Credentials`}
                message={
                    <>
                    This will delete <Text fontWeight="bold">{deleteCredsType()}</Text> creds for <Text fontWeight="bold">{props.selectedUserIds.size}</Text> selected users.
                    <List type="bullet">
                        <ListItem>
                            If you delete the email creds and don't have SSO enabled, users won't be able to login.
                        </ListItem>
                        <ListItem>
                            If you completely delete all creds from a user, subsequent SSO logins won't find anything on which to merge and will create a new account.
                        </ListItem>
                        <ListItem>
                            Once all creds are gone, the only way to fix an account is to manually supply an email address.
                        </ListItem>
                        <ListItem>
                            It is not possible to manually create SSO creds; that can only be done by the login flow.
                        </ListItem>
                    </List>
                    </>
                }
                primaryButton={<Button onClick={runDeleteCreds}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={handleClose}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            </>
        )
    }

    function SetUserAttFields() {
        const editableUserAtt = props.userAtt.filter(ua => !ua.is_system)
        return (
            <>
                {editableUserAtt.map(ua => (
                    <FieldText name={ua.name} label={ua.label} key={ua.id} value={userAttValueSet.get(ua.name)} onChange={onChangeSetUserAttValues} inline />
                ))} 
            </>
        )
    }

    function DeleteUserAttFields() {
        const editableUserAtt = props.userAtt.filter(ua => !ua.is_system)
        return (
            <>
                {editableUserAtt.map(ua => (
                    <FieldCheckbox name={ua.name} label={ua.label} key={ua.id} checked={userAttValueDelete.get(ua.name)} onChange={onChangeDeleteUserAttValues} inline />
                ))} 
            </>
        )
    }

    function GroupFields(groupSelectProps) { 
        const [groupNameSearch, set_groupNameSearch] = useState("")
        const groups = Array.from(props.groupsMap, ([key, value]) => {return {label: value.name, value: key.toString(), readOnly: value.externally_managed}})
        const validGroups = groups
            .filter(g => g.label !== 'All Users')
            .filter(g => g.label.toLowerCase().indexOf(groupNameSearch.toLowerCase()) >= 0)
        return (
            <SpaceVertical>
                <InputSearch placeholder="Type your search" value={groupNameSearch} onChange={e => set_groupNameSearch(e.target.value)} hideControls={true}/>
                {validGroups.map(g => (
                    <FieldCheckbox name={g.value} label={g.label} key={g.value} checked={groupSelectProps.values.get(g.value)} onChange={groupSelectProps.handleChange} readOnly={g.readOnly} inline />
                ))}
            </SpaceVertical> 
        )
    }
    
    function RoleFields() {
        const [roleNameSearch, set_roleNameSearch] = useState("")
        const roles = chain(Array.from(props.rolesMap, ([key, value]) => {return {label: value.name, value: key.toString()}}))
            .sortBy(["label"])
            .value()
            .filter(r => r.label.toLowerCase().indexOf(roleNameSearch.toLowerCase()) >= 0);
        return (
            <SpaceVertical>
                <InputSearch placeholder="Type your search" value={roleNameSearch} onChange={e => set_roleNameSearch(e.target.value)} hideControls={true}/>
                {roles.map(r => (
                    <FieldCheckbox name={r.value} label={r.label} key={r.value} checked={setUsersRoles.get(r.value)} onChange={onChangeSetUserRoles} inline />
                ))} 
            </SpaceVertical>
        )
    }
    
    function userActions() {
        return (
            <>
            <Menu>
                <MenuDisclosure>
                    <ButtonOutline iconAfter="ArrowDown" mr="xsmall">Functions</ButtonOutline>
                </MenuDisclosure>
                <MenuList placement="right-start">
                    <MenuGroup label="Users">
                        <MenuItem icon="User" onClick={() => openEnableDisable("Enable")}> Enable users</MenuItem>
                        <MenuItem icon="User" onClick={() => openEnableDisable("Disable")}> Disable users</MenuItem>
                        <MenuItem icon="Trash" onClick={() => openDeleteUsers()}> {ACTION_INFO.deleteUsers.menuTitle}</MenuItem>
                        <MenuItem icon="Logout" onClick={() => openLogoutUsers()}> {ACTION_INFO.logoutUsers.menuTitle}</MenuItem>
                    </MenuGroup>
                    <MenuGroup label="User Attributes">
                        <MenuItem icon="UserAttributes" onClick={() => openSetUserAtt()}> {ACTION_INFO.setUserAtt.menuTitle}</MenuItem>
                        <MenuItem icon="UserAttributes" onClick={() => openDeleteUserAtt()}> {ACTION_INFO.deleteUserAtt.menuTitle}</MenuItem>                    
                    </MenuGroup>
                    <MenuGroup label="Groups">
                        <MenuItem icon="Group" onClick={() => openAddUsersGroups()}> {ACTION_INFO.addUsersGroups.menuTitle}</MenuItem>
                        <MenuItem icon="Group" onClick={() => openRemoveUsersGroups()}> {ACTION_INFO.removeUsersGroups.menuTitle}</MenuItem>
                    </MenuGroup>
                    <MenuGroup label="Roles">
                        <MenuItem icon="Tune" onClick={() => openSetUsersRoles()}>{ACTION_INFO.setUsersRoles.menuTitle}</MenuItem>
                    </MenuGroup>
                    <MenuGroup label="Manage Credentials">
                        <MenuItem icon="Return" onClick={openEmailFill}>{ACTION_INFO.emailFill.menuTitle}</MenuItem>
                        <MenuItem icon="SendEmail" onClick={openEmailSend}>{ACTION_INFO.emailSend.menuTitle}</MenuItem>
                        <MenuItem icon="Download" onClick={openResetToken}>{ACTION_INFO.resetToken.menuTitle}</MenuItem>
                        {["Email", "Google", "LDAP", "OIDC", "SAML"].map((credType) => {
                            return <MenuItem icon="CircleRemove" key={credType} onClick={() => openDelete(credType)}>{"Delete " + credType}</MenuItem>
                        })}
                    </MenuGroup>
                </MenuList>
            </Menu>
            {/*
            ******************* ENABLE/DISABLE Dialog *******************
            */}
            <Dialog
              isOpen={isDialogOpen("enableDisable")}
              onClose={handleClose}
            >
              <ConfirmLayout
                title={`${enableDisableType()} Users`}
                message={
                    <>
                    <Paragraph>
                        This will <Text fontWeight="bold">{enableDisableType().toLowerCase()}</Text> <Text fontWeight="bold">{props.selectedUserIds.size}</Text> selected users.
                    </Paragraph>
                    <Paragraph>
                        For details about what happens when you disable a user, see the documention for&nbsp;
                        <Link onClick={() => context.extensionSDK.openBrowserWindow("https://docs.looker.com/admin-options/settings/users#removing_user_access", '_blank')}>
                            Removing User Access
                        </Link>.
                    </Paragraph>
                    </>
                }
                primaryButton={<Button onClick={runEnableDisable}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={handleClose}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            {/*
            ******************* DELETE Dialog *******************
            */}
            <Dialog
              isOpen={isDialogOpen("deleteUsers")}
              onClose={handleClose}
            >
              <ConfirmLayout
                title={ACTION_INFO.deleteUsers.dialogTitle}
                message={
                    <>
                    <SpaceVertical>
                        <Paragraph>
                            This will permanently delete the <Text fontWeight="bold">{props.selectedUserIds.size}</Text> selected users.
                        </Paragraph>
                        <Paragraph>
                            <Text fontWeight="bold">
                                WARNING: Deleting a user is a irreversible action and will result in the loss of the user's content, 
                                schedules, and historical usage.
                            </Text>
                        </Paragraph>
                        <Paragraph>
                            It is highly recommended to disable user accounts, as opposed to deleting them, as this
                            will retain this data.
                        </Paragraph> 
                        <Paragraph>
                            For details about what happens when you delete a user, and the differences to 
                            disabling, see the documention for&nbsp;
                            <Link onClick={() => context.extensionSDK.openBrowserWindow("https://docs.looker.com/admin-options/settings/users#removing_user_access", '_blank')}>
                                Removing User Access
                            </Link>.
                        </Paragraph>
                    </SpaceVertical>
                    </>
                }
                primaryButton={<Button color="critical" onClick={runDeleteUsers}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={handleClose}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            {/*
            ******************* FORCE LOGOUT Dialog *******************
            */}
            <Dialog
              isOpen={isDialogOpen("logoutUsers")}
              onClose={handleClose}
            >
              <ConfirmLayout
                title={ACTION_INFO.logoutUsers.dialogTitle}
                message={
                    <>
                    <SpaceVertical>
                        <Paragraph>
                            This will force logout the <Text fontWeight="bold">{props.selectedUserIds.size}</Text> selected users.
                        </Paragraph>
                        <Paragraph>
                            If&nbsp;
                            <Link onClick={() => context.extensionSDK.openBrowserWindow("https://docs.looker.com/admin-options/security/persistent-sessions#concurrent_sessions", '_blank')}>
                            Concurrent Sessions
                            </Link>
                            &nbsp;is enabled, users may have multiple sessions from different browsers and devices 
                            simultaneously. This function will terminate all sessions for each user.
                        </Paragraph> 
                        <Paragraph>
                            If users are authenticated with an IdP, any group membership changes in the IdP will be updated in Looker
                            the next time the user logs in.
                        </Paragraph> 
                    </SpaceVertical>
                    </>
                }
                primaryButton={<Button color="critical" onClick={runLogoutUsers}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={handleClose}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            {/*
            ******************* SET USER ATTRIBUTES Dialog *******************
            */}
            <Dialog
              isOpen={isDialogOpen("setUserAtt")}
              onClose={closeResetState}
            >
              <ConfirmLayout
                title={ACTION_INFO.setUserAtt.dialogTitle}
                message={
                    <>
                    <SpaceVertical>
                        <Paragraph>
                            This will set the following User Attributes for the <Text fontWeight="bold">{props.selectedUserIds.size}</Text> selected users.
                            Per-user User Attribute values take precedence over Group or default values.
                        </Paragraph>
                        <SetUserAttFields/>
                    </SpaceVertical>
                    </>
                }
                primaryButton={<Button onClick={runSetUserAtt}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={closeResetState}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            {/*
            ******************* DELETE USER ATTRIBUTES Dialog *******************
            */}
            <Dialog
              isOpen={isDialogOpen("deleteUserAtt")}
              onClose={closeResetState}
            >
              <ConfirmLayout
                title={ACTION_INFO.deleteUserAtt.dialogTitle}
                message={
                    <>
                    <SpaceVertical>
                        <Paragraph>
                            This will delete the following User Attributes for the <Text fontWeight="bold">{props.selectedUserIds.size}</Text> selected users.
                            After the User Attribute value is deleted from the user's account settings, subsequent requests
                            for the User Attribute value for this user will draw from the user's Groups or the default
                            value of the User Attribute.
                        </Paragraph>
                        <DeleteUserAttFields/>
                    </SpaceVertical>
                    </>
                }
                primaryButton={<Button onClick={runDeleteUserAtt}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={closeResetState}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            {/*
            ******************* ADD USERS TO GROUPS Dialog *******************
            */}
            <Dialog
              isOpen={isDialogOpen("addUsersGroups")}
              onClose={closeResetState}
            >
              <ConfirmLayout
                title={ACTION_INFO.addUsersGroups.dialogTitle}
                message={
                    <>
                    <SpaceVertical>
                        <Paragraph>
                            This will add the <Text fontWeight="bold">{props.selectedUserIds.size}</Text> selected users
                            to the selected Groups.
                        </Paragraph>
                        <GroupFields values={addUsersGroups} handleChange={onChangeAddUsersGroups}/>
                    </SpaceVertical>
                    </>
                }
                primaryButton={<Button onClick={runAddUsersGroups}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={closeResetState}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            {/*
            ******************* REMOVE USERS TO GROUPS Dialog *******************
            */}
            <Dialog
              isOpen={isDialogOpen("removeUsersGroups")}
              onClose={closeResetState}
            >
              <ConfirmLayout
                title={ACTION_INFO.removeUsersGroups.dialogTitle}
                message={
                    <>
                    <SpaceVertical>
                        <Paragraph>
                            This will remove the <Text fontWeight="bold">{props.selectedUserIds.size}</Text> selected users
                            from the selected Groups.
                        </Paragraph>
                        <GroupFields values={removeUsersGroups} handleChange={onChangeRemoveUsersGroups}/>
                    </SpaceVertical>
                    </>
                }
                primaryButton={<Button onClick={runRemoveUsersGroups}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={closeResetState}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            {/*
            ******************* SET USERS TO ROLES Dialog *******************
            */}
            <Dialog
              isOpen={isDialogOpen("setUsersRoles")}
              onClose={closeResetState}
            >
              <ConfirmLayout
                title={ACTION_INFO.setUsersRoles.dialogTitle}
                message={
                    <>
                    <SpaceVertical>
                        <Paragraph>
                            This will set the selected Roles for the <Text fontWeight="bold">{props.selectedUserIds.size}</Text> selected 
                            users.
                        </Paragraph>
                        <Paragraph>
                            It will overwrite any existing Roles set at a user level. Selecting no Roles will clear all Roles for each
                            user. Users will still retain any Roles that are associated to the Groups the user belongs to.
                        </Paragraph>
                        <RoleFields/>
                    </SpaceVertical>
                    </>
                }
                primaryButton={<Button onClick={runSetUsersRoles}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={closeResetState}>Cancel</ButtonTransparent>}
              />
            </Dialog> 
            </>
        )
    }

    function renderViewLog() {
        return (
            <>
            <ButtonOutline onClick={openViewLog}>View Log</ButtonOutline>
            {/*
            ******************* REVIEW Dialog *******************
            */}
            <Dialog
                isOpen={isReviewOpen()}
                onClose={handleClose}
                width={`${logWidth() * 0.75}em`}
                maxWidth="80vw"
            >
                <ConfirmLayout
                    title={reviewDialogTitle()}
                    message={
                      <>
                        <Paragraph mb="small" width="50rem">
                            Execution log:
                        </Paragraph>
                        <MonospaceTextArea readOnly resize height="50vh" value={logMessages.join("\n")} />
                      </>
                    }
                    primaryButton={isRunning() ? <Button disabled>In Progress</Button> : <Button onClick={handleClose}>Close</Button>}
                />
            </Dialog>
            </>
        )
    }

    return (  
        <>
        {renderSelectBy()}
        {renderManageEmailCreds()}
        {renderDeleteCreds()}
        {userActions()}
        {renderViewLog()}
        </>
    )
}