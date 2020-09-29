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

import React, { useContext } from 'react'
import { ExtensionContext } from '@looker/extension-sdk-react'
import {
    Flex, Box, SpaceVertical,
    Heading, Paragraph,
    Link, InputText
} from '@looker/components'

export function EmbedPage(props) {
    const context = useContext(ExtensionContext)

    const onClickSSODocsLink = () => context.extensionSDK.openBrowserWindow("https://docs.looker.com/reference/embedding/sso-embed", '_blank')

    return (
        <>
        <Box py="large" textAlign="center">
            <Heading as="h1">Howdy!</Heading>
        </Box>
        <Flex justifyContent="center" alignContent="center" mb="xlarge">
            <Flex flexDirection="column" justifyContent="center" alignContent="center" width="30rem">
                <SpaceVertical>
                    <Paragraph>
                        This utility shows how to construct <Link onClick={onClickSSODocsLink}>Single Sign-on (SSO) Embed</Link> urls with a point-and-click interface. 
                        You can easily tweak the parameters of the url and see the resulting iframe in real time.
                    </Paragraph>
                    <Paragraph>
                        In order to properly test embedding, the iframe needs to be loaded in a webpage with a different domain 
                        than the Looker instance. Otherwise there will be conflicts with the user sessions.
                    </Paragraph>
                    <Paragraph>
                        Therefore we have hosted this utility on Github Pages:
                    </Paragraph>
                    <InputText readOnly defaultValue="https://fabio-looker.github.io/looker_sso_tool/" />
                    <Paragraph>
                        Please copy and paste the link into your browser navigation bar. We recommend running the utility in a different browser application or browser profile. 
                        That way you can stay signed-in to your main Looker account while simultaneously testing the embed user creation.
                    </Paragraph>
                    <Paragraph>
                        Note: this utility runs fully in the browser with no server communication.
                        Your settings - including the Embed Secret - will be saved in the browser's local storage
                        so that they aren't lost after a page reload. You can also download the settings as json in order
                        to reload them later. Please don't use your "production" embed secret with this tool, and rotate the secret when done testing.
                    </Paragraph>
                </SpaceVertical>
            </Flex>
        </Flex>
        </>
    )
}