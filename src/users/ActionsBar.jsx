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
import Papa from 'papaparse' // csv parsing library
import { ExtensionContext } from '@looker/extension-sdk-react'
import { makeLookerCaller } from '../shared/utils'
import styled from "styled-components"
import {
    Button, ButtonOutline, ButtonTransparent,
    Menu, MenuDisclosure, MenuList, MenuItem,
    Dialog, ConfirmLayout,
    List, ListItem,
    Text, Paragraph,
    TextArea,
    Icon,
    Tooltip,
    Link
  } from '@looker/components'

const actionInfo = {
    selectBy: {
        menuTitle: "ID or email address",
        dialogTitle: "Select Users"
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
    deleteCreds: {
        dialogTitle: "Delete Credentials"
    },
    enableDisable: {
        dialogTitle: "Enable/Disable Users"
    }
}

const MonospaceTextArea = styled(TextArea)`
    textarea {
        font-family:monospace;
    }
`

export class ActionsBar extends React.Component {
    static contextType = ExtensionContext // provides the coreSDK object

    constructor (props) {
        super(props)

        this.state = {
            currentAction: false,
            isRunning: false,
            isReview: false,
            deleteCredsType: "",
            enableDisableType: "",
            selectByText: "",
            emailMapText: "",
            logMessages: []
        }
    }

    componentDidMount() {
        this.asyncLookerCall = makeLookerCaller(this.context.coreSDK)
    }

    /*
     ******************* HELPERS *******************
     */

    isCurrentAction = (name) => (this.state.currentAction === name)

    // allows us to wait for the state change to resolve
    async asyncSetState(newState) {
        return new Promise(resolve => this.setState(newState, resolve))
    }

    async setRunning(value) {
        return this.asyncSetState({isRunning: value})
    }

    async setIsReview(value) {
        return this.asyncSetState({isReview: value})
    }

    async clearLog() {
        return this.asyncSetState({logMessages: []})
    }

    log(entry) {
        // Array.prototype.concat() returns a copy and handles both scalars and arrays :)
        const new_logMessages = this.state.logMessages.concat(entry)
        this.setState({logMessages: new_logMessages})
    }

    logWidth() {
        const lineLengths = this.state.logMessages.map(line => line.length)
        return Math.max(...lineLengths)
    }

    reviewDialogTitle() {
        if (this.state.currentAction) {
            return `${actionInfo[this.state.currentAction].dialogTitle} - ${this.state.isRunning ? "In Progress" : "Complete"}`
        }
        return ""
    }

    /*
     ******************* DIALOG CALLBACKS *******************
     */
    handleClose = () => {  
        if (this.props.isRunning) { return } // Can't close the review dialog while an action is running
        this.setState({
            isReview: false,
            currentAction: null
        })
    }

    openSelectBy = () => {
        this.setState({currentAction: "selectBy"})
    }

    onChangeSelectByText = (e) => {
        this.setState({selectByText: e.currentTarget.value})
    }

    onChangeEmailMapText = (e) => {
        this.setState({emailMapText: e.currentTarget.value})
    }

    openEmailFill = () => { 
        this.setState({currentAction: "emailFill"})
    } 

    openEmailMap = () => {
        this.setState({currentAction: "emailMap"})
    }
    
    openDelete = (type) => { 
        this.setState({
            currentAction: "deleteCreds",
            deleteCredsType: type
        })
    }

    openEnableDisable = (type) => {
        this.setState({
            currentAction: "enableDisable",
            enableDisableType: type
        })
    }

    openViewLog = () => {
        this.setIsReview(true)
    }

    handleRunSelectBy = () => {
        this.runInWorkflow(this.runSelectBy)
    }

    handleRunEmailFill = () => {
        this.runInWorkflow(
            () => this.runOnSelectedUsers(this.fillUserEmailCred, "fill email creds")
        )
    }

    handleRunEmailMap = () => {
        this.runInWorkflow(
            () => this.runOnSelectedUsers(this.makeMapEmailFunc(), "map email creds") 
        )
    }

    handleRunDeleteCreds = () => { 
        this.runInWorkflow(
            () => this.runOnSelectedUsers(this.makeDeleteCredFunc(), `delete ${this.state.deleteCredsType} creds`)
        )
    }

    handleRunEnableDisable = () => {
        this.runInWorkflow(
            () => this.runOnSelectedUsers(this.makeEnableDisableFunc(), `${this.state.enableDisableType} users`)
        )
    }

    /*
    ******************* ACTION FUNCTIONS *******************
    */
    runInWorkflow = async (func) => {
        await this.clearLog()
        await this.setRunning(true)
        await this.setIsReview(true)

        try {
            await func()
        } catch (error) {
            console.log(error)
            this.log(`ERROR: unhandled exception '${error.name}' in function '${func.name}'. Message: '${error.message}'. See console for more info.`)
        }

        this.setRunning(false)
    }

    runOnSelectedUsers = async (func, name = "unnammed") => {
        const selectedUsers = Array.from(this.props.selectedUserIds).map(u_id => this.props.usersMap.get(u_id))

        if (!selectedUsers.length) {
            this.log(
                "Whoops! No users were selected. Please select some users before running the action. "
                + "Your inputs will be saved until you refresh the page."
            )
            return
        }

        const promises = selectedUsers.map(func.bind(this))
        await Promise.all(promises)
        
        //await new Promise(r => setTimeout(r, 10000));
        //console.log(`did the ${name} operation`)
        
        await this.props.loadUsersAndStuff()
    }

    runSelectBy = async () => {
        // we're going to record which tokens match along with which ones didn't
        let foundCounts = {}
        let new_selectedUserIds = new Set()
        
        // this regex should cover us well but I still might be missing corner cases
        const tokens = this.state.selectByText.trim().split(/[\s,;\t\n]+/).filter(Boolean)
        
        this.log(`${tokens.length} search tokens provided`)
        
        tokens.forEach(t => foundCounts[t] = 0)

        this.props.usersMap.forEach((user, id) => {
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

        await this.props.setNewSelectedUserIds(new_selectedUserIds)
        this.log(`${new_selectedUserIds.size} users selected`)

        const unmatched = Object.keys(foundCounts).filter(token => foundCounts[token] === 0)
        this.log(`${unmatched.length} unmatched tokens`)
        
        if (unmatched.length > 0) {
            this.log("The unmatched tokens are:")
            this.log(unmatched)
        }
    }
    
    fillUserEmailCred = async (user) => {
        if (user.credentials_email) { 
            this.log(`Skip: user ${user.id} already has email creds: ${user.credentials_email.email}`)
            return 
        }
        if (!user.email) { 
            console.log(`Skip: user ${user.id} has no email address from other creds`)
            return 
        }
        try { 
            await this.asyncLookerCall('create_user_credentials_email', user.id, {email: user.email})
            this.log(`Created credentials_email for user id ${user.id}: ${user.email}`)
        } catch (error) {
            this.log(`ERROR: unable to create credentials_email for user id ${user.id}. Message: '${error.message}'`)
        }
    }

    makeMapEmailFunc = () => {
        const rawData = Papa.parse(this.state.emailMapText).data
        const cleanData = rawData.map( arr => arr.map( el => el.trim() ).filter(Boolean) )
        const mappings = new Map(cleanData)

        const mapFunc = async (user) => {
            const oldEmail = user.email
            const newEmail = mappings.get(oldEmail)

            if (!newEmail) {
                this.log(`Skip: user ${user.id} - no mapping for email ${oldEmail}`)
                return
            }

            const op = user.credentials_email ? "update" : "create"
            
            try {
                await this.asyncLookerCall(`${op}_user_credentials_email`, user.id, {email: newEmail})
                this.log(`${op}d credentials_email for user ${user.id}: old= ${oldEmail} :: new= ${newEmail}`)
            } catch (error) {
                this.log(`ERROR: unable to ${op} credentials_email for user ${user.id}. Message: '${error.message}'. Most likely the email is already in use.`)
            }
        }
        return mapFunc
    }

    makeDeleteCredFunc = () => {
        const credType = this.state.deleteCredsType.toLowerCase()
        const propName = `credentials_${credType}`
        const methName = `delete_user_${propName}`
        
        const deleteFunc = async (user) => {
            if (!user[propName]) {
                this.log(`Skip: user ${user.id} has no ${propName} to delete`)
                return
            }
            
            try {
                await this.asyncLookerCall(methName, user.id)
                this.log(`deleted ${propName} for user ${user.id}`)
            } catch (error) {
                this.log(`ERROR: unable to delete ${propName} for user ${user.id}. Message: '${error.message}'`)
            }
        }
        return deleteFunc
    }

    makeEnableDisableFunc = () => {
        const changeType = this.state.enableDisableType.toLowerCase()
        const new_is_disabled = (changeType === "disable")

        const enableDisableFunc = async (user) => {
            if (user.is_disabled === new_is_disabled) {
                this.log(`Skip: user ${user.id} is already ${changeType}d`)
                return
            }

            try {
                await this.asyncLookerCall("update_user", user.id, {is_disabled: new_is_disabled})
                this.log(`${changeType}d user ${user.id}`)
            } catch (error) {
                this.log(`ERROR: unable to ${changeType} user ${user.id}. Message: '${error.message}'`)
            }
        }
        return enableDisableFunc
    }
    
    /*
    ******************* RENDERING *******************
    */
    renderSelectBy() {
        return (
            <>
            <Menu>
                <MenuDisclosure>
                    <ButtonOutline iconAfter="ArrowDown" size="small" mr="xsmall">Select By</ButtonOutline>
                </MenuDisclosure>
                <MenuList placement="right-start">
                    <MenuItem icon="FindSelected" onClick={this.openSelectBy}>{actionInfo.selectBy.menuTitle}</MenuItem>
                </MenuList>
            </Menu>
            
            {/*
            ******************* SELECT BY Dialog *******************
            */}
            <Dialog
              isOpen={this.isCurrentAction("selectBy") && !this.state.isReview}
              onClose={this.handleClose}
            >
              <ConfirmLayout
                title={actionInfo.selectBy.dialogTitle}
                message={
                    <>
                    <Paragraph mb="small">
                        Paste a list of user ids or email addresses. 
                        They can be separated by comma, semicolon, or any whitespace (space, tab, newline).
                    </Paragraph>
                    <TextArea resize value={this.state.selectByText} onChange={this.onChangeSelectByText}/>
                    </>
                }
                primaryButton={<Button onClick={this.handleRunSelectBy}>Select</Button>}
                secondaryButton={<ButtonTransparent onClick={this.handleClose}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            </>
        )
    }


    renderManageEmailCreds() {
        return (
            <>
            <Menu>
                <MenuDisclosure>
                    <ButtonOutline iconAfter="ArrowDown" size="small" mr="xsmall">Manage Email Creds</ButtonOutline>
                </MenuDisclosure>
                <MenuList placement="right-start">
                    <MenuItem icon="Return" onClick={this.openEmailFill}>{actionInfo.emailFill.menuTitle}</MenuItem>
                    <MenuItem icon="VisTable" onClick={this.openEmailMap}>{actionInfo.emailMap.menuTitle}</MenuItem>
                </MenuList>
            </Menu>
            
            {/*
            ******************* EMAIL FILL Dialog *******************
            */}
            <Dialog
              isOpen={this.isCurrentAction("emailFill") && !this.state.isReview}
              onClose={this.handleClose}
            >
              <ConfirmLayout
                title={actionInfo.emailFill.dialogTitle}
                message={
                    <>
                    This will create <Text fontWeight="bold">email</Text> creds for <Text fontWeight="bold">{this.props.selectedUserIds.size}</Text> selected users. 
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
                primaryButton={<Button onClick={this.handleRunEmailFill}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={this.handleClose}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            {/*
            ******************* EMAIL MAP Dialog *******************
            */}
            <Dialog
              isOpen={this.isCurrentAction("emailMap") && !this.state.isReview}
              onClose={this.handleClose}
            >
              <ConfirmLayout
                title={actionInfo.emailMap.dialogTitle}
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
                        value={this.state.emailMapText} 
                        onChange={this.onChangeEmailMapText} 
                        placeholder={"jon.snow@old.com,jsnow@new.com         arya.stark@old.com,astark@new.com"}
                    />
                    </>
                }
                primaryButton={<Button onClick={this.handleRunEmailMap}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={this.handleClose}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            </>
        )
    }

    renderDeleteCreds() {
        return (
            <>
            <Menu>
                <MenuDisclosure>
                    <ButtonOutline iconAfter="ArrowDown" size="small" mr="xsmall">Delete Creds</ButtonOutline>
                </MenuDisclosure>
                <MenuList placement="right-start">
                    {["Email", "Google", "LDAP", "OIDC", "SAML"].map((credType) => {
                        return <MenuItem key={credType} onClick={() => this.openDelete(credType)}>{credType}</MenuItem>
                    })}
                </MenuList>
            </Menu>
            {/*
            ******************* DELETE CRED Dialog *******************
            */}
            <Dialog
              isOpen={this.isCurrentAction("deleteCreds") && !this.state.isReview}
              onClose={this.handleClose}
            >
              <ConfirmLayout
                title={`Delete ${this.state.deleteCredsType} Credentials`}
                message={
                    <>
                    This will delete <Text fontWeight="bold">{this.state.deleteCredsType}</Text> creds for <Text fontWeight="bold">{this.props.selectedUserIds.size}</Text> selected users.
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
                primaryButton={<Button onClick={this.handleRunDeleteCreds}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={this.handleClose}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            </>
        )
    }

    renderDisable() {
        return (
            <>
            <Menu>
                <MenuDisclosure>
                    <ButtonOutline iconAfter="ArrowDown" size="small" mr="xsmall">Disable</ButtonOutline>
                </MenuDisclosure>
                <MenuList placement="right-start">
                    <MenuItem icon="Block" onClick={() => this.openEnableDisable("Disable")}>Disable</MenuItem>
                    <MenuItem icon="Undo" onClick={() => this.openEnableDisable("Enable")}>Enable</MenuItem>
                    {/* <MenuItem icon="Trash">Delete</MenuItem> */}
                </MenuList>
            </Menu>
            {/*
            ******************* ENABLE/DISABLE Dialog *******************
            */}
            <Dialog
              isOpen={this.isCurrentAction("enableDisable") && !this.state.isReview}
              onClose={this.handleClose}
            >
              <ConfirmLayout
                title={`${this.state.enableDisableType} Users`}
                message={
                    <>
                    <Paragraph>
                        This will <Text fontWeight="bold">{this.state.enableDisableType.toLowerCase()}</Text> <Text fontWeight="bold">{this.props.selectedUserIds.size}</Text> selected users.
                    </Paragraph>
                    <Paragraph>
                        For details about what happens when you disable a user, see the documention for&nbsp;
                        <Link onClick={() => this.context.extensionSDK.openBrowserWindow("https://docs.looker.com/admin-options/settings/users#removing_user_access", '_blank')}>
                            Removing User Access
                        </Link>.
                    </Paragraph>
                    </>
                }
                primaryButton={<Button onClick={this.handleRunEnableDisable}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={this.handleClose}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            </>
        )
    }

    renderViewLog() {
        return (
            <>
            <ButtonOutline size="small" onClick={this.openViewLog}>View Log</ButtonOutline>
            {/*
            ******************* REVIEW Dialog *******************
            */}
            <Dialog
                isOpen={this.state.isReview}
                onClose={this.handleClose}
                
            >
                <ConfirmLayout
                    title={this.reviewDialogTitle()}
                    message={
                      <>
                        <Paragraph mb="small" width="50rem">
                            Execution log:
                        </Paragraph>
                        <MonospaceTextArea readOnly resize value={this.state.logMessages.join("\n")} />
                      </>
                    }
                    primaryButton={(this.state.isRunning || this.props.isLoading) ? <Button disabled>In Progress</Button> : <Button onClick={this.handleClose}>Close</Button>}
                />
            </Dialog>
            </>
        )
    }

    render() {
        return (  
            <>
            {this.renderSelectBy()}
            {this.renderManageEmailCreds()}
            {this.renderDeleteCreds()}
            {this.renderDisable()}
            {this.renderViewLog()}
            </>
        )
    }
}