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

import { MenuGroup, MenuItem } from "@looker/components"
import * as React from "react"
import omit from "lodash/omit"
import { Link as RouterLink } from "react-router-dom"
import styled from "styled-components"

const StyledRouterLinkInner = (props) => (
    <RouterLink {...omit(props, "customizationProps")} />
  )

const StyledRouterLink = styled(StyledRouterLinkInner)`
  text-decoration: none;
  &:focus,
  &:hover,
  &:visited,
  &:link,
  &:active {
    text-decoration: none;
  }
  `

export function NavBar(props) {

    return (
        <MenuGroup type="none" mt="xsmall">
            {props.pages.map((page, index) => {
                return (
                    <StyledRouterLink to={page.path} key={index}>
                        <MenuItem current={props.activeRoute === page.path} icon={page.icon}>
                            {page.navTitle}
                        </MenuItem>
                    </StyledRouterLink>
                )
            })}
        </MenuGroup>
    )
}