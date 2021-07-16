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
  FieldSelect,
  FieldText,
  Paragraph,
  SpaceVertical,
} from "@looker/components";
import { validationTypeCron, translateCron, newOptions } from "./helper";
import { GeneratePlansProps, SelectOption } from "./constants";

// drawer to generate plans with results of query
export const GeneratePlans = (prp: GeneratePlansProps): JSX.Element => {
  const { users, toggleLog, handleGeneratePlansSubmit } = prp;

  const [querySlug, set_querySlug] = React.useState("");
  const [ownerID, set_ownerID] = React.useState("");
  const [scheduleName, set_scheduleName] = React.useState("");
  const [scheduleCron, set_scheduleCron] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState(""); // user lookup

  const resetState = (): void => {
    set_querySlug("");
    set_ownerID("");
    set_scheduleName("");
    set_scheduleCron("");
  };

  const handleSelectFilter = (term: string) => {
    setSearchTerm(term);
  };

  // ensure all required fields are filled out
  const validParams = (): boolean => {
    return querySlug !== "";
  };

  return (
    <DialogManager
      maxWidth={["90vw", "60vw", "500px", "800px"]}
      content={
        <DialogContent>
          <DialogHeader>Generate Plans</DialogHeader>
          <DialogContent>
            <SpaceVertical>
              <Box display="inline-block" width="400px" height="150px">
                <Paragraph mb="small">
                  Enter a query slug (qid) from the URL of any explore.
                </Paragraph>
                <Paragraph mb="small">
                  This will generate a new schedule plan for each row in the
                  results of a Looker query. Filter values will be populated if
                  the field label matches the filter name on the Dashboard.
                  Ensure there is a field "Email" to populate Recipients.
                </Paragraph>
              </Box>
              <Fieldset maxWidth="400px">
                <FieldText
                  required={true}
                  label="Query ID"
                  type="text"
                  value={querySlug}
                  onChange={(e: any) => set_querySlug(e.target.value)}
                />
                <FieldSelect
                  label="Owner ID"
                  width={1}
                  autoResize
                  value={ownerID}
                  title="Owner ID"
                  listLayout={{ width: "auto" }}
                  options={newOptions(searchTerm, users)}
                  onChange={(e: any) => set_ownerID(e)}
                  onFilter={handleSelectFilter}
                  isFilterable
                  isClearable={true}
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
                    handleGeneratePlansSubmit(
                      querySlug,
                      ownerID,
                      scheduleName,
                      scheduleCron
                    );
                    resetState();
                    closeModal();
                    toggleLog();
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
      <ButtonOutline>Generate Plans</ButtonOutline>
    </DialogManager>
  );
};
