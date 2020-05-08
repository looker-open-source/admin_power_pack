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

import React, {useState} from 'react'
import {
    Space,
    Flex, 
    Text,
    List, ListItem,
    Button, ButtonOutline, ButtonTransparent,
    InputSearch,
    Dialog, ConfirmLayout, Confirm,
    Menu, MenuDisclosure, MenuList, MenuItem
  } from '@looker/components'

const actionInfo = {
    emailFill: {cred: "email", menuTitle: "Auto-fill from other creds", dialogTitle: "Auto-fill Email Credentials"},
    delete: {dialogTitle: "Delete Credentials"}
}

export function ActionsBar(props) {

    const [currentAction, set_currentAction] = useState(false)
    const [isReview, set_isReview] = useState(props.isRunning)
    const [deleteType, set_deleteType] = useState(null)
    const isRunning = props.isRunning

    const isCurrentAction = (name) => (currentAction === name)
    const handleClose = () => {  console.log("close"); set_isReview(false); set_currentAction(false) }

    const openEmailFill = () => { console.log("emailFill"); set_currentAction("emailFill") }   
    const runEmailFill = () => { set_isReview(true); props.doRunEmailFill() }

    const openDelete = (type) => { set_currentAction("delete"); set_deleteType(type) }
    const runDelete = () => { set_isReview(true); props.runDeleteCreds(deleteType.toLowerCase()) }
    
    function renderManageEmailCreds() {
        return (
            <>
            <Menu>
                <MenuDisclosure>
                    <ButtonOutline iconAfter="ArrowDown" size="small">Manage Email Creds</ButtonOutline>
                </MenuDisclosure>
                <MenuList placement="right-start">
                    <MenuItem onClick={openEmailFill}>{actionInfo.emailFill.menuTitle}</MenuItem>
                    <MenuItem icon="Beaker" detail="WIP" disabled>Bulk update from mapping</MenuItem>
                </MenuList>
            </Menu>
            
            <Dialog
              isOpen={isCurrentAction("emailFill") && !isReview}
              onClose={handleClose}
            >
              <ConfirmLayout
                title={actionInfo.emailFill.dialogTitle}
                message={
                    <>
                    This will create <Text fontWeight="bold">email</Text> creds for <Text fontWeight="bold">{props.numSelectedUsers}</Text> selected users. 
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
            </>
        )
    }

    function renderDeleteCreds() {
        return (
            <>
            <Menu>
                <MenuDisclosure>
                    <ButtonOutline iconAfter="ArrowDown" size="small">Delete Creds</ButtonOutline>
                </MenuDisclosure>
                <MenuList placement="right-start">
                    {["Email", "Google", "LDAP", "OIDC", "SAML"].map((credType) => {
                        return <MenuItem key={credType} onClick={() => openDelete(credType)}>{credType}</MenuItem>
                    })}
                </MenuList>
            </Menu>
            
            <Dialog
              isOpen={isCurrentAction("delete") && !isReview}
              onClose={handleClose}
            >
              <ConfirmLayout
                title={`Delete ${deleteType} Credentials`}
                message={
                    <>
                    This will delete <Text fontWeight="bold">{deleteType}</Text> creds for <Text fontWeight="bold">{props.numSelectedUsers}</Text> selected users.
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
                primaryButton={<Button onClick={runDelete}>Run</Button>}
                secondaryButton={<ButtonTransparent onClick={handleClose}>Cancel</ButtonTransparent>}
              />
            </Dialog>
            </>
        )
    }

    function renderDisable() {
        return (
            <Menu>
                <MenuDisclosure>
                    <ButtonOutline iconAfter="ArrowDown" size="small">Disable</ButtonOutline>
                </MenuDisclosure>
                <MenuList placement="right-start">
                    <MenuItem>Disable</MenuItem>
                    <MenuItem>Enable</MenuItem>
                    <MenuItem>Delete</MenuItem>
                </MenuList>
            </Menu>
        )
    }

    function renderReviewDialog() {
        return (
            <Dialog
              isOpen={isReview}
              onClose={handleClose}
            >
                <ConfirmLayout
                  title={`${actionInfo[currentAction]?.dialogTitle} - ${isRunning ? "In Progress" : "Complete"}`}
                  message={`
                      Gonna put more stuff here.
                  `}
                  primaryButton={isRunning ? <Button disabled>In Progress</Button> : <Button onClick={handleClose}>Close</Button>}
                />
            </Dialog>
        )
    }

    return (
        <Flex
          px='large'
          py='medium'
          borderBottom='1px solid'
          borderColor='palette.charcoal300'
          justifyContent='space-between'
        >
            {renderReviewDialog()}
            <Space>
                {renderManageEmailCreds()}
                {renderDeleteCreds()}
                {renderDisable()}
            </Space>
            <InputSearch 
                value={props.searchText} 
                onChange={props.onChangeSearch} 
                width="20rem" 
                placeholder="Search by name, email, id"
            />
        </Flex>
    )
}