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

import React from "react";
import styled from "styled-components";
import {
  Button,
  ButtonTransparent,
  ConfirmLayout,
  Dialog,
  DialogContent,
  Menu,
  MenuDisclosure,
  MenuItem,
  MenuList,
  Paragraph,
  TextArea,
} from "@looker/components";
import { DEBUG } from "./constants";

export interface QueryProps {
  GlobalFindReplaceEmail(EmailMap: string): void;
}

const MonospaceTextArea = styled(TextArea)`
  textarea {
    font-family: monospace;
  }
`;

export const GlobalActions = (qp: QueryProps): JSX.Element => {
  const { GlobalFindReplaceEmail } = qp;

  const [isToggledGFR, setisToggledGFR] = React.useState(false);
  const [isToggledVSJ, setisToggledVSJ] = React.useState(false);

  const ToggleGFR = () => setisToggledGFR((on) => !on);
  const ToggleVSJ = () => setisToggledVSJ((on) => !on);

  const [EmailMap, setEmailMap] = React.useState("");

  return (
    <Menu>
      <MenuDisclosure>
        <Button>Global Actions</Button>
      </MenuDisclosure>

      {/* GlobalFindReplace Dialog Start */}
      <Dialog isOpen={isToggledGFR} onClose={ToggleGFR}>
        <DialogContent>
          <ConfirmLayout
            title="Update Email Destinations from Mapping"
            message={
              <>
                <Paragraph mb="small">
                  Paste a CSV of email address mappings. There should be two
                  addresses per line, separated by a comma.
                </Paragraph>
                <Paragraph mb="small">
                  If a schedule plan destination has the email address in the
                  first column, the address will be updated to the value in the
                  second column. This will update all schedule plans across the
                  instance where there is a match.
                </Paragraph>
                <Paragraph mb="small">
                  Note that the schedule plans must be enabled to be updated.
                  Emails are not case sensitive.
                </Paragraph>
                <MonospaceTextArea
                  resize
                  onChange={(e: any) => setEmailMap(e.target.value)}
                  placeholder={
                    "jon.snow@old.com,jsnow@new.com         arya.stark@old.com,astark@new.com"
                  }
                />
              </>
            }
            primaryButton={
              <Button
                onClick={() => {
                  GlobalFindReplaceEmail(EmailMap);
                  setEmailMap("");
                  ToggleGFR();
                }}
              >
                Run
              </Button>
            }
            secondaryButton={
              <ButtonTransparent onClick={ToggleGFR}>Cancel</ButtonTransparent>
            }
          />
        </DialogContent>
      </Dialog>
      {/* GlobalFindReplace Dialog End */}

      <MenuList>
        <MenuItem icon="Beaker" onClick={ToggleGFR}>
          Find & Replace Email
        </MenuItem>
        {/* <MenuItem icon="Beaker">Validate Recent Schedule Jobs</MenuItem> */}
        {/* Under Construction */}
      </MenuList>
    </Menu>
  );
};
