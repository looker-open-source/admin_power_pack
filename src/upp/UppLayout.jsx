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

function JustifiedSection(props) {
    return (
        <Flex
          px='large' py='medium'
          borderBottom='1px solid' borderColor='palette.charcoal300'
          justifyContent='space-between'
          alignItems='center'
        >
            {props.children}
        </Flex>
    )
}

export function UppLayout(props) {

    return (
        <Box>
            <Box 
                pl='small' py='xsmall' bg='palette.charcoal100' 
                borderBottom='1px solid' borderBottomColor='palette.charcoal300'
            >
                {props.heading}
            </Box>
            <Flex height='100vh'>
                {props.navbar}
                <Box flexGrow={1} overflow="scroll" height="100%">
                    {props.errorBanner}
                    <JustifiedSection>
                        <Box>
                            <Text variant="secondary" mr="small">Actions</Text>
                            {props.actionsBar}
                        </Box>
                        <Box>
                            <Text variant="secondary" mr="small">Show</Text>
                            {props.showWhoToggle}
                        </Box>
                    </JustifiedSection>
                    <JustifiedSection>
                        <Box>
                            <Text variant="secondary" mr="small">Filters</Text>
                            {props.quickFilterGroup}
                        </Box>
                        {props.searchInput}
                    </JustifiedSection>
                    <Box p='large'>
                        {props.userTable}
                    </Box>
                </Box>
            </Flex>
        </Box>
    )
}