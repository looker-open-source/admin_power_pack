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
import {
    Text,
    List, ListItem,
    Button, ButtonOutline, ButtonTransparent,
    Dialog, ConfirmLayout,
    Menu, MenuDisclosure, MenuList, MenuItem
  } from '@looker/components'

const actionInfo = {
    emailFill: {
        cred: "email", 
        menuTitle: "Auto-fill from other creds", 
        dialogTitle: "Auto-fill Email Credentials"
    },
    delete: {
        dialogTitle: "Delete Credentials"
    }
}

export class ActionsBar extends React.Component {
    static contextType = ExtensionContext // provides the coreSDK object

    constructor (props) {
        super(props)

        this.state = {
            currentAction: false,
            isRunning: false,
            isReview: false,
            deleteType: null
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

    openEmailFill = () => { 
        this.setState({currentAction: "emailFill"})
    } 
    
    openDelete = (type) => { 
        this.setState({
            currentAction: "delete",
            deleteType: type
        })
    }

    handleRunEmailFill = () => {
        this.setState({isReview: true})
        this.runEmailFill()
    }

    handleRunDeleteCreds = () => { 
        this.setState({isReview: true}) 
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
                console.log(`user ${sdkUser.id} has no ${credType} creds to delete`)
                return
            }
            this.lookerRequest(methName, sdkUser.id)
            //await this.reloadUserId(sdkUser.id)
        }
        
        await this.setRunning(true)
        await this.runActionOnSelectedUsers(deleteFunc, `delete ${credType} creds`)
        this.setRunning(false)
    }
    
    async runEmailFill() {
        await this.setRunning(true)
        await this.runActionOnSelectedUsers(this.createUserEmailCreds, "create email creds")
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
        this.lookerRequest('create_user_credentials_email', sdkUser.id, {email: sdkUser.email})
        //await this.reloadUserId(sdkUser.id)
    }
    
    /*
    ******************* Rendering *******************
    */
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

    renderReviewDialog() {
        return (
            <Dialog
              isOpen={this.state.isReview}
              onClose={this.handleClose}
            >
                <ConfirmLayout
                  title={`${actionInfo[this.state.currentAction]?.dialogTitle} - ${this.props.isRunning ? "In Progress" : "Complete"}`}
                  message={`
                      Gonna put more stuff here.
                  `}
                  primaryButton={(this.props.isRunning || this.props.isLoading) ? <Button disabled>In Progress</Button> : <Button onClick={this.handleClose}>Close</Button>}
                />
            </Dialog>
        )
    }

    render() {
        return (  
            <>
            {this.renderReviewDialog()}
            {this.renderManageEmailCreds()}
            {this.renderDeleteCreds()}
            {this.renderDisable()}
            </>
        )
    }
}