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

import React, { useState } from "react"
import { hot } from "react-hot-loader/root"
import { Switch, Route } from "react-router-dom"

import { ExtensionProvider } from "@looker/extension-sdk-react"
import { ThemeProvider } from 'styled-components'
import { ComponentsProvider, theme, Box, Flex, Spinner, Heading } from '@looker/components'
import styled from "styled-components"

import { InitializeChecker } from './shared/InitializeChecker'
import { PermissionsChecker } from './shared/PermissionsChecker'
import { NavBar } from './shared/NavBar'
import { HomePage } from './shared/HomePage'
import { UsersPage } from './users/UsersPage'
import { SchedulesPage } from './schedules/SchedulesPage'
import { EmbedPage } from './shared/EmbedPage'

const PAGES = [
    {
        path: "/", 
        navTitle: "Home",
        pageTitle: "⚡ Admin Power Pack ⚡", 
        icon: "Home",
        component: HomePage
    },{
        path: "/users", 
        navTitle: "Users",
        pageTitle: "⚡ Users++", 
        icon: "Group",
        component: UsersPage
    },{
        path: "/schedules", 
        navTitle: "Schedules",
        pageTitle: "⚡ Schedules++", 
        icon: "SendEmail",
        component: SchedulesPage
    },{
        path: "/embed", 
        navTitle: "Embed",
        pageTitle: "⚡ SSO Embed Demo", 
        icon: "DashboardFile",
        component: EmbedPage
    }
]

function AppInternal(props) {
    const [activeRoute, set_activeRoute] = useState("")
    const [routeState, set_routeState] = useState("")

    const onRouteChange = (new_activeRoute, new_routeState) => {
        set_activeRoute(new_activeRoute)
        set_routeState(new_routeState)
    }

    const loadingComponent = (
        <ComponentsProvider>
            <Flex width='100%' height='90%' alignItems='center' justifyContent='center'>
                <Spinner color='black' />
            </Flex>
        </ComponentsProvider>
    )

    const appTheme = {
        ...theme,
        background: '#f5f6f7', // palette.charcoal100
        border: '#c1c6cb' // palette.charcoal300
      }

    const GreyBorderBox = styled(Box)`
        border-color: ${(props) => props.theme.border};
    `

    const GreyBox = styled(GreyBorderBox)`
        background-color: ${(props) => props.theme.background};
    `

    const header = (
        <GreyBox 
            pl='small'
            py='xsmall'
            borderBottom='1px solid'
        >
            <Switch>
                {PAGES.map((page, index) =>
                    <Route exact path={page.path} key={index}>
                        <Heading as='h1' fontWeight='light'>{page.pageTitle}</Heading>
                    </Route>
                )}
            </Switch>
        </GreyBox>
    )

    const navBar = (
        <GreyBorderBox 
            display="flex"
            flexDirection="column"
            width='8rem'
            borderRight='1px solid'
        >
            <NavBar pages={PAGES} activeRoute={activeRoute} />
        </GreyBorderBox>
    )

    const pages = (
        <Switch>
            {PAGES.map((page, index) => {
                const PageComponent = page.component
                return (
                    <Route exact path={page.path} key={index}>
                        <PageComponent />
                    </Route>
                )
            })}
        </Switch>
    )

    const extension = (
        <ExtensionProvider 
            chattyTimeout={90000} // overriding default chatty timeout from 30s to 90s
            loadingComponent={loadingComponent}
            requiredLookerVersion='>=7.2.0'
            onRouteChange={onRouteChange}
        >
            <ThemeProvider theme={appTheme}>
                <ComponentsProvider>
                    <InitializeChecker>
                        <PermissionsChecker loadingComponent={loadingComponent}>
                            <Box>
                                {header}
                                <Flex height='100vh'>
                                    {navBar}
                                    <Box flexGrow={1} overflow="scroll" height="100%">
                                        {pages}
                                    </Box>
                                </Flex>
                            </Box>
                        </PermissionsChecker>
                    </InitializeChecker>
                </ComponentsProvider>
            </ThemeProvider>
        </ExtensionProvider>
    )

    return extension
}

export const App = hot(AppInternal)