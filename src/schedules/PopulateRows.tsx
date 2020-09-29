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
import {
  Box,
  Button,
  ButtonOutline,
  ButtonTransparent,
  DialogContent,
  DialogContext,
  DialogFooter,
  DialogHeader,
  DialogManager,
  Fieldset,
  FieldText,
  Paragraph,
  SpaceVertical,
} from "@looker/components";
import { validationTypeCron, translateCron } from "./cronHelper";
import { PopulateRowProps } from "./constants";

// drawer to populate rows with results of query
export const PopulateRows = (prp: PopulateRowProps): JSX.Element => {
  const { handlePopSubmit } = prp;

  const [queryID, set_queryID] = React.useState("");
  const [ownerID, set_ownerID] = React.useState("");
  const [scheduleName, set_scheduleName] = React.useState("");
  const [scheduleCron, set_scheduleCron] = React.useState("");

  const resetState = (): void => {
    set_queryID("");
    set_ownerID("");
    set_scheduleName("");
    set_scheduleCron("");
  };

  // ensure all required fields are filled out
  const validParams = (): boolean => {
    return queryID !== "";
  };

  return (
    <DialogManager
      maxWidth={["90vw", "60vw", "500px", "800px"]}
      content={
        <DialogContent>
          <DialogHeader>Populate Rows</DialogHeader>
          <DialogContent>
            <SpaceVertical>
              <Box display="inline-block" width="350px" height="120px">
                <Paragraph mb="small">
                  This will generate a new schedule plan for each row in the
                  results of a Looker query. Filter values will be populated if
                  the field label matches the filter name on the Dashboard.
                  Ensure there is a field "Email" to populate Recipients.
                </Paragraph>
              </Box>
              <Fieldset maxWidth="350px">
                <FieldText
                  required={true}
                  label="Query ID"
                  type="number"
                  min="1"
                  value={queryID}
                  onChange={(e: any) => set_queryID(e.target.value)}
                />
                <FieldText
                  label="Owner ID"
                  type="number"
                  min="1"
                  value={ownerID}
                  onChange={(e: any) => set_ownerID(e.target.value)}
                />
                <FieldText
                  label="Name of Schedule"
                  type="text"
                  value={scheduleName}
                  onChange={(e: any) => set_scheduleName(e.target.value)}
                />
                <FieldText
                  label="Crontab"
                  type="text"
                  value={scheduleCron}
                  onChange={(e: any) => set_scheduleCron(e.target.value)}
                  validationMessage={{
                    type: validationTypeCron(scheduleCron),
                    message: translateCron(scheduleCron),
                  }}
                />
              </Fieldset>
            </SpaceVertical>
          </DialogContent>

          <DialogContext.Consumer>
            {({ closeModal }) => (
              <DialogFooter>
                <Button
                  disabled={!validParams()}
                  onClick={() => {
                    handlePopSubmit(
                      queryID,
                      ownerID,
                      scheduleName,
                      scheduleCron
                    );
                    resetState();
                    closeModal();
                  }}
                >
                  Submit
                </Button>
                <ButtonTransparent
                  onClick={() => {
                    resetState();
                    closeModal();
                  }}
                >
                  Cancel
                </ButtonTransparent>
              </DialogFooter>
            )}
          </DialogContext.Consumer>
        </DialogContent>
      }
    >
      <ButtonOutline>Populate Rows</ButtonOutline>
    </DialogManager>
  );
};
