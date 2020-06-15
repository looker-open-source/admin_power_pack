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
  DrawerManager,
  Fieldset,
  FieldText,
  ModalContent,
  ModalContext,
  ModalFooter,
  ModalHeader,
  SpaceVertical,
  Text,
} from "@looker/components";

export interface PopulateParams {
  queryId?: number;
  ownerId?: number;
  scheduleName?: string;
  cron?: string;
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
    <DrawerManager
      width="260px"
      content={
        <>
          <ModalHeader>Populate Rows</ModalHeader>
          <ModalContent>
            <SpaceVertical>
              <Fieldset>
                <FieldText
                  required={true}
                  label="Query ID"
                  type="number"
                  min="1"
                  value={String(popParams.queryId)}
                  onChange={(e: any) => {
                    handlePopQueryId(e);
                  }}
                />
                <FieldText
                  label="Owner ID"
                  type="number"
                  min="1"
                  value={String(popParams.ownerId)}
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
                />
              </Fieldset>
              <Box
                display="inline-block"
                height="300px"
                bg="palette.purple100"
                p="small"
                width="180px"
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
          </ModalContent>
          <ModalContext.Consumer>
            {({ closeModal }) => (
              <ModalFooter>
                <Button
                  disabled={!validPopParams()}
                  onClick={() => {
                    console.log("submitting populate row parameters");
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
              </ModalFooter>
            )}
          </ModalContext.Consumer>
        </>
      }
    >
      {(onClick) => (
        <ButtonOutline onClick={onClick}>Populate Rows</ButtonOutline>
      )}
    </DrawerManager>
  );
};
