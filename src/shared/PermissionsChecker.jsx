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

import React, { useState, useContext, useEffect } from 'react'
import { ExtensionContext } from '@looker/extension-sdk-react'
import { makeLookerCaller } from './utils.js'
import {
    Flex, Box, SpaceVertical,
    Heading, Paragraph, Code
} from '@looker/components'

export function PermissionsChecker(props) {
    const context = useContext(ExtensionContext)
    const [currentUser, set_currentUser] = useState(null)
    const [isAdmin, set_isAdmin] = useState(null)

    useEffect(
        () => {
            // useEffect can't take an async function, but we need to `await` results from api.
            // This is the recommended way to fetch data in an effect:
            async function fetchStuff() {
                let me
                let myAdminRoles = []
                try {
                    const lookerRequest = makeLookerCaller(context.core40SDK)
                    
                    me = await lookerRequest('me', ["id", "display_name", "role_ids"].toString())
                    

                    // this logic is kinda moot because non-admins can't call the role endpoints anyway...
                    const allRoles = await lookerRequest('all_roles', {})
                    const myRoles = allRoles.filter(r => me.role_ids.includes(r.id))
                    myAdminRoles = myRoles.filter(r => r.name === "Admin" && r.permission_set.built_in && r.permission_set.all_access)
                    
                } catch (error) {
                    console.log(error)
                    if (!me) me = {actually: "there was an error before loading the user"}
                } finally {
                    set_isAdmin(myAdminRoles.length > 0)
                    set_currentUser(me)
                }
            }
            fetchStuff()
        },
        []
    )

    if (!currentUser) {
        return props.loadingComponent
    }
    
    if (isAdmin) {
        return props.children
    }

    return (
        <>
        <Box py="large" textAlign="center">
            <Heading as="h1">Hi there!</Heading>
        </Box>
        <Flex justifyContent="center" alignContent="center">
            <Flex flexDirection="column" justifyContent="center" alignContent="center" width="30rem">
                <SpaceVertical>
                    <Paragraph>
                        This application helps Looker Administrators accomplish certain tasks more efficiently, so it requires Admin permissions. 
                    </Paragraph>
                    <Paragraph>    
                        However, we weren't able to detect Admin permissions for your user account 🙁
                    </Paragraph>
                    <Paragraph>
                        Please contact your Looker Administrator if you have any questions.
                    </Paragraph>
                    <Paragraph>
                        If you do have Admin permissions and are seeing this page, please check the javascript console for errors.
                    </Paragraph>
                    <Paragraph>
                        You are currently logged in as:
                    </Paragraph>
                    <Paragraph>
                        <Code>{JSON.stringify(currentUser)}</Code>
                    </Paragraph>
                </SpaceVertical>
            </Flex>
        </Flex>
        </>
    )
}