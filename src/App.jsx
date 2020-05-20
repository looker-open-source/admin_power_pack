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
import { ExtensionProvider } from "@looker/extension-sdk-react"
import { ThemeProvider } from 'styled-components'
import { Switch, Route } from "react-router-dom"
import { NavBar } from './NavBar.jsx'
import { UppExtension } from './upp/UppExtension'
import { SchedulesExtension } from './schedules/SchedulesExtension'
import { GlobalStyle, theme, Box, Flex, Spinner, Heading } from '@looker/components'


const PAGES = [
    {
        path: "/", 
        title: "Home", 
        component: React.Fragment
    },{
        path: "/users", 
        title: "Users++", 
        component: UppExtension
    },{
        path: "/schedules", 
        title: "Schedules++", 
        component: SchedulesExtension
    },{
        path: "/embed", 
        title: "Embed Playground", 
        component: React.Fragment
    }
]

export function App(props) {
    const [activeRoute, set_activeRoute] = useState("")
    const [routeState, set_routeState] = useState(")")

    const onRouteChange = (new_activeRoute, new_routeState) => {
        set_activeRoute(new_activeRoute)
        set_routeState(new_routeState)
    }

    const loadingComponent = (
        <Flex width='100%' height='90%' alignItems='center' justifyContent='center'>
            <Spinner color='black' />
        </Flex>
    )

    const extension = (
        <ExtensionProvider 
            loadingComponent={loadingComponent} 
            requiredLookerVersion='>=6.24.0'
            onRouteChange={onRouteChange}
        >
            <ThemeProvider theme={theme}>
                <>
                    <GlobalStyle />
                    <Box>
                        <Box 
                            pl='small' py='xsmall' bg='palette.charcoal100' 
                            borderBottom='1px solid' borderBottomColor='palette.charcoal300'
                        >
                            <Switch>
                                {PAGES.map((page, index) =>
                                    <Route exact path={page.path} key={index}>
                                        <Heading as='h1' fontWeight='light'>{page.title}</Heading>
                                    </Route>
                                )}
                            </Switch>
                        </Box>
                        <Flex height='100vh'>
                            <NavBar pages={PAGES} activeRoute={activeRoute} />
                            <Box flexGrow={1} overflow="scroll" height="100%">
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
                            </Box>
                        </Flex>
                    </Box>
                    
                </>
            </ThemeProvider>
        </ExtensionProvider>
    )

    return extension
}