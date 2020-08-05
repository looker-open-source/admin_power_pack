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
  SpaceVertical,
  Text,
} from "@looker/components";
import { validationTypeCron, translateCron } from "./cronHelper";

export interface PopulateParams {
  queryId: string; // displayed as number in FieldText
  ownerId: string; // displayed as number in FieldText
  scheduleName: string;
  cron: string;
}

export interface PopulateRowProps {
  popParams: PopulateParams;
  resetPopParams(): void;
  validPopParams(): boolean;
  handlePopQueryId(e: any): void;
  handlePopOwnerId(e: any): void;
  handlePopName(e: any): void;
  handlePopCron(e: any): void;
  handlePopSubmit(): void;
}

// drawer to populate rows with results of query
// https://components.looker.com/components/modals/drawer/
export const PopulateRows = (prp: PopulateRowProps): JSX.Element => {
  const {
    popParams,
    resetPopParams,
    validPopParams,
    handlePopQueryId,
    handlePopOwnerId,
    handlePopName,
    handlePopCron,
    handlePopSubmit,
  } = prp;
  return (
    <DialogManager
      maxWidth={["90vw", "60vw", "500px", "800px"]}
      content={
        <DialogContent>
          <DialogHeader>Populate Rows</DialogHeader>
          <DialogContent>
            <SpaceVertical>
              <Fieldset maxWidth="350px">
                <FieldText
                  required={true}
                  label="Query ID"
                  type="number"
                  min="1"
                  value={popParams.queryId}
                  onChange={(e: any) => {
                    handlePopQueryId(e);
                  }}
                />
                <FieldText
                  label="Owner ID"
                  type="number"
                  min="1"
                  value={popParams.ownerId}
                  onChange={(e: any) => {
                    handlePopOwnerId(e);
                  }}
                />
                <FieldText
                  label="Name of Schedule"
                  type="text"
                  value={popParams.scheduleName}
                  onChange={(e: any) => {
                    handlePopName(e);
                  }}
                />
                <FieldText
                  label="Crontab"
                  type="text"
                  value={popParams.cron}
                  onChange={(e: any) => {
                    handlePopCron(e);
                  }}
                  validationMessage={{
                    type: validationTypeCron(popParams.cron),
                    message: translateCron(popParams.cron),
                  }}
                />
              </Fieldset>
              <Box
                display="inline-block"
                width="350px"
                height="125px"
                bg="palette.purple100"
                p="small"
                fontSize="small"
                borderRadius="4px"
              >
                <Text fontSize="small">
                  This will generate a new schedule plan for each row in the
                  results of a Looker query. Filter values will be populated if
                  the field label matches the filter name on the Dashboard.
                  Ensure there is a field
                </Text>{" "}
                <Text fontWeight="semiBold">"Email"</Text>{" "}
                <Text fontSize="small"> to populate Recipients.</Text>
              </Box>
            </SpaceVertical>
          </DialogContent>

          <DialogContext.Consumer>
            {({ closeModal }) => (
              <DialogFooter>
                <Button
                  disabled={!validPopParams()}
                  onClick={() => {
                    handlePopSubmit();
                    if (closeModal !== undefined) {
                      closeModal();
                    }
                  }}
                >
                  Submit
                </Button>
                <ButtonTransparent
                  onClick={() => {
                    resetPopParams();
                    if (closeModal !== undefined) {
                      closeModal();
                    }
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
