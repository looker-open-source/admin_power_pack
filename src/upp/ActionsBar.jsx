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
import {
    Box,
    Flex, 
    ButtonOutline,
    InputSearch,
    Confirm,
    Menu, MenuDisclosure, MenuList, MenuItem
  } from '@looker/components'

export function ActionsBar(props) {

    return (
        <Flex
          px='large'
          py='medium'
          borderBottom='1px solid'
          borderColor='palette.charcoal300'
          justifyContent='space-between'
        >
            <Box>
                <Confirm
                    title="Create Email Creds"
                    message={`This will create email creds for ${props.numSelectedUsers} selected users. It will use the email address already assigned to the user by the other cred types. It won't do anything for accounts that already have an email cred. Later you can update the address manually or by using a bulk mapping, if needed. `}
                    onConfirm={props.onConfirmCreateEmailCreds}
                >
                  {(open) => <ButtonOutline size="small" mr="small" onClick={open}>Create Email Creds</ButtonOutline>}
                </Confirm> 
                <Menu>
                    <MenuDisclosure>
                        <ButtonOutline size="small" mr="small" iconAfter="ArrowDown">Delete Creds</ButtonOutline>
                    </MenuDisclosure>
                    <MenuList placement="right-start">
                        <Confirm
                        title="Delete Email Creds"
                        message={`This will delete email creds for ${props.numSelectedUsers} selected users. If the users have no other credential types, they won't be able to login and you will not be able to re-create the email creds without manually supplying an email address.`}
                        onConfirm={props.onConfirmDeleteEmailCreds}
                        >
                            {(open) => <MenuItem onClick={open}>Email</MenuItem>}
                        </Confirm>
                        <MenuItem>SAML</MenuItem>
                    </MenuList>
                </Menu>
            </Box>
            <InputSearch />
        </Flex>
    )
}