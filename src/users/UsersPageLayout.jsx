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
    Flex, Box, Text
} from '@looker/components'
import styled from "styled-components"


const GreyFlex = styled(Flex)`
border-color: ${(props) => props.theme.border};
`

function JustifiedSection(props) {
    return (
        <GreyFlex
          px='large' py='medium'
          borderBottom='1px solid'
          justifyContent='space-between'
          alignItems='center'
        >
            {props.children}
        </GreyFlex>
    )
}

export function UsersPageLayout(props) {

    return (
        <>
            {props.errorBanner && <JustifiedSection>{props.errorBanner}</JustifiedSection>}
            <JustifiedSection>
                <Box>
                    <Text variant="secondary" mr="small">Actions</Text>
                    {props.actionsBar}
                </Box>
            </JustifiedSection>
            <JustifiedSection>
                <Flex justifyContent="flex-start" alignItems="center">
                    <Text variant="secondary" mr="small">Filters</Text>
                    <Box px="small" >
                        {props.showWhoToggle}
                    </Box>
                    <Box>
                        {props.quickFilterGroup}
                    </Box>
                </Flex>
                {props.searchInput}
            </JustifiedSection>
            <Box px='large' py='xsmall'>
                {props.usersTable}
            </Box>
        </>
    )
}