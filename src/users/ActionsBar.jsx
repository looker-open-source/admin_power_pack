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
    Tooltip
  } from '@looker/components'

const actionInfo = {
    selectBy: {
        menuTitle: "User ID or email address",
        dialogTitle: "Select Users"
    },
    emailFill: {
        cred: "email", 
        menuTitle: "Auto-fill from other creds", 
        dialogTitle: "Auto-fill Email Credentials"
    },
    delete: {
        dialogTitle: "Delete Credentials"
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
            deleteType: null,
            selectByText: "",
            logMessages: []
        }
    }

    componentDidMount() {
        this.lookerRequest = makeLookerCaller(this.context.coreSDK)
    }

    /*
     ******************* Helpers *******************
     */
    isCurrentAction = (name) => (this.state.currentAction === name)

    // allows us to wait for the state change to resolve
    async setRunning(value) {
        return new Promise(resolve => this.setState({isRunning: value}, resolve))
    }

    async setIsReview(value) {
        return new Promise(resolve => this.setState({isReview: value}, resolve))
    }

    async clearLog() {
        return new Promise(resolve => this.setState({logMessages: []}, resolve))
    }

    log(entry) {
        // Array.prototype.concat() returns a copy and handles both scalars and arrays :)
        const new_logMessages = this.state.logMessages.concat(entry)
        this.setState({logMessages: new_logMessages})
    }

    reviewDialogTitle() {
        if (this.state.currentAction) {
            return `${actionInfo[this.state.currentAction].dialogTitle} - ${this.state.isRunning ? "In Progress" : "Complete"}`
        }
        return ""
    }

    /*
     ******************* Callbacks for the dialogs *******************
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

    openEmailFill = () => { 
        this.setState({currentAction: "emailFill"})
    } 
    
    openDelete = (type) => { 
        this.setState({
            currentAction: "delete",
            deleteType: type
        })
    }

    openViewLog = () => {
        this.setIsReview(true)
    }

    handleRunSelectBy = async () => {
        await this.clearLog()
        this.setIsReview(true)
        await new Promise(resolve => {this.runSelectBy(); resolve()})
        //this.runSelectBy()
        console.log(this.state.logMessages)
    }

    handleRunEmailFill = async () => {
        await this.clearLog()
        this.setIsReview(true)
        this.runEmailFill()
    }

    handleRunDeleteCreds = async () => { 
        await this.clearLog()
        this.setIsReview(true)
        this.runDeleteCreds(this.state.deleteType.toLowerCase())
    }

    /*
    ******************* Functions to do the work *******************
    */
    async runActionOnSelectedUsers(func, name = "unnammed") {
        const selectedUsers = Array.from(this.props.selectedUserIds).map(u_id => this.props.usersMap.get(u_id))
        const promises = selectedUsers.map(func.bind(this))
        await Promise.all(promises)
        //await new Promise(r => setTimeout(r, 10000));
        //console.log(`did the ${name} operation`)
        this.props.loadUsersAndStuff()
    }
    
    async runDeleteCreds(credType) {
        const propName = `credentials_${credType}`
        const methName = `delete_user_credentials_${credType}`
        
        const deleteFunc = (sdkUser) => {
            if (!sdkUser[propName]) {
                this.log(`user ${sdkUser.id} has no ${credType} creds to delete`)
                return
            }
            this.lookerRequest(methName, sdkUser.id)
            //await this.reloadUserId(sdkUser.id)
        }
        
        await this.setRunning(true)
        await this.runActionOnSelectedUsers(deleteFunc, `delete ${credType} creds`)
        this.setRunning(false)
    }

    runSelectBy() {
        // we're going to record which tokens match along with which ones didn't
        let foundCounts = {}
        let new_selectedUserIds = new Set()
        
        // this regex should cover us well but i still might be missing corner cases
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

        this.props.setNewSelectedUserIds(new_selectedUserIds)
        this.log(`${new_selectedUserIds.size} users selected`)

        const unmatched = Object.keys(foundCounts).filter(token => foundCounts[token] === 0)
        this.log(`${unmatched.length} unmatched tokens`)
        
        if (unmatched.length > 0) {
            this.log("The unmatched tokens are:")
            this.log(unmatched)
        }
    }
    
    async runEmailFill() {
        await this.setRunning(true)
        await this.runActionOnSelectedUsers(this.createUserEmailCreds, "create email creds")
        this.setRunning(false)
    } 
    
    async createUserEmailCreds(user) {
        if (user.credentials_email) { 
            this.log(`user ${user.id} already has email creds: ${user.credentials_email.email}`)
            return 
        }
    
        if (!user.email) { 
            console.log(`user ${user.id} has no email address from other creds`)
            return 
        } 
        this.lookerRequest('create_user_credentials_email', user.id, {email: user.email})
        //await this.reloadUserId(user.id)
    }
    
    /*
    ******************* Rendering *******************
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
                    <MenuItem icon="Beaker" detail="WIP" disabled>Bulk update from mapping</MenuItem>
                </MenuList>
            </Menu>
            
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
            
            <Dialog
              isOpen={this.isCurrentAction("delete") && !this.state.isReview}
              onClose={this.handleClose}
            >
              <ConfirmLayout
                title={`Delete ${this.state.deleteType} Credentials`}
                message={
                    <>
                    This will delete <Text fontWeight="bold">{this.state.deleteType}</Text> creds for <Text fontWeight="bold">{this.props.selectedUserIds.size}</Text> selected users.
                    <List type="bullet">
                        <ListItem>
                            If you delete the email creds and don't have SSO enabled, users won't be able to login.
                        </ListItem>
                        <ListItem>
                            If you completely delete all creds from a user, subsequent SSO logins won't find anything no which to merge and will create a new account.
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
            <Menu>
                <MenuDisclosure>
                    <ButtonOutline iconAfter="ArrowDown" size="small" mr="xsmall">Disable</ButtonOutline>
                </MenuDisclosure>
                <MenuList placement="right-start">
                    <MenuItem icon="Block">Disable</MenuItem>
                    <MenuItem icon="Undo">Enable</MenuItem>
                    <MenuItem icon="Trash">Delete</MenuItem>
                </MenuList>
            </Menu>
        )
    }

    renderViewLog() {
        return (
            <Tooltip content="View last run log">
                <ButtonOutline size="small" onClick={this.openViewLog}><Icon name="IdeFileDocument" /></ButtonOutline>
            </Tooltip>
        )
    }

    renderReviewDialog() {
        return (
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
                    primaryButton={(this.props.isRunning || this.props.isLoading) ? <Button disabled>In Progress</Button> : <Button onClick={this.handleClose}>Close</Button>}
                />
            </Dialog>
        )
    }

    render() {
        return (  
            <>
            {this.renderReviewDialog()}
            {this.renderSelectBy()}
            {this.renderManageEmailCreds()}
            {this.renderDeleteCreds()}
            {this.renderDisable()}
            {this.renderViewLog()}
            </>
        )
    }
}