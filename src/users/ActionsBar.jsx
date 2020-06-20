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
import { ExtensionContext } from '@looker/extension-sdk-react'
import { ACTION_INFO, WORKFLOW_MACHINE } from './constants'
import { makeLookerCaller } from '../shared/utils'
import styled from "styled-components"
import {
    Button, ButtonOutline, ButtonTransparent,
    Menu, MenuDisclosure, MenuList, MenuItem,
    Dialog, ConfirmLayout,
    List, ListItem,
    Text, Paragraph,
    TextArea, InputText,
    Link
  } from '@looker/components'

const MonospaceTextArea = styled(TextArea)`
    textarea {
        font-family:monospace;
    }
`
export function ActionsBar(props) {
    const context = useContext(ExtensionContext) // provides the coreSDK object
    const asyncLookerCall = makeLookerCaller(context.coreSDK)

    const [workflowMachine, sendWorkflowEvent] = useMachine(WORKFLOW_MACHINE)

    const [selectByAttributeText, set_selectByAttributeText] = useState("")
    const [selectByQueryText, set_selectByQueryText] = useState("")
    const [emailMapText, set_emailMapText] = useState("")
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
    
    const openDelete = (type) => { 
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'deleteCreds', deleteCredsType: type})
    }

    const openEnableDisable = (type) => {
        sendWorkflowEvent({type: 'CONFIGURE', appAction: 'enableDisable', enableDisableType: type})
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

        const promises = selectedUsers.map(funcToRun)
        
        try {
            await Promise.all(promises) 
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
            await asyncLookerCall('create_user_credentials_email', user.id, {email: user.email})
            log(`User ${user.id}: created credentials_email ${user.email}`)
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
                    <ButtonOutline iconAfter="ArrowDown" mr="xsmall">Manage Email</ButtonOutline>
                </MenuDisclosure>
                <MenuList placement="right-start">
                    <MenuItem icon="Return" onClick={openEmailFill}>{ACTION_INFO.emailFill.menuTitle}</MenuItem>
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
            </>
        )
    }

    function renderDeleteCreds() {
        return (
            <>
            <Menu>
                <MenuDisclosure>
                    <ButtonOutline iconAfter="ArrowDown" mr="xsmall">Delete Creds</ButtonOutline>
                </MenuDisclosure>
                <MenuList placement="right-start">
                    {["Email", "Google", "LDAP", "OIDC", "SAML"].map((credType) => {
                        return <MenuItem key={credType} onClick={() => openDelete(credType)}>{credType}</MenuItem>
                    })}
                </MenuList>
            </Menu>
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

    function renderDisable() {
        return (
            <>
            <Menu>
                <MenuDisclosure>
                    <ButtonOutline iconAfter="ArrowDown" mr="xsmall">Disable</ButtonOutline>
                </MenuDisclosure>
                <MenuList placement="right-start">
                    <MenuItem icon="Block" onClick={() => openEnableDisable("Disable")}>Disable</MenuItem>
                    <MenuItem icon="Undo" onClick={() => openEnableDisable("Enable")}>Enable</MenuItem>
                    {/* <MenuItem icon="Trash">Delete</MenuItem> */}
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
        {renderDisable()}
        {renderViewLog()}
        </>
    )
}